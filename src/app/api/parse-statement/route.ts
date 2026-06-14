import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MODEL = "claude-sonnet-4-6";

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
                media_type: (file.type || "image/jpeg") as
                  | "image/jpeg"
                  | "image/png"
                  | "image/gif"
                  | "image/webp",
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
