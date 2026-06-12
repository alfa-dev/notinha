"use client";

import { useState, useTransition } from "react";
import { deleteExpense, resolveQuestions } from "@/app/actions";
import { formatBRL, categoryLabel, paymentLabel } from "@/lib/categories";
import type { Expense, PendingQuestion } from "@/lib/types";

function dayLabel(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
}

export default function ExpenseList({ expenses }: { expenses: Expense[] }) {
  const byDay = expenses.reduce<Record<string, Expense[]>>((acc, e) => {
    (acc[e.date] ??= []).push(e);
    return acc;
  }, {});

  const days = Object.keys(byDay).sort().reverse();

  if (days.length === 0) return null;

  return (
    <section className="mt-6 space-y-6">
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
                <ExpenseRow key={e.id} expense={e} />
              ))}
            </ul>
          </div>
        );
      })}
    </section>
  );
}

function ExpenseRow({ expense }: { expense: Expense }) {
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<PendingQuestion[]>(
    expense.questions ?? []
  );
  const [isPending, startTransition] = useTransition();

  const pending = expense.status === "pending_review";

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
            {categoryLabel(expense.category)} · {paymentLabel(expense.payment_method)}
            {expense.reimburse_to ? ` · a pagar pra ${expense.reimburse_to}` : ""}
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
                  startTransition(() => resolveQuestions(expense.id, questions, {}))
                }
                className="w-full rounded-md bg-ok py-2 font-bold text-paper disabled:opacity-50"
              >
                {isPending ? "Salvando…" : "Resolver"}
              </button>
            </div>
          )}

          <button
            disabled={isPending}
            onClick={() => {
              if (confirm("Apagar este gasto?")) {
                startTransition(() => deleteExpense(expense.id));
              }
            }}
            className="text-xs text-stamp underline underline-offset-2"
          >
            Apagar gasto
          </button>
        </div>
      )}
    </li>
  );
}
