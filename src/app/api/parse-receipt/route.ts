import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ParsedReceipt } from "@/lib/types";
import { TIER_LIMITS } from "@/lib/admin";

const MODEL = "claude-sonnet-4-6";

const SYSTEM = `Você é o motor de leitura de notas fiscais do app Notinha, um app pessoal de controle de gastos no Brasil.

Você recebe a foto de uma notinha (cupom fiscal, comanda, comprovante, print de app) e/ou um texto livre do usuário, e devolve APENAS um JSON válido, sem markdown, sem comentários, no formato:

{
  "merchant": string | null,        // nome do estabelecimento
  "date": "yyyy-mm-dd" | null,      // data da compra visível na nota; null se não der pra ler
  "description": string,            // descrição curta do gasto, em português (ex: "Almoço Kilograma")
  "amount_cents": number | null,    // valor total em CENTAVOS; null se ilegível
  "category": string,               // uma de: alimentacao, bar_lazer, transporte, carro_manutencao, cigarro, saude_farmacia, casa, filha, outros
  "payment_method": string | null,  // uma de: rico, pix, dinheiro, gisele, outro — ou null se a nota não indica
  "items": [                        // itens da nota, se legíveis; [] se não houver
    { "description": string, "quantity": number, "unit_cents": number | null, "total_cents": number }
  ],
  "questions": [string],            // perguntas a fazer ao usuário ANTES de confirmar (ver regras)
  "confidence": "high" | "medium" | "low"
}

Regras para "questions":
- Se a forma de pagamento não está clara, pergunte (as opções comuns do usuário são cartão Rico, Pix e o cartão da Gisele que ele reembolsa depois).
- Se a data não está visível e o texto não diz, pergunte de que dia foi o gasto.
- Se compras de madrugada (00h–05h), pergunte se deve contar no dia anterior ("noite de ontem").
- Se a categoria for ambígua (ex: bebida em mercado vs bar), pergunte.
- Se o total estiver ilegível ou os itens não fecharem com o total, pergunte.
- Não pergunte o que já está claro. Sem perguntas desnecessárias.

Regras gerais:
- Valores SEMPRE em centavos inteiros (R$ 119,79 -> 11979).
- Cerveja/bar/balada -> bar_lazer. Restaurante/lanche/mercado -> alimentacao. Uber/99/gasolina/estacionamento -> transporte. Oficina/peças -> carro_manutencao. Farmácia -> saude_farmacia (mesmo com itens de conveniência).
- "description" curta e útil, sem redundância com merchant.
- Responda APENAS o JSON.`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("image") as File | null;
  const text = (form.get("text") as string | null)?.trim() || null;

  if (!file && !text) {
    return NextResponse.json(
      { error: "Envie uma imagem ou um texto" },
      { status: 400 }
    );
  }

  // ── Verificação de limite OCR (apenas para imagens, texto é sempre free) ──
  if (file) {
    const today = new Date().toISOString().slice(0, 10);

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("tier, ocr_count_today, ocr_count_date, suspended")
      .eq("id", user.id)
      .single();

    if (profile?.suspended) {
      return NextResponse.json(
        { error: "Conta suspensa. Entre em contato com o suporte." },
        { status: 403 }
      );
    }

    const isNewDay = !profile || profile.ocr_count_date !== today;
    const todayCount = isNewDay ? 0 : (profile?.ocr_count_today ?? 0);
    const tier = profile?.tier ?? "free";
    const limit = TIER_LIMITS[tier];

    if (limit !== null && todayCount >= limit) {
      return NextResponse.json(
        {
          error: `Limite de ${limit} ${limit === 1 ? "nota via foto" : "notas via foto"} por dia atingido no plano ${tier.charAt(0).toUpperCase() + tier.slice(1)}.`,
          limitReached: true,
          tier,
          limit,
          upgradeUrl: "/planos",
        },
        { status: 429 }
      );
    }

    // Incrementa contador (reset se novo dia)
    await supabase.from("user_profiles").upsert({
      id: user.id,
      ocr_count_today: isNewDay ? 1 : todayCount + 1,
      ocr_count_date: today,
    });
  }

  // ── Monta conteúdo para Claude ──
  const content: Anthropic.ContentBlockParam[] = [];

  if (file) {
    const bytes = Buffer.from(await file.arrayBuffer());
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: (file.type || "image/jpeg") as
          | "image/jpeg"
          | "image/png"
          | "image/gif"
          | "image/webp",
        data: bytes.toString("base64"),
      },
    });
  }

  content.push({
    type: "text",
    text: [
      `Data de hoje: ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}.`,
      text ? `Observação do usuário: ${text}` : null,
      "Leia a nota e devolva o JSON.",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: SYSTEM,
      messages: [{ role: "user", content }],
    });

    const raw = msg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    const parsed: ParsedReceipt = JSON.parse(raw);

    let receiptPath: string | null = null;
    if (file) {
      const ext = file.type === "image/png" ? "png" : "jpg";
      receiptPath = `${user.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("receipts")
        .upload(receiptPath, file, { contentType: file.type });
      if (error) receiptPath = null;
    }

    return NextResponse.json({ parsed, receiptPath });
  } catch (err) {
    console.error("parse-receipt:", err);
    return NextResponse.json(
      { error: "Não consegui ler a nota. Tenta outra foto ou digita o gasto." },
      { status: 502 }
    );
  }
}
