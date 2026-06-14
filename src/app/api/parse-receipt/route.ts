import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ParsedReceipt } from "@/lib/types";

const MODEL = "claude-sonnet-4-6";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];

const SYSTEM = `Você é o motor de leitura de notas fiscais do app Notinha, um app pessoal de controle de gastos no Brasil.

Você recebe a foto de uma notinha (cupom fiscal, comanda, comprovante, print de app) e/ou um texto livre do usuário, e devolve APENAS um JSON válido, sem markdown, sem comentários, no formato:

{
  "merchant": string | null,        // nome do estabelecimento
  "date": "yyyy-mm-dd" | null,      // data da compra visível na nota; null se não der pra ler
  "description": string,            // descrição curta do gasto, em português (ex: "Almoço Kilograma")
  "amount_cents": number | null,    // valor total em CENTAVOS; null se ilegível
  "category": string,               // uma de: alimentacao, lazer, transporte, carro_manutencao, saude_farmacia, casa, filha, outros
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
- Cerveja/bar/balada/show/cinema -> lazer. Restaurante/lanche/mercado -> alimentacao. Uber/99/gasolina/estacionamento -> transporte. Oficina/peças -> carro_manutencao. Farmácia -> saude_farmacia (mesmo com itens de conveniência).
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

  if (file) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "Imagem muito grande (máx 10MB)" },
        { status: 413 }
      );
    }
    if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMimeType)) {
      return NextResponse.json(
        { error: "Formato não suportado. Use JPG, PNG, GIF ou WebP." },
        { status: 415 }
      );
    }

    const { data: ocr, error: rpcError } = await supabase.rpc("try_increment_ocr", {
      p_user_id: user.id,
    });

    if (rpcError) {
      return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }

    if (!ocr.allowed) {
      if (ocr.reason === "suspended") {
        return NextResponse.json(
          { error: "Conta suspensa. Entre em contato com o suporte." },
          { status: 403 }
        );
      }
      if (ocr.reason === "limit_reached") {
        const { tier, limit } = ocr;
        return NextResponse.json(
          {
            error: `Limite de ${limit} ${limit === 1 ? "nota via foto" : "notas via foto"} por dia atingido no plano ${(tier as string).charAt(0).toUpperCase() + (tier as string).slice(1)}.`,
            limitReached: true,
            tier,
            limit,
            upgradeUrl: "/planos",
          },
          { status: 429 }
        );
      }
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }
  }

  // ── Monta conteúdo para Claude ──
  const content: Anthropic.ContentBlockParam[] = [];

  if (file) {
    const bytes = Buffer.from(await file.arrayBuffer());
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: file.type as AllowedMimeType,
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
