import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const MODEL = "claude-sonnet-4-6";

const SYSTEM = `Você monta listas de compras a partir do histórico de gastos de um usuário brasileiro.

Você recebe os gastos recentes (com itens quando disponíveis) e devolve APENAS um JSON válido:

{
  "items": [
    { "name": string, "quantity": string | null, "note": string | null }
  ]
}

Regras:
- Sugira itens de reposição recorrente que aparecem no histórico (mantimentos, farmácia, itens de casa).
- NÃO inclua serviços (Uber, restaurante, oficina) nem consumo em bar.
- NÃO sugira cigarro nem bebida alcoólica, mesmo que apareçam no histórico.
- "quantity" no formato livre que faria sentido na lista ("2", "1 cx", "500g") ou null.
- "note" só quando agregar algo (ex: marca vista no histórico). Máximo 15 itens.
- Responda APENAS o JSON.`;

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { data: expenses, error } = await supabase
    .from("expenses")
    .select("date, merchant, description, category, expense_items(description, quantity)")
    .eq("user_id", user.id)
    .order("date", { ascending: false })
    .limit(120);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const msg = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1500,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Histórico de gastos:\n${JSON.stringify(expenses)}\n\nMonte a lista de compras.`,
        },
      ],
    });

    const raw = msg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .replace(/```json|```/g, "")
      .trim();

    const { items } = JSON.parse(raw) as {
      items: { name: string; quantity: string | null; note: string | null }[];
    };

    // Evita duplicar itens já abertos na lista
    const { data: existing } = await supabase
      .from("shopping_items")
      .select("name")
      .eq("user_id", user.id)
      .eq("checked", false);

    const existingNames = new Set(
      (existing ?? []).map((i) => i.name.toLowerCase())
    );

    const toInsert = items
      .filter((i) => !existingNames.has(i.name.toLowerCase()))
      .map((i, idx) => ({
        user_id: user.id,
        name: i.name,
        quantity: i.quantity,
        note: i.note,
        source: "ai" as const,
        position: idx,
      }));

    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from("shopping_items")
        .insert(toInsert);
      if (insertError) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ added: toInsert.length });
  } catch (err) {
    console.error("shopping/generate:", err);
    return NextResponse.json(
      { error: "Não consegui gerar a lista agora." },
      { status: 502 }
    );
  }
}
