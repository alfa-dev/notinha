import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { ShoppingItem } from "@/lib/types";
import ShoppingList from "@/components/ShoppingList";

export default async function ListaPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("shopping_items")
    .select("*")
    .order("checked", { ascending: true })
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <main className="mx-auto max-w-lg p-4 pb-12">
      <header className="flex items-baseline justify-between py-2">
        <h1 className="text-2xl font-extrabold tracking-tight">Lista de compras</h1>
        <Link href="/" className="text-sm font-bold underline underline-offset-4">
          ← Gastos
        </Link>
      </header>

      <ShoppingList initialItems={(data ?? []) as ShoppingItem[]} />
    </main>
  );
}
