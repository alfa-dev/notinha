"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { saveExpense } from "@/app/actions";
import { allCategories, PAYMENT_METHODS, formatBRL } from "@/lib/categories";
import type {
  OCRJob,
  ParsedReceipt,
  UserCategory,
  Space,
  ExpenseItem,
} from "@/lib/types";

// ─── Context ────────────────────────────────────────────────────────────────

type OCRQueueContextValue = {
  jobs: OCRJob[];
  enqueue: (opts: {
    file?: File;
    text?: string;
    location?: OCRJob["location"];
    spaceId?: string | null;
  }) => string;
  dismiss: (id: string) => void;
};

const OCRQueueContext = createContext<OCRQueueContextValue | null>(null);

export function useOCRQueue() {
  const ctx = useContext(OCRQueueContext);
  if (!ctx) throw new Error("useOCRQueue must be used within OCRQueueProvider");
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

type ProviderProps = {
  children: React.ReactNode;
  userCategories: UserCategory[];
  spaces: Space[];
};

export function OCRQueueProvider({
  children,
  userCategories,
  spaces,
}: ProviderProps) {
  const [jobs, setJobs] = useState<OCRJob[]>([]);
  const [reviewJobId, setReviewJobId] = useState<string | null>(null);
  const processingRef = useRef(false);
  const router = useRouter();

  const enqueue = useCallback(
    (opts: {
      file?: File;
      text?: string;
      location?: OCRJob["location"];
      spaceId?: string | null;
    }) => {
      const id = crypto.randomUUID();
      setJobs((prev) => [...prev, { id, ...opts, status: "queued" }]);
      return id;
    },
    []
  );

  const dismiss = useCallback((id: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== id));
    setReviewJobId((cur) => (cur === id ? null : cur));
  }, []);

  // Processa a fila sequencialmente
  useEffect(() => {
    const queued = jobs.find((j) => j.status === "queued");
    if (!queued || processingRef.current) return;
    processingRef.current = true;

    setJobs((prev) =>
      prev.map((j) =>
        j.id === queued.id ? { ...j, status: "processing" } : j
      )
    );

    (async () => {
      try {
        const form = new FormData();
        if (queued.file) form.append("image", queued.file);
        if (queued.text) form.append("text", queued.text);

        const res = await fetch("/api/parse-receipt", {
          method: "POST",
          body: form,
        });
        const json = await res.json();
        if (!res.ok) {
          if (res.status === 429 && json.limitReached) {
            setJobs((prev) =>
              prev.map((j) =>
                j.id === queued.id
                  ? { ...j, status: "error", error: json.error, limitReached: true, tier: json.tier }
                  : j
              )
            );
            processingRef.current = false;
            return;
          }
          throw new Error(json.error ?? "Falha ao ler a nota");
        }

        setJobs((prev) =>
          prev.map((j) =>
            j.id === queued.id
              ? {
                  ...j,
                  status: "done",
                  result: {
                    parsed: json.parsed as ParsedReceipt,
                    receiptPath: json.receiptPath,
                  },
                }
              : j
          )
        );
      } catch (e) {
        setJobs((prev) =>
          prev.map((j) =>
            j.id === queued.id
              ? {
                  ...j,
                  status: "error",
                  error: e instanceof Error ? e.message : "Erro inesperado",
                  limitReached: false,
                }
              : j
          )
        );
      } finally {
        processingRef.current = false;
      }
    })();
  }, [jobs]);

  const processing = jobs.filter(
    (j) => j.status === "queued" || j.status === "processing"
  );
  const done = jobs.filter((j) => j.status === "done");
  const errors = jobs.filter((j) => j.status === "error");

  const reviewJob = reviewJobId ? jobs.find((j) => j.id === reviewJobId) : null;

  return (
    <OCRQueueContext.Provider value={{ jobs, enqueue, dismiss }}>
      {children}

      {/* Indicador flutuante */}
      {(processing.length > 0 || done.length > 0 || errors.length > 0) && (
        <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 max-w-[280px]">
          {processing.length > 0 && (
            <div className="rounded-lg bg-ink-soft px-4 py-2 text-sm font-semibold shadow-lg border border-paper/10">
              <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-ok" />
              {processing.length === 1
                ? "Lendo notinha…"
                : `Lendo ${processing.length} notinhas…`}
            </div>
          )}
          {done.map((job) => (
            <button
              key={job.id}
              onClick={() => setReviewJobId(job.id)}
              className="rounded-lg bg-ok/20 border border-ok/40 px-4 py-2 text-sm font-bold text-ok text-left shadow-lg active:scale-[0.98]"
            >
              ✓ Notinha pronta — toca pra revisar
            </button>
          ))}
          {errors.map((job) => (
            <div
              key={job.id}
              className="rounded-lg bg-stamp/20 border border-stamp/40 px-4 py-2 text-sm text-stamp shadow-lg"
            >
              <div className="flex items-start gap-2">
                <span className="flex-1">{job.error ?? "Erro ao ler nota"}</span>
                <button onClick={() => dismiss(job.id)} className="font-bold ml-1 shrink-0">
                  ×
                </button>
              </div>
              {job.limitReached && (
                <a
                  href="/planos"
                  className="mt-2 block text-center rounded-md bg-stamp px-3 py-1.5 text-xs font-bold text-paper"
                >
                  Ver planos de upgrade →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de revisão */}
      {reviewJob?.status === "done" && reviewJob.result && (
        <ReviewModal
          job={reviewJob}
          userCategories={userCategories}
          spaces={spaces}
          onClose={() => setReviewJobId(null)}
          onSaved={() => {
            dismiss(reviewJob.id);
            router.refresh();
          }}
        />
      )}
    </OCRQueueContext.Provider>
  );
}

// ─── ReviewModal ─────────────────────────────────────────────────────────────

type ReviewDraft = {
  description: string;
  merchant: string | null;
  date: string | null;
  amount_cents: number | null;
  category: string;
  payment_method: string | null;
  items: ExpenseItem[];
  questions: { q: string; a: string | null }[];
  receiptPath: string | null;
  spaceId: string | null;
};

function parsedToReview(
  parsed: ParsedReceipt,
  receiptPath: string | null,
  spaceId: string | null | undefined,
  location?: OCRJob["location"]
): ReviewDraft & { location?: OCRJob["location"] } {
  return {
    description: parsed.description,
    merchant: parsed.merchant,
    date: parsed.date,
    amount_cents: parsed.amount_cents,
    category: parsed.category,
    payment_method: parsed.payment_method,
    items: parsed.items.map((it) => ({ ...it })),
    questions: parsed.questions.map((q) => ({ q, a: null })),
    receiptPath,
    spaceId: spaceId ?? null,
    location,
  };
}

function ReviewModal({
  job,
  userCategories,
  spaces,
  onClose,
  onSaved,
}: {
  job: OCRJob;
  userCategories: UserCategory[];
  spaces: Space[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<
    ReviewDraft & { location?: OCRJob["location"] }
  >(() =>
    parsedToReview(
      job.result!.parsed,
      job.result!.receiptPath,
      job.spaceId,
      job.location
    )
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function patch(p: Partial<ReviewDraft>) {
    setDraft((d) => ({ ...d, ...p }));
  }

  function patchItem(
    idx: number,
    p: Partial<ExpenseItem>
  ) {
    setDraft((d) => ({
      ...d,
      items: d.items.map((it, i) => (i === idx ? { ...it, ...p } : it)),
    }));
  }

  function addItem() {
    setDraft((d) => ({
      ...d,
      items: [
        ...d.items,
        { description: "", quantity: 1, unit_cents: null, total_cents: 0 },
      ],
    }));
  }

  function removeItem(idx: number) {
    setDraft((d) => ({
      ...d,
      items: d.items.filter((_, i) => i !== idx),
    }));
  }

  async function confirm() {
    if (draft.amount_cents == null) {
      setError("Falta o valor total.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const unanswered = draft.questions.filter(
        (q) => !q.a || q.a.trim() === ""
      );

      await saveExpense({
        date: draft.date ?? new Date().toISOString().slice(0, 10),
        merchant: draft.merchant,
        description: draft.description,
        amount_cents: draft.amount_cents,
        category: draft.category,
        payment_method: draft.payment_method ?? "outro",
        reimburse_to:
          draft.payment_method === "gisele" ? "Gisele" : null,
        receipt_path: draft.receiptPath,
        status: unanswered.length > 0 ? "pending_review" : "confirmed",
        questions: draft.questions,
        notes: null,
        items: draft.items,
        space_id: draft.spaceId ?? null,
        latitude: draft.location?.latitude ?? null,
        longitude: draft.location?.longitude ?? null,
        address: draft.location?.address ?? null,
      });

      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  }

  const cats = allCategories(userCategories);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60">
      <div className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-ink-soft p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold">Confere aí</h2>
          <button onClick={onClose} className="text-sm underline">
            Voltar
          </button>
        </div>

        {/* Cupom */}
        <div className="receipt-edge mt-4 px-4 py-6 text-sm">
          <input
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
            className="w-full bg-transparent text-center font-bold outline-none"
            placeholder="Descrição"
          />
          {draft.merchant && (
            <p className="text-center text-xs text-print-faint">
              {draft.merchant}
            </p>
          )}

          <div className="dashed-rule my-3" />

          {/* Itens editáveis */}
          <ul className="space-y-2">
            {draft.items.map((it, i) => (
              <li key={i} className="flex items-center gap-1">
                <input
                  value={it.description}
                  onChange={(e) =>
                    patchItem(i, { description: e.target.value })
                  }
                  className="min-w-0 flex-1 bg-transparent outline-none truncate"
                  placeholder="Item"
                />
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={it.quantity}
                  onChange={(e) =>
                    patchItem(i, {
                      quantity: parseFloat(e.target.value) || 1,
                    })
                  }
                  className="w-10 bg-transparent text-center outline-none text-paper/60"
                />
                <span className="text-paper/40">×</span>
                <input
                  inputMode="decimal"
                  value={
                    it.total_cents != null
                      ? (it.total_cents / 100).toFixed(2)
                      : ""
                  }
                  onChange={(e) => {
                    const v = parseFloat(e.target.value.replace(",", "."));
                    patchItem(i, {
                      total_cents: isNaN(v) ? 0 : Math.round(v * 100),
                    });
                  }}
                  className="money w-20 bg-transparent text-right outline-none"
                  placeholder="0,00"
                />
                <button
                  onClick={() => removeItem(i)}
                  className="ml-1 text-stamp shrink-0"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>

          <button
            onClick={addItem}
            className="mt-2 text-xs text-paper/50 underline underline-offset-2"
          >
            + adicionar item
          </button>

          <div className="dashed-rule my-3" />

          <div className="flex items-center justify-between font-bold">
            <span>TOTAL</span>
            <input
              inputMode="decimal"
              value={
                draft.amount_cents != null
                  ? (draft.amount_cents / 100).toFixed(2)
                  : ""
              }
              onChange={(e) => {
                const v = parseFloat(e.target.value.replace(",", "."));
                patch({ amount_cents: isNaN(v) ? null : Math.round(v * 100) });
              }}
              placeholder="0,00"
              className="money w-28 bg-transparent text-right outline-none"
            />
          </div>

          {draft.location && (
            <p className="mt-2 text-center text-xs text-print-faint">
              📍 {draft.location.address ?? `${draft.location.latitude.toFixed(4)}, ${draft.location.longitude.toFixed(4)}`}
            </p>
          )}
        </div>

        {/* Campos */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <label className="text-xs uppercase tracking-wide text-paper/60">
            Data
            <input
              type="date"
              value={draft.date ?? ""}
              onChange={(e) => patch({ date: e.target.value || null })}
              className="mt-1 w-full rounded-md bg-ink px-2 py-2 text-paper outline-none"
            />
          </label>
          <label className="text-xs uppercase tracking-wide text-paper/60">
            Categoria
            <select
              value={draft.category}
              onChange={(e) => patch({ category: e.target.value })}
              className="mt-1 w-full rounded-md bg-ink px-2 py-2 text-paper outline-none"
            >
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-2 text-xs uppercase tracking-wide text-paper/60">
            Pagamento
            <select
              value={draft.payment_method ?? ""}
              onChange={(e) =>
                patch({ payment_method: e.target.value || null })
              }
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
          {spaces.length > 0 && (
            <label className="col-span-2 text-xs uppercase tracking-wide text-paper/60">
              Espaço
              <select
                value={draft.spaceId ?? ""}
                onChange={(e) =>
                  patch({ spaceId: e.target.value || null })
                }
                className="mt-1 w-full rounded-md bg-ink px-2 py-2 text-paper outline-none"
              >
                <option value="">Meu espaço pessoal</option>
                {spaces.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {/* Perguntas da IA */}
        {draft.questions.length > 0 && (
          <div className="mt-4 space-y-3 rounded-md bg-stamp/15 p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-stamp">
              Antes de salvar, me responde:
            </p>
            {draft.questions.map((q, i) => (
              <label key={i} className="block text-sm">
                {q.q}
                <input
                  value={q.a ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      questions: d.questions.map((x, j) =>
                        j === i ? { ...x, a: e.target.value } : x
                      ),
                    }))
                  }
                  className="mt-1 w-full rounded-md bg-ink px-2 py-2 text-paper outline-none"
                />
              </label>
            ))}
            <p className="text-xs text-paper/60">
              Pode salvar sem responder — fica marcado como pendente.
            </p>
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm font-semibold text-stamp">{error}</p>
        )}

        <button
          onClick={confirm}
          disabled={busy}
          className="mt-4 w-full rounded-xl bg-ok py-4 text-lg font-extrabold text-paper disabled:opacity-50"
        >
          {busy ? "Salvando…" : "Salvar gasto"}
        </button>
      </div>
    </div>
  );
}
