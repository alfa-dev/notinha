"use client";

import { useRouter, useSearchParams } from "next/navigation";

export default function PeriodSelector({ current }: { current: string }) {
  const router = useRouter();
  const params = useSearchParams();

  function go(p: string) {
    const sp = new URLSearchParams(params.toString());
    sp.set("periodo", p);
    router.push(`/?${sp.toString()}`);
  }

  const isTudo = current === "tudo";

  // Navega para mês anterior/próximo relativo ao mês atual exibido
  function prevMonth() {
    if (isTudo) return;
    const [y, m] = current.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    go(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  function nextMonth() {
    if (isTudo) return;
    const [y, m] = current.split("-").map(Number);
    const d = new Date(y, m, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const now = new Date();
    const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    if (key <= nowKey) go(key);
  }

  const label = isTudo
    ? "Todo o período"
    : (() => {
        const [y, m] = current.split("-").map(Number);
        return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
          month: "long",
          year: "numeric",
        });
      })();

  const now = new Date();
  const nowKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isCurrentMonth = current === nowKey;

  return (
    <div className="flex items-center justify-between gap-2 mt-2">
      <button
        onClick={prevMonth}
        disabled={isTudo}
        className="rounded-md bg-ink-soft px-3 py-1 text-sm font-bold disabled:opacity-30"
        aria-label="Mês anterior"
      >
        ‹
      </button>

      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold capitalize">{label}</span>
        {!isTudo && !isCurrentMonth && (
          <button
            onClick={() => go(nowKey)}
            className="rounded-full bg-ink-soft px-2 py-0.5 text-xs text-paper/60"
          >
            Hoje
          </button>
        )}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={nextMonth}
          disabled={isTudo || isCurrentMonth}
          className="rounded-md bg-ink-soft px-3 py-1 text-sm font-bold disabled:opacity-30"
          aria-label="Próximo mês"
        >
          ›
        </button>
        <button
          onClick={() => go(isTudo ? nowKey : "tudo")}
          className={`rounded-md px-2 py-1 text-xs font-bold ${
            isTudo ? "bg-paper text-print" : "bg-ink-soft text-paper/60"
          }`}
          title="Ver todo o período"
        >
          Tudo
        </button>
      </div>
    </div>
  );
}
