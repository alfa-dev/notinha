"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOCRQueue } from "./OCRQueue";
import { saveExpense } from "@/app/actions";
import { allCategories, PAYMENT_METHODS } from "@/lib/categories";
import type { UserCategory, Space } from "@/lib/types";

type Props = {
  userCategories?: UserCategory[];
  spaces?: Space[];
};

export default function ReceiptCapture({ userCategories = [], spaces = [] }: Props) {
  const { enqueue, jobs } = useOCRQueue();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"ia" | "manual">("ia");

  // ── IA mode state ──────────────────────────────────────
  const [text, setText] = useState("");
  const [queuing, setQueuing] = useState(false);
  const [queued, setQueued] = useState(false);

  // ── Manual mode state ──────────────────────────────────
  const todayStr = new Date().toISOString().slice(0, 10);
  const [manualDate, setManualDate] = useState(todayStr);
  const [manualAmount, setManualAmount] = useState("");
  const [manualDesc, setManualDesc] = useState("");
  const [manualCat, setManualCat] = useState("alimentacao");
  const [manualPay, setManualPay] = useState("pix");
  const [manualSpace, setManualSpace] = useState("");
  const [manualSaving, setManualSaving] = useState(false);
  const [manualOk, setManualOk] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const isProcessing = jobs.some(
    (j) => j.status === "queued" || j.status === "processing"
  );

  async function getLocation(): Promise<
    { latitude: number; longitude: number; address?: string } | undefined
  > {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(undefined);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          let address: string | undefined;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await res.json();
            address = data.display_name?.split(",").slice(0, 2).join(", ") ?? undefined;
          } catch { /* ignora erro de geocoding */ }
          resolve({ latitude, longitude, address });
        },
        () => resolve(undefined),
        { timeout: 4000, maximumAge: 60000 }
      );
    });
  }

  async function handleCamera() {
    const location = await getLocation();
    sessionStorage.setItem("__notinha_location", location ? JSON.stringify(location) : "");
    fileRef.current?.click();
  }

  async function handleFileSelected(file: File, fromCamera: boolean) {
    setQueuing(true);
    let location: { latitude: number; longitude: number; address?: string } | undefined;
    if (fromCamera) {
      const stored = sessionStorage.getItem("__notinha_location");
      if (stored) {
        try { location = JSON.parse(stored); } catch { /* ignora */ }
        sessionStorage.removeItem("__notinha_location");
      }
    } else {
      try {
        const { default: exifr } = await import("exifr");
        const gps = await exifr.gps(file);
        if (gps?.latitude && gps?.longitude) {
          let address: string | undefined;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${gps.latitude}&lon=${gps.longitude}&format=json`
            );
            const data = await res.json();
            address = data.display_name?.split(",").slice(0, 2).join(", ") ?? undefined;
          } catch { /* ignora */ }
          location = { latitude: gps.latitude, longitude: gps.longitude, address };
        }
      } catch { /* exifr pode não funcionar com todos os formatos */ }
    }
    enqueue({ file, location });
    setQueuing(false);
    setQueued(true);
    setTimeout(() => { setQueued(false); setOpen(false); }, 1200);
  }

  function handleText() {
    if (!text.trim()) return;
    enqueue({ text: text.trim() });
    setText("");
    setQueued(true);
    setTimeout(() => { setQueued(false); setOpen(false); }, 1200);
  }

  async function handleManualSave() {
    const raw = manualAmount.replace(",", ".");
    const cents = Math.round(parseFloat(raw) * 100);
    if (!cents || isNaN(cents) || cents <= 0) {
      setManualError("Informe o valor.");
      return;
    }
    if (!manualDesc.trim()) {
      setManualError("Informe a descrição.");
      return;
    }
    setManualError(null);
    setManualSaving(true);
    try {
      await saveExpense({
        date: manualDate,
        merchant: null,
        description: manualDesc.trim(),
        amount_cents: cents,
        category: manualCat,
        payment_method: manualPay,
        reimburse_to: null,
        receipt_path: null,
        status: "confirmed",
        questions: [],
        notes: null,
        items: [],
        space_id: manualSpace || null,
      });
      setManualOk(true);
      setTimeout(() => {
        setManualOk(false);
        setOpen(false);
        setManualAmount("");
        setManualDesc("");
        setManualDate(todayStr);
        router.refresh();
      }, 1000);
    } catch (e) {
      setManualError(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setManualSaving(false);
    }
  }

  function closeModal() {
    setOpen(false);
    setText("");
    setManualError(null);
  }

  const cats = allCategories(userCategories);

  return (
    <>
      {/* ── FAB ── */}
      <div className="fixed inset-x-0 bottom-16 z-20 mx-auto max-w-lg px-4 pb-2">
        <button
          onClick={() => !isProcessing && setOpen(true)}
          disabled={isProcessing}
          className={`w-full rounded-xl py-4 text-lg font-extrabold text-paper shadow-lg shadow-black/40 transition-all duration-200 ${
            isProcessing
              ? "bg-ink-soft border border-paper/10 cursor-default"
              : "bg-stamp active:scale-[0.99]"
          }`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-paper/30 border-t-paper" />
              Processando…
            </span>
          ) : (
            "+ Anotar gasto"
          )}
        </button>
      </div>

      {/* ── Modal ── */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60">
          <div className="w-full max-w-lg rounded-t-2xl bg-ink-soft">
            {/* Header fixo */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3">
              {/* Tabs */}
              <div className="flex gap-1 rounded-lg bg-ink p-1">
                <button
                  onClick={() => setMode("ia")}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                    mode === "ia" ? "bg-stamp text-paper" : "text-print-faint"
                  }`}
                >
                  📷 Via IA
                </button>
                <button
                  onClick={() => setMode("manual")}
                  className={`rounded-md px-3 py-1.5 text-xs font-bold transition-colors ${
                    mode === "manual" ? "bg-stamp text-paper" : "text-print-faint"
                  }`}
                >
                  ✏️ Manual
                </button>
              </div>
              <button
                onClick={closeModal}
                className="text-sm text-print-faint hover:text-paper transition-colors"
              >
                Fechar
              </button>
            </div>

            {/* Conteúdo scrollável */}
            <div className="overflow-y-auto px-5 pb-6" style={{ maxHeight: "70dvh" }}>
              {/* ── Modo IA ── */}
              {mode === "ia" && (
                <>
                  {queued ? (
                    <div className="py-8 text-center">
                      <p className="text-ok font-bold text-lg">✓ Adicionado à fila!</p>
                      <p className="mt-1 text-sm text-print-faint">Processando em background…</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex gap-2">
                        <button
                          onClick={handleCamera}
                          disabled={queuing}
                          className="flex-1 rounded-xl border-2 border-dashed border-paper/20 py-8 text-center font-bold disabled:opacity-50 hover:border-paper/40 transition-colors"
                        >
                          📷 Câmera
                        </button>
                        <button
                          onClick={() => galleryRef.current?.click()}
                          disabled={queuing}
                          className="flex-1 rounded-xl border-2 border-dashed border-paper/20 py-8 text-center font-bold disabled:opacity-50 hover:border-paper/40 transition-colors"
                        >
                          🖼️ Galeria
                        </button>
                      </div>

                      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f, true); e.target.value = ""; }}
                      />
                      <input ref={galleryRef} type="file" accept="image/*" hidden
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelected(f, false); e.target.value = ""; }}
                      />

                      <p className="my-3 text-center text-xs uppercase tracking-widest text-print-faint">
                        ou descreve em texto
                      </p>

                      <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey && text.trim()) {
                            e.preventDefault();
                            handleText();
                          }
                        }}
                        rows={2}
                        placeholder="ex: almoço no Kilograma, pix, 38 reais"
                        className="w-full rounded-xl bg-ink px-3 py-3 text-paper outline-none placeholder:text-print-faint/50 resize-none"
                      />
                      <button
                        onClick={handleText}
                        disabled={queuing || !text.trim()}
                        className="mt-2 w-full rounded-xl bg-stamp py-3 font-bold text-paper disabled:opacity-40 transition-opacity"
                      >
                        {queuing ? "Enviando…" : "Anotar via IA"}
                      </button>
                    </>
                  )}
                </>
              )}

              {/* ── Modo Manual ── */}
              {mode === "manual" && (
                <>
                  {manualOk ? (
                    <div className="py-8 text-center">
                      <p className="text-ok font-bold text-lg">✓ Gasto salvo!</p>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      {/* Valor + Data em linha */}
                      <div className="flex gap-2">
                        <label className="flex-1">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-print-faint">Valor (R$)</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={manualAmount}
                            onChange={(e) => setManualAmount(e.target.value)}
                            placeholder="0,00"
                            className="mt-1 w-full rounded-xl bg-ink px-3 py-3 text-paper outline-none placeholder:text-print-faint/50 money"
                          />
                        </label>
                        <label className="flex-1">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-print-faint">Data</span>
                          <input
                            type="date"
                            value={manualDate}
                            onChange={(e) => setManualDate(e.target.value)}
                            className="mt-1 w-full rounded-xl bg-ink px-3 py-3 text-paper outline-none"
                          />
                        </label>
                      </div>

                      {/* Descrição */}
                      <label className="block">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-print-faint">Descrição</span>
                        <input
                          type="text"
                          value={manualDesc}
                          onChange={(e) => setManualDesc(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") handleManualSave(); }}
                          placeholder="ex: Almoço no restaurante"
                          className="mt-1 w-full rounded-xl bg-ink px-3 py-3 text-paper outline-none placeholder:text-print-faint/50"
                        />
                      </label>

                      {/* Categoria + Pagamento */}
                      <div className="flex gap-2">
                        <label className="flex-1">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-print-faint">Categoria</span>
                          <select
                            value={manualCat}
                            onChange={(e) => setManualCat(e.target.value)}
                            className="mt-1 w-full rounded-xl bg-ink px-3 py-3 text-paper outline-none"
                          >
                            {cats.map((c) => (
                              <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex-1">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-print-faint">Pagamento</span>
                          <select
                            value={manualPay}
                            onChange={(e) => setManualPay(e.target.value)}
                            className="mt-1 w-full rounded-xl bg-ink px-3 py-3 text-paper outline-none"
                          >
                            {PAYMENT_METHODS.map((p) => (
                              <option key={p.id} value={p.id}>{p.label}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      {/* Espaço (se houver) */}
                      {spaces.length > 0 && (
                        <label className="block">
                          <span className="text-[10px] font-semibold uppercase tracking-widest text-print-faint">Espaço</span>
                          <select
                            value={manualSpace}
                            onChange={(e) => setManualSpace(e.target.value)}
                            className="mt-1 w-full rounded-xl bg-ink px-3 py-3 text-paper outline-none"
                          >
                            <option value="">Meu espaço pessoal</option>
                            {spaces.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </label>
                      )}

                      {manualError && (
                        <p className="text-sm font-semibold text-stamp">{manualError}</p>
                      )}

                      <button
                        onClick={handleManualSave}
                        disabled={manualSaving}
                        className="w-full rounded-xl bg-stamp py-4 text-lg font-extrabold text-paper disabled:opacity-50 transition-opacity"
                      >
                        {manualSaving ? "Salvando…" : "Salvar gasto"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
