"use client";

import { useState, useTransition } from "react";
import {
  createSpace,
  deleteSpace,
  leaveSpace,
  createInvite,
  deleteInvite,
  removeMemberFromSpace,
} from "@/app/actions";
import type { Space, SpaceInvite } from "@/lib/types";
import QRCode from "./QRCode";

export default function SpacesManager({
  initialSpaces,
  initialInvites,
  currentUserId,
}: {
  initialSpaces: Space[];
  initialInvites: SpaceInvite[];
  currentUserId: string;
}) {
  const [spaces, setSpaces] = useState(initialSpaces);
  const [invites, setInvites] = useState(initialInvites);
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [expandedInvite, setExpandedInvite] = useState<string | null>(null);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    startTransition(async () => {
      try {
        await createSpace(name);
        setNewName("");
        window.location.reload();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao criar espaço");
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Apagar este espaço? Todos os gastos compartilhados serão desvinculados."))
      return;
    startTransition(async () => {
      try {
        await deleteSpace(id);
        setSpaces((prev) => prev.filter((s) => s.id !== id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao apagar");
      }
    });
  }

  async function handleLeave(id: string) {
    if (!confirm("Sair deste espaço?")) return;
    startTransition(async () => {
      try {
        await leaveSpace(id);
        setSpaces((prev) => prev.filter((s) => s.id !== id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao sair");
      }
    });
  }

  async function handleRemoveMember(spaceId: string, userId: string) {
    if (!confirm("Remover este membro?")) return;
    startTransition(async () => {
      try {
        await removeMemberFromSpace(spaceId, userId);
        setSpaces((prev) =>
          prev.map((s) =>
            s.id === spaceId
              ? {
                  ...s,
                  space_members: (s.space_members ?? []).filter(
                    (m) => m.user_id !== userId
                  ),
                }
              : s
          )
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao remover membro");
      }
    });
  }

  async function handleCreateInvite(spaceId: string) {
    setError(null);
    startTransition(async () => {
      try {
        const code = await createInvite(spaceId);
        const newInvite: SpaceInvite = {
          id: crypto.randomUUID(),
          space_id: spaceId,
          code,
          created_by: currentUserId,
          used_by: null,
          expires_at: null,
          created_at: new Date().toISOString(),
        };
        setInvites((prev) => [newInvite, ...prev]);
        setExpandedInvite(newInvite.id);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao gerar convite");
      }
    });
  }

  async function handleDeleteInvite(id: string) {
    startTransition(async () => {
      try {
        await deleteInvite(id);
        setInvites((prev) => prev.filter((i) => i.id !== id));
        if (expandedInvite === id) setExpandedInvite(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao revogar convite");
      }
    });
  }

  const inviteUrl = (code: string) =>
    `${typeof window !== "undefined" ? window.location.origin : ""}/convite/${code}`;

  return (
    <div className="mt-4 space-y-4">
      {error && (
        <p className="rounded-md bg-stamp/15 px-4 py-2 text-sm text-stamp">
          {error}
        </p>
      )}

      {spaces.length === 0 && (
        <div className="receipt-edge px-5 py-8 text-center text-sm text-print-faint">
          Nenhum espaço ainda. Cria um abaixo!
        </div>
      )}

      {spaces.map((space) => {
        const isOwner = space.owner_id === currentUserId;
        const spaceInvites = invites.filter((i) => i.space_id === space.id);

        return (
          <div key={space.id} className="receipt-edge px-5 py-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-bold">{space.name}</p>
                <p className="text-xs text-print-faint mt-0.5">
                  {isOwner ? "Você é o dono" : "Membro"}
                </p>
              </div>
              {isOwner ? (
                <button
                  onClick={() => handleDelete(space.id)}
                  disabled={isPending}
                  className="text-xs text-stamp underline"
                >
                  Apagar
                </button>
              ) : (
                <button
                  onClick={() => handleLeave(space.id)}
                  disabled={isPending}
                  className="text-xs text-paper/60 underline"
                >
                  Sair
                </button>
              )}
            </div>

            <div className="dashed-rule my-4" />

            {/* Membros */}
            <p className="text-[11px] uppercase tracking-widest text-print-faint mb-2">
              Membros ({(space.space_members ?? []).length})
            </p>
            <ul className="space-y-1 mb-4">
              {(space.space_members ?? []).map((m) => (
                <li
                  key={m.user_id}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {m.display_name ?? m.user_id.slice(0, 8)}
                    {m.user_id === currentUserId && (
                      <span className="ml-1 text-xs text-print-faint">(você)</span>
                    )}
                  </span>
                  {isOwner && m.user_id !== currentUserId && (
                    <button
                      onClick={() =>
                        handleRemoveMember(space.id, m.user_id)
                      }
                      disabled={isPending}
                      className="text-xs text-stamp underline"
                    >
                      Remover
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {/* Convites */}
            {isOwner && (
              <>
                <p className="text-[11px] uppercase tracking-widest text-print-faint mb-2">
                  Convites ativos ({spaceInvites.length})
                </p>
                {spaceInvites.map((inv) => (
                  <div
                    key={inv.id}
                    className="mb-2 rounded-md bg-ink px-3 py-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-sm font-bold tracking-widest">
                        {inv.code}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setExpandedInvite(
                              expandedInvite === inv.id ? null : inv.id
                            )
                          }
                          className="text-xs text-paper/60 underline"
                        >
                          QR
                        </button>
                        <button
                          onClick={() =>
                            navigator.clipboard.writeText(inviteUrl(inv.code))
                          }
                          className="text-xs text-paper/60 underline"
                        >
                          Copiar link
                        </button>
                        <button
                          onClick={() => handleDeleteInvite(inv.id)}
                          disabled={isPending}
                          className="text-xs text-stamp underline"
                        >
                          Revogar
                        </button>
                      </div>
                    </div>
                    {expandedInvite === inv.id && (
                      <div className="mt-3 flex justify-center">
                        <QRCode value={inviteUrl(inv.code)} />
                      </div>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => handleCreateInvite(space.id)}
                  disabled={isPending}
                  className="mt-1 text-xs text-paper/60 underline"
                >
                  + Gerar novo convite
                </button>
              </>
            )}
          </div>
        );
      })}

      {/* Criar novo espaço */}
      <div className="rounded-lg bg-ink-soft p-4">
        <p className="text-sm font-bold mb-2">Criar novo espaço</p>
        <div className="flex gap-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            placeholder="Ex: Família, Viagem…"
            className="min-w-0 flex-1 rounded-md bg-ink px-3 py-2 text-paper outline-none placeholder:text-paper/30 text-sm"
          />
          <button
            onClick={handleCreate}
            disabled={isPending || !newName.trim()}
            className="rounded-md bg-paper px-4 py-2 text-sm font-bold text-print disabled:opacity-40"
          >
            Criar
          </button>
        </div>
      </div>
    </div>
  );
}
