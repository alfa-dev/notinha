import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/types";

/** Garante que o usuário autenticado é admin. Redireciona se não for. */
export async function requireAdmin(): Promise<{
  userId: string;
  profile: UserProfile;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") redirect("/dashboard");

  return { userId: user.id, profile: profile as UserProfile };
}

/** Retorna o perfil do usuário atual (null se não existir) */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as UserProfile) ?? null;
}

export const TIER_LIMITS: Record<string, number | null> = {
  free: 1,
  plus: 5,
  pro: null, // ilimitado
};

export const TIER_LABELS: Record<string, string> = {
  free: "Free",
  plus: "Plus",
  pro: "Pro",
};
