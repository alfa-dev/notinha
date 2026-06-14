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
  space_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
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

export async function updateExpense(
  id: string,
  input: Partial<SaveExpenseInput>
) {
  const supabase = await createClient();
  const { items, ...patch } = input;

  const { error } = await supabase
    .from("expenses")
    .update(patch)
    .eq("id", id);
  if (error) throw new Error(error.message);

  if (items !== undefined) {
    await supabase.from("expense_items").delete().eq("expense_id", id);
    if (items.length > 0) {
      const { error: itemsError } = await supabase.from("expense_items").insert(
        items.map((item, idx) => ({
          expense_id: id,
          description: item.description,
          quantity: item.quantity,
          unit_cents: item.unit_cents,
          total_cents: item.total_cents,
          position: idx,
        }))
      );
      if (itemsError) throw new Error(itemsError.message);
    }
  }

  revalidatePath("/");
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

// ============ Categorias do usuário ============

export async function addUserCategory(label: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: existing } = await supabase
    .from("user_categories")
    .select("position")
    .eq("user_id", user.id)
    .order("position", { ascending: false })
    .limit(1)
    .single();

  const nextPos = (existing?.position ?? -1) + 1;

  const { error } = await supabase.from("user_categories").insert({
    user_id: user.id,
    label: label.trim(),
    position: nextPos,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/configuracoes");
}

export async function deleteUserCategory(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("user_categories").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/");
  revalidatePath("/configuracoes");
}

// ============ Espaços compartilhados ============

export async function createSpace(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data, error } = await supabase
    .from("spaces")
    .insert({ name: name.trim(), owner_id: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Dono também entra como membro
  await supabase.from("space_members").insert({
    space_id: data.id,
    user_id: user.id,
    display_name: user.email?.split("@")[0] ?? "Dono",
  });

  revalidatePath("/espacos");
  revalidatePath("/");
  return data.id;
}

export async function deleteSpace(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("spaces").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/espacos");
  revalidatePath("/");
}

export async function leaveSpace(spaceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { error } = await supabase
    .from("space_members")
    .delete()
    .eq("space_id", spaceId)
    .eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/espacos");
  revalidatePath("/");
}

export async function removeMemberFromSpace(spaceId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("space_members")
    .delete()
    .eq("space_id", spaceId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
  revalidatePath("/espacos");
}

// ============ Convites ============

export async function createInvite(spaceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data, error } = await supabase
    .from("space_invites")
    .insert({ space_id: spaceId, created_by: user.id })
    .select("code")
    .single();
  if (error) throw new Error(error.message);

  revalidatePath("/espacos");
  return data.code as string;
}

export async function deleteInvite(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("space_invites").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/espacos");
}

export async function acceptInvite(code: string, displayName: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const { data: invite, error: inviteErr } = await supabase
    .from("space_invites")
    .select("id, space_id, used_by, expires_at")
    .eq("code", code.toUpperCase())
    .single();

  if (inviteErr || !invite) throw new Error("Convite não encontrado");
  if (invite.used_by) throw new Error("Este convite já foi usado");
  if (invite.expires_at && new Date(invite.expires_at) < new Date())
    throw new Error("Convite expirado");

  // Verifica se já é membro
  const { data: existing } = await supabase
    .from("space_members")
    .select("user_id")
    .eq("space_id", invite.space_id)
    .eq("user_id", user.id)
    .single();

  if (existing) throw new Error("Você já é membro desse espaço");

  // Entra no espaço
  const { error: memberErr } = await supabase.from("space_members").insert({
    space_id: invite.space_id,
    user_id: user.id,
    display_name: displayName.trim() || (user.email?.split("@")[0] ?? "Membro"),
  });
  if (memberErr) throw new Error(memberErr.message);

  // Marca convite como usado
  await supabase
    .from("space_invites")
    .update({ used_by: user.id })
    .eq("id", invite.id);

  revalidatePath("/espacos");
  revalidatePath("/");
  return invite.space_id as string;
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
