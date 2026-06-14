"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { requireAdmin } from "@/lib/admin";
import type { UserTier } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function adminSetTier(userId: string, tier: UserTier) {
  await requireAdmin();
  const service = createServiceClient();
  await service
    .from("user_profiles")
    .update({ tier, updated_at: new Date().toISOString() })
    .eq("id", userId);
  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${userId}`);
}

export async function adminSetSuspended(userId: string, suspended: boolean) {
  await requireAdmin();
  const service = createServiceClient();
  await service
    .from("user_profiles")
    .update({ suspended, updated_at: new Date().toISOString() })
    .eq("id", userId);
  revalidatePath("/admin/usuarios");
  revalidatePath(`/admin/usuarios/${userId}`);
}

export async function adminResetOCR(userId: string) {
  await requireAdmin();
  const service = createServiceClient();
  await service
    .from("user_profiles")
    .update({ ocr_count_today: 0, updated_at: new Date().toISOString() })
    .eq("id", userId);
  revalidatePath(`/admin/usuarios/${userId}`);
}
