"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ExpenseItem, PendingQuestion } from "@/lib/types";

type SaveExpenseInput = {
  date: string;
  merchant: string | null;
  description: string;
  amount_cents: number;
  category: string;
  payment_method: string;
  reimburse_to: string | null;
  receipt_path: string | null;
  status: "confirmed" | "pending_review";
  questions: PendingQuestion[];
  notes: string | null;
  items: ExpenseItem[];
};

export async function saveExpense(input: SaveExpenseInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { items, ...expense } = input;

  const { data, error } = await supabase
    .from("expenses")
    .insert({ ...expense, user_id: user.id })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  if (items.length > 0) {
    const { error: itemsError } = await supabase.from("expense_items").insert(
      items.map((item, idx) => ({
        expense_id: data.id,
        description: item.description,
        quantity: item.quantity,
        unit_cents: item.unit_cents,
        total_cents: item.total_cents,
        position: idx,
      }))
    );
    if (itemsError) throw new Error(itemsError.message);
  }

  revalidatePath("/");
  return data.id;
}

export async function deleteExpense(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function resolveQuestions(
  id: string,
  questions: PendingQuestion[],
  patch: Partial<{
    date: string;
    category: string;
    payment_method: string;
    reimburse_to: string | null;
    amount_cents: number;
  }>
) {
  const supabase = await createClient();
  const allAnswered = questions.every((q) => q.a && q.a.trim() !== "");

  const { error } = await supabase
    .from("expenses")
    .update({
      ...patch,
      questions,
      status: allAnswered ? "confirmed" : "pending_review",
    })
    .eq("id", id);

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

// ============ Lista de compras ============

export async function addShoppingItem(name: string, quantity: string | null) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { error } = await supabase.from("shopping_items").insert({
    user_id: user.id,
    name,
    quantity,
    source: "manual",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/lista");
}

export async function toggleShoppingItem(id: string, checked: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shopping_items")
    .update({ checked })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/lista");
}

export async function updateShoppingItem(
  id: string,
  patch: Partial<{ name: string; quantity: string | null; note: string | null }>
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("shopping_items")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/lista");
}

export async function deleteShoppingItem(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("shopping_items").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/lista");
}

export async function clearChecked() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { error } = await supabase
    .from("shopping_items")
    .delete()
    .eq("user_id", user.id)
    .eq("checked", true);
  if (error) throw new Error(error.message);
  revalidatePath("/lista");
}
