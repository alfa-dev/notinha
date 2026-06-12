import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, categoryLabel } from "@/lib/categories";
import type { Expense } from "@/lib/types";
import ReceiptCapture from "@/components/ReceiptCapture";
import ExpenseList from "@/components/ExpenseList";

export default async function HomePage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("expenses")
    .select("*, expense_items(*)")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(200);

  const expenses = (data ?? []) as Expense[];

  const now = new Date();
  const monthKey = now.toISOString().slice(0, 7);
  const monthExpenses = expenses.filter((e) => e.date.startsWith(monthKey));

  const monthTotal = monthExpenses.reduce((s, e) => s + e.amount_cents, 0);

  const toReimburse = expenses
    .filter((e) => e.reimburse_to)
    .reduce<Record<string, number>>((acc, e) => {
      acc[e.reimburse_to!] = (acc[e.reimburse_to!] ?? 0) + e.amount_cents;
      return acc;
    }, {});

  const byCategory = monthExpenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount_cents;
    return acc;
  }, {});

  const pending = expenses.filter((e) => e.status === "pending_review").length;

  return (
    <main className="mx-auto max-w-lg p-4 pb-28">
      <header className="flex items-baseline justify-between py-2">
        <h1 className="text-2xl font-extrabold tracking-tight">Notinha</h1>
        <Link href="/lista" className="text-sm font-bold underline underline-offset-4">
          Lista de compras →
        </Link>
      </header>

      {/* Cupom-resumo do mês */}
      <section className="receipt-edge mt-3 px-5 py-8">
        <p className="text-center text-[11px] tracking-[0.3em] uppercase text-print-faint">
          Resumo · {now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
        </p>
        <p className="money mt-3 text-center text-4xl font-bold">
          {formatBRL(monthTotal)}
        </p>

        <div className="dashed-rule my-5" />

        <ul className="space-y-1 text-sm">
          {Object.entries(byCategory)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, cents]) => (
              <li key={cat} className="flex justify-between gap-2">
                <span className="truncate">{categoryLabel(cat)}</span>
                <span className="money shrink-0">{formatBRL(cents)}</span>
              </li>
            ))}
          {monthExpenses.length === 0 && (
            <li className="text-center text-print-faint">
              Nenhum gasto este mês. Manda a primeira notinha aí embaixo.
            </li>
          )}
        </ul>

        {Object.entries(toReimburse).length > 0 && (
          <>
            <div className="dashed-rule my-5" />
            {Object.entries(toReimburse).map(([who, cents]) => (
              <p key={who} className="flex justify-between text-sm font-bold text-stamp">
                <span>A pagar pra {who}</span>
                <span className="money">{formatBRL(cents)}</span>
              </p>
            ))}
          </>
        )}
      </section>

      {pending > 0 && (
        <p className="mt-4 rounded-md bg-stamp/15 px-4 py-3 text-sm font-semibold text-stamp">
          {pending} {pending === 1 ? "gasto aguarda" : "gastos aguardam"} resposta —
          toca neles pra resolver.
        </p>
      )}

      <ExpenseList expenses={expenses} />

      <ReceiptCapture />
    </main>
  );
}
