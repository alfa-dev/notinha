import { createClient } from "@/lib/supabase/server";
import type { UserCategory } from "@/lib/types";
import CategoriesManager from "./CategoriesManager";
import DefaultCategoriesManager from "./DefaultCategoriesManager";
import AppHeader from "@/components/AppHeader";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_categories")
    .select("*")
    .order("position");

  const all = (data ?? []) as UserCategory[];
  const overrides = all.filter((c) => c.default_category_id);
  const custom = all.filter((c) => !c.default_category_id);

  return (
    <>
      <AppHeader title="Configurações" />
      <main className="mx-auto max-w-lg p-4 pb-12">
        <section className="rounded-2xl border border-[rgba(255,255,255,0.08)] bg-ink-soft mt-4 px-5 py-6">
          <p className="text-center text-[11px] tracking-[0.3em] uppercase text-print-faint mb-4">
            Categorias padrão
          </p>
          <DefaultCategoriesManager overrides={overrides} />

          <div className="dashed-rule my-5" />

          <p className="text-center text-[11px] tracking-[0.3em] uppercase text-print-faint mb-4">
            Suas categorias
          </p>
          <CategoriesManager initialCategories={custom} />
        </section>
      </main>
    </>
  );
}
