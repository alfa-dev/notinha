import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { formatBRL, categoryLabel } from "@/lib/categories";
import type { Expense, UserCategory, Space } from "@/lib/types";
import ReceiptCapture from "@/components/ReceiptCapture";
import ExpenseList from "@/components/ExpenseList";
import PeriodSelector from "@/components/PeriodSelector";
import { getCurrentProfile, TIER_LABELS } from "@/lib/admin";
import UserMenu from "@/components/UserMenu";

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
    <>
      {/* ── Top nav ── */}
      <header className="sticky top-0 z-40 border-b border-[rgba(255,255,255,0.08)] bg-ink/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 h-14">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-stamp text-xs font-extrabold text-white">
              N
            </div>
            <span className="font-bold text-base tracking-tight">notinha</span>
          </div>

          {/* Nav links */}
          <nav className="flex items-center gap-1 text-xs font-semibold">
            {isAdmin && (
              <Link
                href="/admin"
                className="rounded-md px-2.5 py-1.5 text-stamp hover:bg-ink-raise transition-colors"
              >
                Admin
              </Link>
            )}
            {spaces.length > 0 && (
              <Link
                href="/espacos"
                className="rounded-md px-2.5 py-1.5 text-print-faint hover:text-paper hover:bg-ink-raise transition-colors"
              >
                Espaços
              </Link>
            )}
            <Link
              href="/mapa"
              className="rounded-md px-2.5 py-1.5 text-print-faint hover:text-paper hover:bg-ink-raise transition-colors"
            >
              Mapa
            </Link>
            <Link
              href="/importar"
              className="rounded-md px-2.5 py-1.5 text-print-faint hover:text-paper hover:bg-ink-raise transition-colors"
            >
              Importar
            </Link>
            <Link
              href="/configuracoes"
              className="rounded-md px-2.5 py-1.5 text-print-faint hover:text-paper hover:bg-ink-raise transition-colors"
            >
              Config
            </Link>
            <UserMenu email={user?.email ?? ""} />
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-4 pb-28 pt-4">
        {/* Upgrade banner */}
        {tier !== "pro" && (
          <div className="mb-3 flex items-center justify-between rounded-xl bg-ink-soft border border-[rgba(255,255,255,0.06)] px-4 py-2.5">
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

        {/* Summary card */}
        <section className="mt-3 rounded-2xl border border-[rgba(255,255,255,0.08)] bg-ink-soft px-5 py-6">
          <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-print-faint capitalize">
            {periodLabel}
          </p>
          <p className="money mt-3 text-center text-4xl font-bold">
            {formatBRL(total)}
          </p>

          {Object.keys(byCategory).length > 0 && (
            <>
              <div className="dashed-rule my-4" />
              <ul className="space-y-2 text-sm">
                {Object.entries(byCategory)
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, cents]) => {
                    const pct = Math.round((cents / total) * 100);
                    return (
                      <li key={cat} className="flex items-center gap-3">
                        <span className="flex-1 truncate text-print-faint text-xs">
                          {categoryLabel(cat, userCategories)}
                        </span>
                        <div className="h-1 w-16 rounded-full bg-ink-raise overflow-hidden">
                          <div
                            className="h-full rounded-full bg-stamp"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="money shrink-0 text-xs tabular-nums">
                          {formatBRL(cents)}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </>
          )}

          {expenses.length === 0 && (
            <p className="mt-4 text-center text-sm text-print-faint">
              {isTudo
                ? "Nenhum gasto registrado ainda."
                : "Nenhum gasto neste período."}
            </p>
          )}

          {Object.entries(toReimburse).length > 0 && (
            <>
              <div className="dashed-rule my-4" />
              {Object.entries(toReimburse).map(([who, cents]) => (
                <p key={who} className="flex justify-between text-sm font-semibold text-stamp">
                  <span>A pagar pra {who}</span>
                  <span className="money">{formatBRL(cents)}</span>
                </p>
              ))}
            </>
          )}
        </section>

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

        <ReceiptCapture />
      </main>
    </>
  );
}
