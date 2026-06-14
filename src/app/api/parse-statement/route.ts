import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MODEL = "claude-sonnet-4-6";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"] as const;
type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];

const STATEMENT_LIMITS: Record<string, number | null> = {
  free: 3,
  plus: 20,
  pro: null,
};

const SYSTEM = `Você é um leitor de faturas de cartão de crédito. O usuário vai te mandar uma foto de um extrato ou fatura de cartão, e você devolve APENAS um JSON válido, sem markdown:

{
  "transactions": [
    { "date": "yyyy-mm-dd", "description": string, "amount_cents": number }
  ]
}

Regras:
- Inclua apenas débitos/compras (não créditos/estornos).
- "amount_cents": valor em centavos inteiros positivos (R$ 119,79 → 11979).
- "date": data da compra no formato yyyy-mm-dd. Se não houver, use a data do lançamento.
- "description": nome do estabelecimento ou descrição limpa.
- Ignore linhas de total, saldo, pagamento mínimo etc.
- Se não conseguir ler, retorne { "transactions": [] }.
- Responda APENAS o JSON.`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("image") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Envie uma imagem da fatura" }, { status: 400 });
  }

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

  // Rate limit: check user tier and apply daily limit
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
  const limit = STATEMENT_LIMITS[tier] ?? STATEMENT_LIMITS.free;

  const { data: allowed, error: rpcError } = await supabase.rpc("try_increment_ai_usage", {
    p_user_id: user.id,
    p_endpoint: "parse-statement",
    p_limit: limit,
  });

  if (rpcError) {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  if (!allowed) {
    return NextResponse.json(
      {
        error: `Limite de ${limit} importações de fatura por dia atingido no plano ${(tier as string).charAt(0).toUpperCase() + (tier as string).slice(1)}.`,
        limitReached: true,
        upgradeUrl: "/planos",
      },
      { status: 429 }
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: file.type as AllowedMimeType,
                data: bytes.toString("base64"),
              },
            },
            {
              type: "text",
              text: `Data de hoje: ${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}. Leia a fatura e devolva o JSON.`,
            },
          ],
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
    console.error("parse-statement:", err);
    return NextResponse.json(
      { error: "Não consegui ler a fatura. Tenta uma foto mais nítida." },
      { status: 502 }
    );
  }
}
