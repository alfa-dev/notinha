"use client";

import { useState } from "react";
import type { UserTier } from "@/lib/types";

const PLANS = [
  {
    id: "free" as UserTier,
    name: "Free",
    price: "Grátis",
    period: "",
    features: [
      "1 nota via foto/OCR por dia",
      "Gastos manuais (texto) ilimitados",
      "Lista de compras com IA",
      "Visualizações e filtros",
    ],
    cta: "Plano atual",
    highlight: false,
  },
  {
    id: "plus" as UserTier,
    name: "Plus",
    price: "R$ 15",
    period: "/mês",
    features: [
      "5 notas via foto/OCR por dia",
      "Gastos manuais ilimitados",
      "Espaços compartilhados",
      "Importação de fatura CSV",
      "Mapa de gastos com GPS",
    ],
    cta: "Assinar Plus",
    highlight: true,
  },
  {
    id: "pro" as UserTier,
    name: "Pro",
    price: "R$ 39",
    period: "/mês",
    features: [
      "Notas via foto/OCR ilimitadas",
      "Tudo do Plus",
      "Importação por foto de fatura",
      "Categorias personalizadas ilimitadas",
      "Suporte prioritário",
    ],
    cta: "Assinar Pro",
    highlight: false,
  },
];

export default function PlansClient({
  currentTier,
  hasSubscription,
}: {
  currentTier: UserTier;
  hasSubscription: boolean;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function subscribe(tier: UserTier) {
    if (tier === "free" || tier === currentTier) return;
    setLoading(tier);
    setError(null);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar sessão");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
      setLoading(null);
    }
  }

  async function openPortal() {
    setLoading("portal");
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
      setLoading(null);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      {error && (
        <p className="rounded-md bg-stamp/15 px-4 py-2 text-sm text-stamp">
          {error}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = plan.id === currentTier;
          const isUpgrade =
            plan.id !== "free" &&
            (currentTier === "free" ||
              (currentTier === "plus" && plan.id === "pro"));

          return (
            <div
              key={plan.id}
              className={`receipt-edge px-5 py-6 ${
                plan.highlight ? "ring-2 ring-ok/50" : ""
              }`}
            >
              {plan.highlight && (
                <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-ok">
                  Mais popular
                </p>
              )}
              <p className="text-center text-[11px] uppercase tracking-[0.25em] text-print-faint">
                {plan.name}
              </p>
              <p className="money mt-2 text-center text-3xl font-extrabold">
                {plan.price}
                <span className="text-sm font-normal text-print-faint">
                  {plan.period}
                </span>
              </p>

              <div className="dashed-rule my-4" />

              <ul className="space-y-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-ok shrink-0">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-5">
                {isCurrent ? (
                  <div className="w-full rounded-md bg-ink px-4 py-2 text-center text-sm font-bold text-paper/50">
                    Plano atual
                  </div>
                ) : isUpgrade ? (
                  <button
                    onClick={() => subscribe(plan.id)}
                    disabled={loading === plan.id}
                    className={`w-full rounded-md py-2 text-sm font-bold text-paper disabled:opacity-50 ${
                      plan.highlight ? "bg-ok" : "bg-paper text-print"
                    }`}
                  >
                    {loading === plan.id ? "Aguarde…" : plan.cta}
                  </button>
                ) : (
                  <div className="w-full rounded-md bg-ink px-4 py-2 text-center text-sm text-paper/40">
                    {plan.id === "free" ? "Incluído" : "—"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {hasSubscription && (
        <div className="text-center mt-4">
          <button
            onClick={openPortal}
            disabled={loading === "portal"}
            className="text-sm text-paper/60 underline underline-offset-2 disabled:opacity-50"
          >
            {loading === "portal" ? "Abrindo…" : "Gerenciar assinatura (cancelar, trocar plano)"}
          </button>
        </div>
      )}

      <p className="text-center text-xs text-paper/40 mt-4">
        Pagamento processado com segurança pelo Stripe. Cancele quando quiser.
      </p>
    </div>
  );
}
