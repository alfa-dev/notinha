"use client";

import { useRef, useState, useTransition } from "react";
import { saveExpense } from "@/app/actions";
import { formatBRL } from "@/lib/categories";

type ImportRow = {
  date: string;
  description: string;
  amount_cents: number;
  selected: boolean;
  duplicate?: boolean;
};

type Tab = "csv" | "foto";

export default function ImportClient() {
  const [tab, setTab] = useState<Tab>("csv");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [step, setStep] = useState<"idle" | "preview" | "done">("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  // ─── CSV ────────────────────────────────────────────────────────────────────

  function parseCSV(text: string): ImportRow[] {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) throw new Error("Arquivo CSV vazio ou inválido");

    const header = lines[0].split(/[;,]/).map((h) =>
      h.toLowerCase().replace(/["']/g, "").trim()
    );

    // Tenta detectar colunas de data, descrição e valor
    const dateIdx = header.findIndex((h) =>
      /data|date|dia|vencimento/.test(h)
    );
    const descIdx = header.findIndex((h) =>
      /descri|title|nome|estabelecimento|lançamento/.test(h)
    );
    const amtIdx = header.findIndex((h) =>
      /valor|amount|value|total|vl\.?/.test(h)
    );

    if (dateIdx === -1 || descIdx === -1 || amtIdx === -1) {
      throw new Error(
        `Não consegui identificar as colunas. Colunas encontradas: ${header.join(", ")}. Esperado: data, descrição e valor.`
      );
    }

    const result: ImportRow[] = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[;,]/).map((c) => c.replace(/["']/g, "").trim());
      if (cols.length <= Math.max(dateIdx, descIdx, amtIdx)) continue;

      const rawDate = cols[dateIdx];
      const rawDesc = cols[descIdx];
      const rawAmt = cols[amtIdx];

      if (!rawDate || !rawDesc || !rawAmt) continue;

      // Parse date: dd/mm/yyyy or yyyy-mm-dd
      let date = "";
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(rawDate)) {
        const [d, m, y] = rawDate.split("/");
        date = `${y}-${m}-${d}`;
      } else if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
        date = rawDate.slice(0, 10);
      } else {
        continue; // ignora linha com data inválida
      }

      // Parse amount: 1.234,56 or 1234.56 or -1234,56
      const cleaned = rawAmt
        .replace(/[R$\s]/g, "")
        .replace(/\./g, "")
        .replace(",", ".");
      const value = parseFloat(cleaned);
      if (isNaN(value) || value <= 0) continue;

      result.push({
        date,
        description: rawDesc,
        amount_cents: Math.round(Math.abs(value) * 100),
        selected: true,
      });
    }

    return result;
  }

  async function handleCSVFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      if (parsed.length === 0) throw new Error("Nenhuma transação encontrada no CSV");

      // Checa duplicatas (busca gastos existentes nas datas do CSV)
      const minDate = parsed.reduce(
        (mn, r) => (r.date < mn ? r.date : mn),
        parsed[0].date
      );
      const maxDate = parsed.reduce(
        (mx, r) => (r.date > mx ? r.date : mx),
        parsed[0].date
      );

      const res = await fetch(
        `/api/expenses-range?start=${minDate}&end=${maxDate}`
      );
      const existing: { date: string; amount_cents: number }[] =
        res.ok ? await res.json() : [];

      const existingSet = new Set(
        existing.map((e) => `${e.date}:${e.amount_cents}`)
      );

      const withDuplicates = parsed.map((r) => ({
        ...r,
        duplicate: existingSet.has(`${r.date}:${r.amount_cents}`),
        selected: !existingSet.has(`${r.date}:${r.amount_cents}`),
      }));

      setRows(withDuplicates);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao ler CSV");
    } finally {
      setBusy(false);
    }
  }

  // ─── Foto da fatura ─────────────────────────────────────────────────────────

  async function handleStatementImage(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("image", file);

      const res = await fetch("/api/parse-statement", {
        method: "POST",
        body: form,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao ler fatura");

      const parsed: ImportRow[] = (
        json.transactions as { date: string; description: string; amount_cents: number }[]
      ).map((t) => ({ ...t, selected: true }));

      setRows(parsed);
      setStep("preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao processar imagem");
    } finally {
      setBusy(false);
    }
  }

  // ─── Import selecionados ─────────────────────────────────────────────────────

  async function importSelected() {
    const toImport = rows.filter((r) => r.selected);
    if (toImport.length === 0) return;

    setBusy(true);
    setError(null);
    let count = 0;

    try {
      for (const row of toImport) {
        await saveExpense({
          date: row.date,
          merchant: null,
          description: row.description,
          amount_cents: row.amount_cents,
          category: "outros",
          payment_method: "rico",
          reimburse_to: null,
          receipt_path: null,
          status: "confirmed",
          questions: [],
          notes: "Importado de fatura",
          items: [],
        });
        count++;
      }
      setImported(count);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao importar");
    } finally {
      setBusy(false);
    }
  }

  if (step === "done") {
    return (
      <div className="receipt-edge mt-6 px-5 py-8 text-center">
        <p className="text-4xl font-bold text-ok">✓</p>
        <p className="mt-2 font-bold">
          {imported} {imported === 1 ? "gasto importado" : "gastos importados"}!
        </p>
        <button
          onClick={() => {
            setStep("idle");
            setRows([]);
            setImported(0);
          }}
          className="mt-4 text-sm underline text-paper/60"
        >
          Importar mais
        </button>
        <br />
        <a href="/dashboard" className="mt-2 inline-block text-sm underline">
          Ver gastos →
        </a>
      </div>
    );
  }

  if (step === "preview") {
    const selectedCount = rows.filter((r) => r.selected).length;
    const total = rows
      .filter((r) => r.selected)
      .reduce((s, r) => s + r.amount_cents, 0);

    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">
            {rows.length} {rows.length === 1 ? "transação" : "transações"} encontradas
          </p>
          <button
            onClick={() => {
              setRows((prev) =>
                prev.map((r) => ({ ...r, selected: !r.duplicate }))
              );
            }}
            className="text-xs underline text-paper/60"
          >
            Resetar seleção
          </button>
        </div>

        <div className="rounded-lg bg-ink-soft overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            {rows.map((row, i) => (
              <label
                key={i}
                className={`flex items-start gap-3 px-3 py-2 text-sm border-b border-paper/10 last:border-0 cursor-pointer ${
                  row.duplicate ? "opacity-60" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={row.selected}
                  onChange={(e) =>
                    setRows((prev) =>
                      prev.map((r, j) =>
                        j === i ? { ...r, selected: e.target.checked } : r
                      )
                    )
                  }
                  className="mt-0.5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{row.description}</p>
                  <p className="text-xs text-paper/50">
                    {row.date}{" "}
                    {row.duplicate && (
                      <span className="text-stamp">· possível duplicata</span>
                    )}
                  </p>
                </div>
                <span className="money shrink-0 text-xs">
                  {formatBRL(row.amount_cents)}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between text-sm font-semibold">
          <span>
            {selectedCount} selecionados · {formatBRL(total)}
          </span>
          <button
            onClick={() => {
              setStep("idle");
              setRows([]);
            }}
            className="text-paper/60 underline"
          >
            Cancelar
          </button>
        </div>

        {error && <p className="text-sm text-stamp">{error}</p>}

        <button
          onClick={importSelected}
          disabled={busy || selectedCount === 0}
          className="w-full rounded-xl bg-ok py-4 text-lg font-extrabold text-paper disabled:opacity-50"
        >
          {busy
            ? "Importando…"
            : `Importar ${selectedCount} ${selectedCount === 1 ? "gasto" : "gastos"}`}
        </button>
      </div>
    );
  }

  // Idle state
  return (
    <div className="mt-4 space-y-4">
      {/* Tabs */}
      <div className="flex gap-1">
        {(["csv", "foto"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setError(null);
            }}
            className={`flex-1 rounded-full py-2 text-sm font-bold transition-colors ${
              tab === t ? "bg-paper text-print" : "bg-ink-soft text-paper/60"
            }`}
          >
            {t === "csv" ? "📊 CSV" : "📷 Foto da fatura"}
          </button>
        ))}
      </div>

      {tab === "csv" && (
        <div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="w-full rounded-xl border-2 border-dashed border-paper/30 py-12 text-center font-bold disabled:opacity-50"
          >
            {busy ? "Lendo…" : "📂 Selecionar arquivo CSV"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleCSVFile(f);
              e.target.value = "";
            }}
          />
          <p className="mt-2 text-xs text-paper/50 text-center">
            Colunas reconhecidas: data, descrição e valor. Separador ; ou ,
          </p>
        </div>
      )}

      {tab === "foto" && (
        <div>
          <button
            onClick={() => imageRef.current?.click()}
            disabled={busy}
            className="w-full rounded-xl border-2 border-dashed border-paper/30 py-12 text-center font-bold disabled:opacity-50"
          >
            {busy ? "Lendo com IA…" : "📷 Selecionar foto da fatura"}
          </button>
          <input
            ref={imageRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleStatementImage(f);
              e.target.value = "";
            }}
          />
          <p className="mt-2 text-xs text-paper/50 text-center">
            Foto do extrato ou print do app do banco
          </p>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-stamp/15 px-4 py-2 text-sm text-stamp">
          {error}
        </p>
      )}
    </div>
  );
}
