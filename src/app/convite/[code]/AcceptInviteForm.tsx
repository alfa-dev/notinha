"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { acceptInvite } from "@/app/actions";

export default function AcceptInviteForm({
  code,
  defaultName,
}: {
  code: string;
  defaultName: string;
}) {
  const [displayName, setDisplayName] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      await acceptInvite(code, displayName);
      router.push("/espacos");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao aceitar convite");
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <label className="block text-xs uppercase tracking-wide text-paper/60">
        Seu nome no espaço
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Como você quer ser chamado"
          className="mt-1 w-full rounded-md bg-ink-soft px-3 py-3 text-paper outline-none placeholder:text-paper/30"
        />
      </label>

      {error && (
        <p className="rounded-md bg-stamp/15 px-4 py-2 text-sm text-stamp">
          {error}
        </p>
      )}

      <button
        onClick={accept}
        disabled={busy || !displayName.trim()}
        className="w-full rounded-xl bg-ok py-4 text-lg font-extrabold text-paper disabled:opacity-50"
      >
        {busy ? "Entrando…" : "Entrar no espaço"}
      </button>

      <a
        href="/"
        className="block text-center text-sm text-paper/60 underline underline-offset-2"
      >
        Cancelar
      </a>
    </div>
  );
}
