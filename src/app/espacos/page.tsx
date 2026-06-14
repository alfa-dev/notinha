import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Space, SpaceInvite } from "@/lib/types";
import SpacesManager from "./SpacesManager";

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
    <main className="mx-auto max-w-lg p-4 pb-12">
      <header className="flex items-baseline justify-between py-2">
        <h1 className="text-2xl font-extrabold tracking-tight">
          Espaços compartilhados
        </h1>
        <Link
          href="/"
          className="text-sm font-bold underline underline-offset-4"
        >
          ← Gastos
        </Link>
      </header>

      <p className="mt-2 text-sm text-paper/60">
        Crie um espaço, convide alguém e vejam os gastos juntos.
      </p>

      <SpacesManager
        initialSpaces={spaces}
        initialInvites={invites}
        currentUserId={user?.id ?? ""}
      />
    </main>
  );
}
