import { createClient } from "@/lib/supabase/server";
import type { Space, SpaceInvite } from "@/lib/types";
import SpacesManager from "./SpacesManager";
import AppHeader from "@/components/AppHeader";

export default async function EspacosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [spacesRes, invitesRes] = await Promise.all([
    supabase.from("spaces").select("*, space_members(*)"),
    supabase
      .from("space_invites")
      .select("*")
      .is("used_by", null)
      .order("created_at", { ascending: false }),
  ]);

  const spaces = (spacesRes.data ?? []) as Space[];
  const invites = (invitesRes.data ?? []) as SpaceInvite[];

  return (
    <>
      <AppHeader title="Espaços compartilhados" />
      <main className="mx-auto max-w-lg p-4 pb-44">
      <p className="mt-2 text-sm text-print-faint">
        Crie um espaço, convide alguém e vejam os gastos juntos.
      </p>

      <SpacesManager
        initialSpaces={spaces}
        initialInvites={invites}
        currentUserId={user?.id ?? ""}
      />
    </main>
    </>
  );
}
