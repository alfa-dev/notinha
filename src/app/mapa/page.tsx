import Link from "next/link";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/server";
import type { Expense } from "@/lib/types";
import { formatBRL } from "@/lib/categories";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default async function MapaPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("expenses")
    .select("id, date, description, amount_cents, latitude, longitude, address, merchant, category")
    .not("latitude", "is", null)
    .order("date", { ascending: false })
    .limit(300);

  const expenses = (data ?? []) as Expense[];

  return (
    <main className="mx-auto max-w-lg p-4 pb-12">
      <header className="flex items-baseline justify-between py-2">
        <h1 className="text-2xl font-extrabold tracking-tight">Mapa de gastos</h1>
        <Link
          href="/"
          className="text-sm font-bold underline underline-offset-4"
        >
          ← Gastos
        </Link>
      </header>

      <MapView expenses={expenses} />

      {expenses.length > 0 && (
        <section className="mt-6 space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-paper/70">
            Com localização
          </h2>
          {expenses.map((e) => (
            <div
              key={e.id}
              className="flex items-start justify-between gap-3 rounded-lg bg-ink-soft px-4 py-3"
            >
              <div className="min-w-0">
                <p className="truncate font-semibold text-sm">{e.description}</p>
                <p className="truncate text-xs text-paper/50">
                  {e.address ?? e.merchant ?? `${e.latitude?.toFixed(4)}, ${e.longitude?.toFixed(4)}`}
                </p>
                <p className="text-xs text-paper/40">{e.date}</p>
              </div>
              <span className="money shrink-0 font-bold text-sm">
                {formatBRL(e.amount_cents)}
              </span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
