"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { saveExpense } from "@/app/actions";
import { CATEGORIES, PAYMENT_METHODS, formatBRL } from "@/lib/categories";
import type { ParsedReceipt } from "@/lib/types";

type Draft = {
  parsed: ParsedReceipt;
  receiptPath: string | null;
  answers: Record<number, string>;
};

export default function ReceiptCapture() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);

  async function parse(file: File | null) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      if (file) form.append("image", file);
      if (text.trim()) form.append("text", text.trim());

      const res = await fetch("/api/parse-receipt", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha ao ler a nota");

      setDraft({ parsed: json.parsed, receiptPath: json.receiptPath, answers: {} });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setBusy(false);
    }
  }

  function patchParsed(patch: Partial<ParsedReceipt>) {
    setDraft((d) => (d ? { ...d, parsed: { ...d.parsed, ...patch } } : d));
  }

  async function confirm() {
    if (!draft) return;
    const { parsed, receiptPath, answers } = draft;

    if (parsed.amount_cents == null) {
      setError("Falta o valor total.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const unanswered = parsed.questions.filter(
        (_, i) => !answers[i] || answers[i].trim() === ""
      );

      await saveExpense({
        date: parsed.date ?? new Date().toISOString().slice(0, 10),
        merchant: parsed.merchant,
        description: parsed.description,
        amount_cents: parsed.amount_cents,
        category: parsed.category,
        payment_method: parsed.payment_method ?? "outro",
        reimburse_to: parsed.payment_method === "gisele" ? "Gisele" : null,
        receipt_path: receiptPath,
        status: unanswered.length > 0 ? "pending_review" : "confirmed",
        questions: parsed.questions.map((q, i) => ({
          q,
          a: answers[i]?.trim() || null,
        })),
        notes: null,
        items: parsed.items.map((it) => ({ ...it })),
      });

      setDraft(null);
      setText("");
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {/* Botão flutuante */}
      <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-lg p-4">
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-xl bg-stamp py-4 text-lg font-extrabold text-paper shadow-lg shadow-black/40 active:scale-[0.99]"
        >
          + Anotar gasto
        </button>
      </div>

      {!open ? null : (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60">
          <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-ink-soft p-5">
            {!draft ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-extrabold">Novo gasto</h2>
                  <button onClick={() => setOpen(false)} className="text-sm underline">
                    Fechar
                  </button>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={busy}
                    className="flex-1 rounded-xl border-2 border-dashed border-paper/30 py-8 text-center font-bold disabled:opacity-50"
                  >
                    📷 Câmera
                  </button>
                  <button
                    onClick={() => galleryRef.current?.click()}
                    disabled={busy}
                    className="flex-1 rounded-xl border-2 border-dashed border-paper/30 py-8 text-center font-bold disabled:opacity-50"
                  >
                    🖼️ Galeria
                  </button>
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) parse(f);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) parse(f);
                    e.target.value = "";
                  }}
                />

                <p className="my-3 text-center text-xs uppercase tracking-widest text-paper/50">
                  ou descreve aí
                </p>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={2}
                  placeholder="ex: 2 maços de cigarro no pix, 23 reais"
                  className="w-full rounded-md bg-ink px-3 py-3 text-paper outline-none placeholder:text-paper/30"
                />
                <button
                  onClick={() => parse(null)}
                  disabled={busy || !text.trim()}
                  className="mt-2 w-full rounded-md bg-paper py-3 font-bold text-print disabled:opacity-40"
                >
                  {busy ? "Lendo…" : "Anotar"}
                </button>
              </>
            ) : (
              <ExpenseReview
                draft={draft}
                onPatch={patchParsed}
                onAnswer={(i, a) =>
                  setDraft((d) =>
                    d ? { ...d, answers: { ...d.answers, [i]: a } } : d
                  )
                }
                onCancel={() => setDraft(null)}
                onConfirm={confirm}
                busy={busy}
              />
            )}

            {error && <p className="mt-3 text-sm font-semibold text-stamp">{error}</p>}
          </div>
        </div>
      )}
    </>
  );
}

