import { createClient } from "@/lib/supabase/server";
import type { UserCategory } from "@/lib/types";
import CategoriesManager from "./CategoriesManager";
import AppHeader from "@/components/AppHeader";
import { CATEGORIES } from "@/lib/categories";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_categories")
    .select("*")
    .order("position");

  const userCategories = (data ?? []) as UserCategory[];

  return (
    <>
      <AppHeader title="Configurações" />
      <main className="mx-auto max-w-lg p-4 pb-12">
      <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-ink-soft mt-4 px-5 py-6">
        <p className="text-center text-[11px] tracking-[0.3em] uppercase text-print-faint mb-4">
          Categorias padrão
        </p>
        <ul className="space-y-1 text-sm">
          {CATEGORIES.map((c) => (
            <li key={c.id} className="flex justify-between text-paper/70">
              <span>{c.label}</span>
              <span className="text-paper/40 text-xs">padrão</span>
            </li>
          ))}
        </ul>

        <div className="dashed-rule my-5" />

        <p className="text-center text-[11px] tracking-[0.3em] uppercase text-print-faint mb-4">
          Suas categorias
        </p>
        <CategoriesManager initialCategories={userCategories} />
      </section>
    </main>
    </>
  );
}
