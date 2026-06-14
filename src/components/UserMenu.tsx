"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UserMenu({ email }: { email: string }) {
  const router = useRouter();
  const displayName = email.split("@")[0];

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-print-faint hidden sm:inline truncate max-w-[120px]">
        {displayName}
      </span>
      <button
        onClick={signOut}
        className="rounded-md px-2.5 py-1.5 text-xs font-semibold text-print-faint hover:text-paper hover:bg-ink-raise transition-colors"
      >
        Sair
      </button>
    </div>
  );
}
