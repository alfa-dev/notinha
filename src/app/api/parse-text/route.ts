import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MODEL = "claude-sonnet-4-6";
const MAX_SIZE = 1 * 1024 * 1024; // 1 MB

const TEXT_LIMITS: Record<string, number | null> = {
  free: 3,
  plus: 20,
  pro: null,
};

const SYSTEM = `Você é um leitor de extratos bancários em texto. O usuário vai te mandar o conteúdo de um arquivo de extrato (txt, ofx, qif, csv mal formatado, etc.) e você devolve APENAS um JSON válido, sem markdown:

{
  "transactions": [
    { "date": "yyyy-mm-dd", "description": string, "amount_cents": number }
  ]
}

Regras:
- Inclua apenas débitos/compras (não créditos/estornos/pagamentos recebidos).
- "amount_cents": valor em centavos inteiros positivos (R$ 119,79 → 11979).
- "date": data da compra no formato yyyy-mm-dd.
- "description": nome do estabelecimento ou descrição limpa.
- Ignore linhas de total, saldo, pagamento mínimo, tarifas bancárias etc.
- Se não conseguir identificar transações, retorne { "transactions": [] }.
- Responda APENAS o JSON.`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Envie um arquivo de texto" }, { status: 400 });
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "Arquivo muito grande (máx 1 MB)" }, { status: 413 });
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("tier, suspended")
    .eq("id", user.id)
    .single();

  if (profile?.suspended) {
    return NextResponse.json(
      { error: "Conta suspensa. Entre em contato com o suporte." },
      { status: 403 }
    );
  }

  const tier = profile?.tier ?? "free";
  const limit = TEXT_LIMITS[tier] ?? TEXT_LIMITS.free;

  const { data: allowed, error: rpcError } = await supabase.rpc("try_increment_ai_usage", {
    p_user_id: user.id,
    p_endpoint: "parse-text",
    p_limit: limit,
  });

  if (rpcError) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  if (!allowed) {
    return NextResponse.json(
      {
        error: `Limite de ${limit} importações por IA por dia atingido no plano ${(tier as string).charAt(0).toUpperCase() + (tier as string).slice(1)}.`,
        limitReached: true,
        upgradeUrl: "/planos",
      },
      { status: 429 }
    );
  }

  const text = await file.text();
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Data de hoje: ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}. Conteúdo do arquivo:\n\n${text}`,
        },
      ],
    });

    const raw = msg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    const result = JSON.parse(raw);
    return NextResponse.json(result);
  } catch (err) {
    console.error("parse-text:", err);
    return NextResponse.json(
      { error: "Não consegui interpretar o arquivo. Tente um CSV com colunas de data, descrição e valor." },
      { status: 502 }
    );
  }
}
