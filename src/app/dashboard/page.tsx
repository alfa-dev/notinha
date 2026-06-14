import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, categoryLabel } from "@/lib/categories";
import type { Expense, UserCategory, Space } from "@/lib/types";
import ExpenseList from "@/components/ExpenseList";
import PeriodSelector from "@/components/PeriodSelector";
import { getCurrentProfile, TIER_LABELS } from "@/lib/admin";
import UserMenu from "@/components/UserMenu";

// One color per semantic category; unknown categories cycle through PALETTE
const CATEGORY_COLORS: Record<string, string> = {
  alimentacao:    "#FF6433",
  transporte:     "#3B82F6",
  moradia:        "#10B981",
  saude:          "#8B5CF6",
  lazer:          "#F59E0B",
  trabalho:       "#06B6D4",
  educacao:       "#EC4899",
  outros:         "#64748B",
  servicos:       "#F97316",
  assinaturas:    "#A78BFA",
  entretenimento: "#F59E0B",
  viagem:         "#34D399",
};
const PALETTE = ["#FF6433", "#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#06B6D4", "#EC4899", "#64748B"];

function catColor(id: string, idx: number) {
  return CATEGORY_COLORS[id] ?? PALETTE[idx % PALETTE.length];
}

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

  const [expensesResult, catRes, spaceRes, profile] = await Promise.all([
    query,
    supabase.from("user_categories").select("*").order("position"),
    supabase.from("spaces").select("*, space_members(*)"),
    getCurrentProfile(),
  ]);

  // Fallback: se a query com expense_items(*) falhar, tenta sem o embed
  let expensesFinalResult = expensesResult;
  if (expensesResult.error) {
    console.error("[dashboard] expenses+items query error:", expensesResult.error.message);
    const fallback = supabase
      .from("expenses")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (!isTudo) {
      const [y, m] = currentPeriod.split("-").map(Number);
      const start = `${y}-${String(m).padStart(2, "0")}-01`;
      const daysInMonth = new Date(y, m, 0).getDate();
      const endStr = `${y}-${String(m).padStart(2, "0")}-${String(daysInMonth).padStart(2, "0")}`;
      expensesFinalResult = await fallback.gte("date", start).lte("date", endStr);
    } else {
      expensesFinalResult = await fallback.limit(500);
    }
  }

  const queryError = expensesFinalResult.error
    ? expensesResult.error?.message ?? expensesFinalResult.error.message
    : null;

  const expenses = (expensesFinalResult.data ?? []) as Expense[];
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
  const categoryCount = Object.keys(byCategory).length;

  return (
    <>
      {/* ── Top bar: logo + user only ── */}
      <header className="sticky top-0 z-40 border-b border-[rgba(255,255,255,0.08)] bg-ink/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stamp text-xs font-extrabold text-white">
              N
            </div>
            <span className="font-bold text-base tracking-tight">notinha</span>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-stamp hover:bg-ink-raise transition-colors"
              >
                Admin
              </Link>
            )}
            <UserMenu email={user?.email ?? ""} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pt-4 pb-44">
        {/* Upgrade banner */}
        {tier !== "pro" && (
          <div className="mb-4 flex items-center justify-between rounded-xl bg-ink-soft border border-[rgba(255,255,255,0.06)] px-4 py-2.5">
            <span className="text-xs text-print-faint">
              Plano{" "}
              <span className="font-semibold text-paper">{TIER_LABELS[tier]}</span>
            </span>
            <Link
              href="/planos"
              className="text-xs font-bold text-stamp hover:text-stamp-hover transition-colors"
            >
              Fazer upgrade →
            </Link>
          </div>
        )}

        {/* Period selector */}
        <Suspense fallback={null}>
          <PeriodSelector current={currentPeriod} />
        </Suspense>

        {/* Query error visible to the user for debugging */}
        {queryError && (
          <div className="mt-3 rounded-xl border border-stamp/30 bg-stamp/10 px-4 py-3 text-xs text-stamp font-mono break-all">
            Erro ao carregar gastos: {queryError}
          </div>
        )}

        {/* ── Stats cards ── */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {/* Total */}
          <div className="col-span-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-ink-soft px-5 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-print-faint capitalize mb-1">
              {periodLabel}
            </p>
            <p className="money text-4xl font-bold">{formatBRL(total)}</p>
            {expenses.length > 0 && (
              <div className="mt-2 flex items-center gap-3 text-xs text-print-faint">
                <span>{expenses.length} {expenses.length === 1 ? "gasto" : "gastos"}</span>
                {categoryCount > 0 && (
                  <>
                    <span className="text-[rgba(255,255,255,0.15)]">·</span>
                    <span>{categoryCount} {categoryCount === 1 ? "categoria" : "categorias"}</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── Category breakdown ── */}
        {Object.keys(byCategory).length > 0 && (
          <div className="mt-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-ink-soft px-5 py-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-print-faint mb-4">
              Por categoria
            </p>
            <ul className="space-y-3">
              {Object.entries(byCategory)
                .sort((a, b) => b[1] - a[1])
                .map(([cat, cents], i) => {
                  const pct = Math.round((cents / total) * 100);
                  const color = catColor(cat, i);
                  return (
                    <li key={cat}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-medium text-paper">
                          {categoryLabel(cat, userCategories)}
                        </span>
                        <span className="money text-xs text-print-faint tabular-nums">
                          {formatBRL(cents)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-ink-raise overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: color,
                            boxShadow: `0 0 6px ${color}80`,
                          }}
                        />
                      </div>
                    </li>
                  );
                })}
            </ul>
          </div>
        )}

        {expenses.length === 0 && (
          <div className="mt-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-ink-soft px-5 py-10 text-center">
            <p className="text-sm text-print-faint">
              {isTudo
                ? "Nenhum gasto registrado ainda."
                : "Nenhum gasto neste período."}
            </p>
          </div>
        )}

        {/* Reembolso pendente */}
        {Object.entries(toReimburse).length > 0 && (
          <div className="mt-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-ink-soft px-5 py-4">
            {Object.entries(toReimburse).map(([who, cents]) => (
              <p key={who} className="flex justify-between text-sm font-semibold text-stamp">
                <span>A pagar pra {who}</span>
                <span className="money">{formatBRL(cents)}</span>
              </p>
            ))}
          </div>
        )}

        {pending > 0 && (
          <div className="mt-3 rounded-xl border border-stamp/20 bg-stamp/8 px-4 py-3 text-sm font-medium text-stamp">
            {pending} {pending === 1 ? "gasto aguarda" : "gastos aguardam"} revisão — toque para resolver.
          </div>
        )}

        <ExpenseList
          expenses={expenses}
          userCategories={userCategories}
          spaces={spaces}
          currentUserId={user?.id}
        />
      </main>
    </>
  );
}
