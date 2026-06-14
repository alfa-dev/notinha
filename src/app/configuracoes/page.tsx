import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { UserCategory } from "@/lib/types";
import CategoriesManager from "./CategoriesManager";
import { CATEGORIES } from "@/lib/categories";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_categories")
    .select("*")
    .order("position");

  const userCategories = (data ?? []) as UserCategory[];

  return (
    <main className="mx-auto max-w-lg p-4 pb-12">
      <header className="flex items-baseline justify-between py-2">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Configurações
        </h1>
        <Link
          href="/"
          className="text-sm font-bold underline underline-offset-4"
        >
          ← Gastos
        </Link>
      </header>

      <section className="receipt-edge mt-4 px-5 py-8">
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
  );
}