function ExpenseReview({
  draft,
  onPatch,
  onAnswer,
  onCancel,
  onConfirm,
  busy,
}: {
  draft: Draft;
  onPatch: (p: Partial<ParsedReceipt>) => void;
  onAnswer: (index: number, answer: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  busy: boolean;
}) {
  const { parsed, answers } = draft;

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-extrabold">Confere aí</h2>
        <button onClick={onCancel} className="text-sm underline">
          Voltar
        </button>
      </div>

      {/* Prévia em formato de cupom */}
      <div className="receipt-edge mt-4 px-4 py-6 text-sm">
        <input
          value={parsed.description}
          onChange={(e) => onPatch({ description: e.target.value })}
          className="w-full bg-transparent text-center font-bold outline-none"
        />
        {parsed.merchant && (
          <p className="text-center text-xs text-print-faint">{parsed.merchant}</p>
        )}

        <div className="dashed-rule my-3" />

        {parsed.items.length > 0 && (
          <ul className="space-y-1">
            {parsed.items.map((it, i) => (
              <li key={i} className="flex justify-between gap-2">
                <span className="truncate">
                  {it.quantity > 1 ? `${it.quantity}× ` : ""}
                  {it.description}
                </span>
                <span className="money shrink-0">{formatBRL(it.total_cents)}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="dashed-rule my-3" />

        <div className="flex items-center justify-between font-bold">
          <span>TOTAL</span>
          <input
            inputMode="decimal"
            value={parsed.amount_cents != null ? (parsed.amount_cents / 100).toFixed(2) : ""}
            onChange={(e) => {
              const v = parseFloat(e.target.value.replace(",", "."));
              onPatch({ amount_cents: isNaN(v) ? null : Math.round(v * 100) });
            }}
            placeholder="0,00"
            className="money w-28 bg-transparent text-right outline-none"
          />
        </div>
      </div>

      {/* Campos editáveis */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        <label className="text-xs uppercase tracking-wide text-paper/60">
          Data
          <input
            type="date"
            value={parsed.date ?? ""}
            onChange={(e) => onPatch({ date: e.target.value || null })}
            className="mt-1 w-full rounded-md bg-ink px-2 py-2 text-paper outline-none"
          />
        </label>
        <label className="text-xs uppercase tracking-wide text-paper/60">
          Categoria
          <select
            value={parsed.category}
            onChange={(e) => onPatch({ category: e.target.value })}
            className="mt-1 w-full rounded-md bg-ink px-2 py-2 text-paper outline-none"
          >
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="col-span-2 text-xs uppercase tracking-wide text-paper/60">
          Pagamento
          <select
            value={parsed.payment_method ?? ""}
            onChange={(e) => onPatch({ payment_method: e.target.value || null })}
            className="mt-1 w-full rounded-md bg-ink px-2 py-2 text-paper outline-none"
          >
            <option value="">— não sei ainda —</option>
            {PAYMENT_METHODS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Perguntas da IA */}
      {parsed.questions.length > 0 && (
        <div className="mt-4 space-y-3 rounded-md bg-stamp/15 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-stamp">
            Antes de salvar, me responde:
          </p>
          {parsed.questions.map((q, i) => (
            <label key={i} className="block text-sm">
              {q}
              <input
                value={answers[i] ?? ""}
                onChange={(e) => onAnswer(i, e.target.value)}
                className="mt-1 w-full rounded-md bg-ink px-2 py-2 text-paper outline-none"
              />
            </label>
          ))}
          <p className="text-xs text-paper/60">
            Pode salvar sem responder — fica marcado como pendente.
          </p>
        </div>
      )}

      <button
        onClick={onConfirm}
        disabled={busy}
        className="mt-4 w-full rounded-xl bg-ok py-4 text-lg font-extrabold text-paper disabled:opacity-50"
      >
        {busy ? "Salvando…" : "Salvar gasto"}
      </button>
    </>
  );
}
