import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, categoryLabel } from "@/lib/categories";
import type { Expense, UserCategory, Space } from "@/lib/types";
import ReceiptCapture from "@/components/ReceiptCapture";
import ExpenseList from "@/components/ExpenseList";
import PeriodSelector from "@/components/PeriodSelector";
import { getCurrentProfile, TIER_LABELS } from "@/lib/admin";

type Props = {
  searchParams: Promise<{ periodo?: string }>;
};

export default async function DashboardPage({ searchParams }: Props) {
  const { periodo } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentPeriod = periodo ?? nowKey;
  const isTudo = currentPeriod === "tudo";

  let query = supabase
    .from("expenses")
    .select("*, expense_items(*)")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (!isTudo) {
    const [y, m] = currentPeriod.split("-").map(Number);
    const start = `${y}-${String(m).padStart(2, "0")}-01`;
    const end = new Date(y, m, 0);
    const endStr = `${y}-${String(m).padStart(2, "0")}-${String(end.getDate()).padStart(2, "0")}`;
    query = query.gte("date", start).lte("date", endStr);
  } else {
    query = query.limit(500);
  }

  const [{ data }, catRes, spaceRes, profile] = await Promise.all([
    query,
    supabase.from("user_categories").select("*").order("position"),
    supabase.from("spaces").select("*, space_members(*)"),
    getCurrentProfile(),
  ]);

  const expenses = (data ?? []) as Expense[];
  const userCategories = (catRes.data ?? []) as UserCategory[];
  const spaces = (spaceRes.data ?? []) as Space[];

  const total = expenses.reduce((s, e) => s + e.amount_cents, 0);

  const toReimburse = expenses
    .filter((e) => e.reimburse_to)
    .reduce<Record<string, number>>((acc, e) => {
      acc[e.reimburse_to!] = (acc[e.reimburse_to!] ?? 0) + e.amount_cents;
      return acc;
    }, {});

  const byCategory = expenses.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount_cents;
    return acc;
  }, {});

  const pending = expenses.filter((e) => e.status === "pending_review").length;

  const periodLabel = isTudo
    ? "Todo o período"
    : (() => {
        const [y, m] = currentPeriod.split("-").map(Number);
        return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        });
      })();

  const tier = profile?.tier ?? "free";
  const isAdmin = profile?.role === "admin";

  return (
    <main className="mx-auto max-w-lg p-4 pb-28">
      <header className="flex items-baseline justify-between py-2">
        <h1 className="text-2xl font-extrabold tracking-tight">Notinha</h1>
        <nav className="flex items-center gap-3 text-sm font-bold">
          {isAdmin && (
            <Link href="/admin" className="underline underline-offset-4 text-stamp">
              Admin
            </Link>
          )}
          {spaces.length > 0 && (
            <Link href="/espacos" className="underline underline-offset-4">
              Espaços
            </Link>
          )}
          <Link href="/importar" className="underline underline-offset-4">
            Importar
          </Link>
          <Link href="/mapa" className="underline underline-offset-4">
            Mapa
          </Link>
          <Link href="/configuracoes" className="underline underline-offset-4">
            Config
          </Link>
          <Link href="/lista" className="underline underline-offset-4">
            Lista →
          </Link>
        </nav>
      </header>

      {/* Badge de plano */}
      {tier !== "pro" && (
        <div className="mt-1 flex items-center justify-between rounded-md bg-ink-soft px-3 py-1.5 text-xs">
          <span className="text-paper/60">
            Plano{" "}
            <span className="font-bold text-paper">{TIER_LABELS[tier]}</span>
          </span>
          <Link
            href="/planos"
            className="font-bold text-ok underline underline-offset-2"
          >
            Fazer upgrade →
          </Link>
        </div>
      )}

      {/* Seletor de período */}
      <Suspense fallback={null}>
        <PeriodSelector current={currentPeriod} />
      </Suspense>

      {/* Cupom-resumo */}
      <section className="receipt-edge mt-3 px-5 py-8">
        <p className="text-center text-[11px] tracking-[0.3em] uppercase text-print-faint capitalize">
          Resumo · {periodLabel}
        </p>
        <p className="money mt-3 text-center text-4xl font-bold">
          {formatBRL(total)}
        </p>

        <div className="dashed-rule my-5" />

        <ul className="space-y-1 text-sm">
          {Object.entries(byCategory)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, cents]) => (
              <li key={cat} className="flex justify-between gap-2">
                <span className="truncate">
                  {categoryLabel(cat, userCategories)}
                </span>
                <span className="money shrink-0">{formatBRL(cents)}</span>
              </li>
            ))}
          {expenses.length === 0 && (
            <li className="text-center text-print-faint">
              {isTudo
                ? "Nenhum gasto registrado ainda."
                : "Nenhum gasto neste período."}
            </li>
          )}
        </ul>

        {Object.entries(toReimburse).length > 0 && (
          <>
            <div className="dashed-rule my-5" />
            {Object.entries(toReimburse).map(([who, cents]) => (
              <p
                key={who}
                className="flex justify-between text-sm font-bold text-stamp"
              >
                <span>A pagar pra {who}</span>
                <span className="money">{formatBRL(cents)}</span>
              </p>
            ))}
          </>
        )}
      </section>

      {pending > 0 && (
        <p className="mt-4 rounded-md bg-stamp/15 px-4 py-3 text-sm font-semibold text-stamp">
          {pending} {pending === 1 ? "gasto aguarda" : "gastos aguardam"} resposta
          — toca neles pra resolver.
        </p>
      )}

      <ExpenseList
        expenses={expenses}
        userCategories={userCategories}
        spaces={spaces}
        currentUserId={user?.id}
      />

      <ReceiptCapture />
    </main>
  );
}
