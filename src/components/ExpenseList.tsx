"use client";

import { useState, useTransition } from "react";
import {
  deleteExpense,
  resolveQuestions,
  updateExpense,
} from "@/app/actions";
import {
  allCategories,
  formatBRL,
  categoryLabel,
  paymentLabel,
  PAYMENT_METHODS,
} from "@/lib/categories";
import type { Expense, PendingQuestion, ExpenseItem, UserCategory, Space } from "@/lib/types";

function dayLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

type Props = {
  expenses: Expense[];
  userCategories?: UserCategory[];
  spaces?: Space[];
  currentUserId?: string;
};

export default function ExpenseList({
  expenses,
  userCategories = [],
  spaces = [],
  currentUserId,
}: Props) {
  const [view, setView] = useState<"dia" | "categoria" | "pagamento" | "pessoa" | "local">("dia");

  const hasSpaces = spaces.length > 0;
  const hasLocation = expenses.some((e) => e.latitude != null);

  if (expenses.length === 0) return null;

  const tabs = [
    { id: "dia", label: "Por dia" },
    { id: "categoria", label: "Categoria" },
    { id: "pagamento", label: "Pagamento" },
    ...(hasSpaces ? [{ id: "pessoa", label: "Pessoa" }] : []),
    ...(hasLocation ? [{ id: "local", label: "Local" }] : []),
  ] as const;

  return (
    <section className="mt-6">
      {/* Tabs de visualização */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-none">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setView(t.id as typeof view)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold transition-colors ${
              view === t.id
                ? "bg-paper text-print"
                : "bg-ink-soft text-paper/60"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-6">
        {view === "dia" && (
          <ByDayView
            expenses={expenses}
            userCategories={userCategories}
            spaces={spaces}
            currentUserId={currentUserId}
          />
        )}
        {view === "categoria" && (
          <ByCategoryView
            expenses={expenses}
            userCategories={userCategories}
          />
        )}
        {view === "pagamento" && <ByPaymentView expenses={expenses} />}
        {view === "pessoa" && (
          <ByPersonView
            expenses={expenses}
            spaces={spaces}
            userCategories={userCategories}
            currentUserId={currentUserId}
          />
        )}
        {view === "local" && <ByLocationView expenses={expenses} />}
      </div>
    </section>
  );
}

// ─── Por dia ──────────────────────────────────────────────────────────────────

function ByDayView({
  expenses,
  userCategories,
  spaces,
  currentUserId,
}: {
  expenses: Expense[];
  userCategories: UserCategory[];
  spaces: Space[];
  currentUserId?: string;
}) {
  const byDay = expenses.reduce<Record<string, Expense[]>>((acc, e) => {
    (acc[e.date] ??= []).push(e);
    return acc;
  }, {});
  const days = Object.keys(byDay).sort().reverse();

  return (
    <>
      {days.map((day) => {
        const dayExpenses = byDay[day];
        const total = dayExpenses.reduce((s, e) => s + e.amount_cents, 0);
        return (
          <div key={day}>
            <div className="flex items-baseline justify-between px-1 text-sm">
              <h3 className="font-bold uppercase tracking-wide text-paper/70">
                {dayLabel(day)}
              </h3>
              <span className="money text-paper/70">{formatBRL(total)}</span>
            </div>
            <ul className="mt-2 space-y-2">
              {dayExpenses.map((e) => (
                <ExpenseRow
                  key={e.id}
                  expense={e}
                  userCategories={userCategories}
                  spaces={spaces}
                  currentUserId={currentUserId}
                />
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

// ─── Por categoria ────────────────────────────────────────────────────────────

function ByCategoryView({
  expenses,
  userCategories,
}: {
  expenses: Expense[];
  userCategories: UserCategory[];
}) {
  const grouped = expenses.reduce<Record<string, Expense[]>>((acc, e) => {
    (acc[e.category] ??= []).push(e);
    return acc;
  }, {});

  const sorted = Object.entries(grouped).sort(
    (a, b) =>
      b[1].reduce((s, e) => s + e.amount_cents, 0) -
      a[1].reduce((s, e) => s + e.amount_cents, 0)
  );

  return (
    <>
      {sorted.map(([cat, items]) => {
        const total = items.reduce((s, e) => s + e.amount_cents, 0);
        return (
          <GroupAccordion
            key={cat}
            title={categoryLabel(cat, userCategories)}
            total={total}
            count={items.length}
          >
            <ul className="space-y-2">
              {items.map((e) => (
                <ExpenseRow
                  key={e.id}
                  expense={e}
                  userCategories={userCategories}
                />
              ))}
            </ul>
          </GroupAccordion>
        );
      })}
    </>
  );
}

// ─── Por pagamento ────────────────────────────────────────────────────────────

function ByPaymentView({ expenses }: { expenses: Expense[] }) {
  const grouped = expenses.reduce<Record<string, Expense[]>>((acc, e) => {
    (acc[e.payment_method] ??= []).push(e);
    return acc;
  }, {});

  const sorted = Object.entries(grouped).sort(
    (a, b) =>
      b[1].reduce((s, e) => s + e.amount_cents, 0) -
      a[1].reduce((s, e) => s + e.amount_cents, 0)
  );

  return (
    <>
      {sorted.map(([pm, items]) => {
        const total = items.reduce((s, e) => s + e.amount_cents, 0);
        return (
          <GroupAccordion
            key={pm}
            title={paymentLabel(pm)}
            total={total}
            count={items.length}
          >
            <ul className="space-y-2">
              {items.map((e) => (
                <ExpenseRow key={e.id} expense={e} />
              ))}
            </ul>
          </GroupAccordion>
        );
      })}
    </>
  );
}

// ─── Por pessoa ───────────────────────────────────────────────────────────────

function ByPersonView({
  expenses,
  spaces,
  userCategories,
  currentUserId,
}: {
  expenses: Expense[];
  spaces: Space[];
  userCategories: UserCategory[];
  currentUserId?: string;
}) {
  const allMembers: Record<string, string> = {};
  spaces.forEach((s) => {
    s.space_members?.forEach((m) => {
      allMembers[m.user_id] =
        m.display_name ?? m.user_id.slice(0, 8);
    });
  });
  if (currentUserId && !allMembers[currentUserId]) {
    allMembers[currentUserId] = "Eu";
  }

  const grouped = expenses.reduce<Record<string, Expense[]>>((acc, e) => {
    const key = e.user_id;
    (acc[key] ??= []).push(e);
    return acc;
  }, {});

  const sorted = Object.entries(grouped).sort(
    (a, b) =>
      b[1].reduce((s, e) => s + e.amount_cents, 0) -
      a[1].reduce((s, e) => s + e.amount_cents, 0)
  );

  return (
    <>
      {sorted.map(([userId, items]) => {
        const total = items.reduce((s, e) => s + e.amount_cents, 0);
        const name =
          userId === currentUserId
            ? "Eu"
            : allMembers[userId] ?? userId.slice(0, 8);
        return (
          <GroupAccordion
            key={userId}
            title={name}
            total={total}
            count={items.length}
          >
            <ul className="space-y-2">
              {items.map((e) => (
                <ExpenseRow
                  key={e.id}
                  expense={e}
                  userCategories={userCategories}
                />
              ))}
            </ul>
          </GroupAccordion>
        );
      })}
    </>
  );
}

// ─── Por local ────────────────────────────────────────────────────────────────

function ByLocationView({ expenses }: { expenses: Expense[] }) {
  const withLocation = expenses.filter(
    (e) => e.address || e.merchant || (e.latitude && e.longitude)
  );
  const withoutLocation = expenses.filter(
    (e) => !e.address && !e.merchant && !e.latitude
  );

  const grouped = withLocation.reduce<Record<string, Expense[]>>((acc, e) => {
    const key = e.address ?? e.merchant ?? `${e.latitude},${e.longitude}`;
    (acc[key] ??= []).push(e);
    return acc;
  }, {});

  const sorted = Object.entries(grouped).sort(
    (a, b) =>
      b[1].reduce((s, e) => s + e.amount_cents, 0) -
      a[1].reduce((s, e) => s + e.amount_cents, 0)
  );

  return (
    <>
      {sorted.map(([loc, items]) => {
        const total = items.reduce((s, e) => s + e.amount_cents, 0);
        return (
          <GroupAccordion
            key={loc}
            title={loc}
            total={total}
            count={items.length}
          >
            <ul className="space-y-2">
              {items.map((e) => (
                <ExpenseRow key={e.id} expense={e} />
              ))}
            </ul>
          </GroupAccordion>
        );
      })}
      {withoutLocation.length > 0 && (
        <GroupAccordion
          title="Sem localização"
          total={withoutLocation.reduce((s, e) => s + e.amount_cents, 0)}
          count={withoutLocation.length}
        >
          <ul className="space-y-2">
            {withoutLocation.map((e) => (
              <ExpenseRow key={e.id} expense={e} />
            ))}
          </ul>
        </GroupAccordion>
      )}
    </>
  );
}

// ─── GroupAccordion ───────────────────────────────────────────────────────────

function GroupAccordion({
  title,
  total,
  count,
  children,
}: {
  title: string;
  total: number;
  count: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-baseline justify-between px-1 text-sm"
      >
        <span className="font-bold uppercase tracking-wide text-paper/70">
          {title}{" "}
          <span className="font-normal normal-case text-paper/40">
            ({count})
          </span>
        </span>
        <span className="money text-paper/70">{formatBRL(total)}</span>
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  );
}

// ─── ExpenseRow ───────────────────────────────────────────────────────────────

function ExpenseRow({
  expense,
  userCategories = [],
  spaces = [],
  currentUserId,
}: {
  expense: Expense;
  userCategories?: UserCategory[];
  spaces?: Space[];
  currentUserId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [questions, setQuestions] = useState<PendingQuestion[]>(
    expense.questions ?? []
  );
  const [isPending, startTransition] = useTransition();

  const pending = expense.status === "pending_review";

  if (editing) {
    return (
      <li className="rounded-lg bg-ink-soft">
        <EditForm
          expense={expense}
          userCategories={userCategories}
          spaces={spaces}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      </li>
    );
  }

  return (
    <li
      className={`rounded-lg bg-ink-soft ${pending ? "ring-2 ring-stamp/70" : ""}`}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {pending && "⏳ "}
            {expense.description}
          </p>
          <p className="truncate text-xs text-paper/50">
            {categoryLabel(expense.category, userCategories)} ·{" "}
            {paymentLabel(expense.payment_method)}
            {expense.reimburse_to
              ? ` · a pagar pra ${expense.reimburse_to}`
              : ""}
            {expense.space_id
              ? ` · ${spaces.find((s) => s.id === expense.space_id)?.name ?? "espaço compartilhado"}`
              : ""}
          </p>
        </div>
        <span className="money shrink-0 font-bold">
          {formatBRL(expense.amount_cents)}
        </span>
      </button>

      {open && (
        <div className="space-y-3 border-t border-paper/10 px-4 py-3 text-sm">
          {expense.expense_items && expense.expense_items.length > 0 && (
            <ul className="space-y-1 text-paper/80">
              {expense.expense_items
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                .map((it, i) => (
                  <li key={it.id ?? i} className="flex justify-between gap-2">
                    <span className="truncate">
                      {it.quantity > 1 ? `${it.quantity}× ` : ""}
                      {it.description}
                    </span>
                    <span className="money shrink-0">
                      {formatBRL(it.total_cents)}
                    </span>
                  </li>
                ))}
            </ul>
          )}

          {expense.address && (
            <p className="text-xs text-paper/50">📍 {expense.address}</p>
          )}

          {pending && questions.length > 0 && (
            <div className="space-y-2 rounded-md bg-stamp/15 p-3">
              {questions.map((q, i) => (
                <label key={i} className="block">
                  <span className="font-semibold text-stamp">{q.q}</span>
                  <input
                    value={q.a ?? ""}
                    onChange={(e) =>
                      setQuestions((qs) =>
                        qs.map((x, j) =>
                          j === i ? { ...x, a: e.target.value } : x
                        )
                      )
                    }
                    className="mt-1 w-full rounded-md bg-ink px-2 py-2 text-paper outline-none"
                  />
                </label>
              ))}
              <button
                disabled={isPending}
                onClick={() =>
                  startTransition(() =>
                    resolveQuestions(expense.id, questions, {})
                  )
                }
                className="w-full rounded-md bg-ok py-2 font-bold text-paper disabled:opacity-50"
              >
                {isPending ? "Salvando…" : "Resolver"}
              </button>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-paper/60 underline underline-offset-2"
            >
              Editar
            </button>
            <button
              disabled={isPending}
              onClick={() => {
                if (confirm("Apagar este gasto?")) {
                  startTransition(() => deleteExpense(expense.id));
                }
              }}
              className="text-xs text-stamp underline underline-offset-2"
            >
              Apagar
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

// ─── EditForm ─────────────────────────────────────────────────────────────────

function EditForm({
  expense,
  userCategories,
  spaces,
  onCancel,
  onSaved,
}: {
  expense: Expense;
  userCategories: UserCategory[];
  spaces: Space[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    date: expense.date,
    description: expense.description,
    merchant: expense.merchant ?? "",
    amount_cents: expense.amount_cents,
    category: expense.category,
    payment_method: expense.payment_method,
    space_id: expense.space_id ?? "",
    items: (expense.expense_items ?? []).map((it) => ({ ...it })),
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function patchItem(idx: number, p: Partial<ExpenseItem>) {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, ...p } : it)),
    }));
  }

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await updateExpense(expense.id, {
        date: form.date,
        description: form.description,
        merchant: form.merchant || null,
        amount_cents: form.amount_cents,
        category: form.category,
        payment_method: form.payment_method,
        reimburse_to: form.payment_method === "gisele" ? "Gisele" : null,
        space_id: form.space_id || null,
        items: form.items,
      });
      startTransition(() => onSaved());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  }

  const cats = allCategories(userCategories);

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-bold text-sm">Editar gasto</p>
        <button onClick={onCancel} className="text-xs underline text-paper/60">
          Cancelar
        </button>
      </div>

      <input
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        className="w-full rounded-md bg-ink px-2 py-2 text-paper outline-none text-sm"
        placeholder="Descrição"
      />

      {/* Itens */}
      <div className="space-y-1">
        {form.items.map((it, i) => (
          <div key={i} className="flex items-center gap-1 text-sm">
            <input
              value={it.description}
              onChange={(e) => patchItem(i, { description: e.target.value })}
              className="min-w-0 flex-1 rounded bg-ink px-2 py-1 text-paper outline-none"
              placeholder="Item"
            />
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={it.quantity}
              onChange={(e) =>
                patchItem(i, { quantity: parseFloat(e.target.value) || 1 })
              }
              className="w-10 rounded bg-ink px-1 py-1 text-paper text-center outline-none"
            />
            <input
              inputMode="decimal"
              value={(it.total_cents / 100).toFixed(2)}
              onChange={(e) => {
                const v = parseFloat(e.target.value.replace(",", "."));
                patchItem(i, { total_cents: isNaN(v) ? 0 : Math.round(v * 100) });
              }}
              className="w-20 rounded bg-ink px-2 py-1 text-paper text-right outline-none money"
            />
            <button
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  items: f.items.filter((_, j) => j !== i),
                }))
              }
              className="text-stamp"
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={() =>
            setForm((f) => ({
              ...f,
              items: [
                ...f.items,
                { description: "", quantity: 1, unit_cents: null, total_cents: 0 },
              ],
            }))
          }
          className="text-xs text-paper/50 underline"
        >
          + item
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <label className="uppercase tracking-wide text-paper/60">
          Data
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="mt-1 w-full rounded-md bg-ink px-2 py-2 text-paper outline-none"
          />
        </label>
        <label className="uppercase tracking-wide text-paper/60">
          Total (R$)
          <input
            inputMode="decimal"
            value={(form.amount_cents / 100).toFixed(2)}
            onChange={(e) => {
              const v = parseFloat(e.target.value.replace(",", "."));
              setForm((f) => ({
                ...f,
                amount_cents: isNaN(v) ? 0 : Math.round(v * 100),
              }));
            }}
            className="money mt-1 w-full rounded-md bg-ink px-2 py-2 text-paper outline-none"
          />
        </label>
        <label className="uppercase tracking-wide text-paper/60">
          Categoria
          <select
            value={form.category}
            onChange={(e) =>
              setForm((f) => ({ ...f, category: e.target.value }))
            }
            className="mt-1 w-full rounded-md bg-ink px-2 py-2 text-paper outline-none"
          >
            {cats.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="uppercase tracking-wide text-paper/60">
          Pagamento
          <select
            value={form.payment_method}
            onChange={(e) =>
              setForm((f) => ({ ...f, payment_method: e.target.value }))
            }
            className="mt-1 w-full rounded-md bg-ink px-2 py-2 text-paper outline-none"
          >
            {PAYMENT_METHODS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        {spaces.length > 0 && (
          <label className="col-span-2 uppercase tracking-wide text-paper/60">
            Espaço
            <select
              value={form.space_id}
              onChange={(e) =>
                setForm((f) => ({ ...f, space_id: e.target.value }))
              }
              className="mt-1 w-full rounded-md bg-ink px-2 py-2 text-paper outline-none"
            >
              <option value="">Pessoal</option>
              {spaces.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      {error && <p className="text-sm text-stamp">{error}</p>}

      <button
        onClick={save}
        disabled={busy}
        className="w-full rounded-md bg-ok py-2 font-bold text-paper disabled:opacity-50"
      >
        {busy ? "Salvando…" : "Salvar alterações"}
      </button>
    </div>
  );
}
