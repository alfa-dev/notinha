"use client";

import { useState, useTransition } from "react";
import { addUserCategory, deleteUserCategory } from "@/app/actions";
import type { UserCategory } from "@/lib/types";

export default function CategoriesManager({
  initialCategories,
}: {
  initialCategories: UserCategory[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [newLabel, setNewLabel] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const label = newLabel.trim();
    if (!label) return;
    setError(null);
    startTransition(async () => {
      try {
        await addUserCategory(label);
        setNewLabel("");
        // Otimista: adiciona na lista local
        setCategories((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            user_id: "",
            label,
            position: prev.length,
          },
        ]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao adicionar");
      }
    });
  }

  async function remove(id: string) {
    startTransition(async () => {
      try {
        await deleteUserCategory(id);
        setCategories((prev) => prev.filter((c) => c.id !== id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao remover");
      }
    });
  }

  return (
    <div className="space-y-3">
      {categories.length === 0 && (
        <p className="text-center text-sm text-paper/50">
          Nenhuma categoria personalizada ainda.
        </p>
      )}

      <ul className="space-y-2">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between">
            <span className="text-sm">{c.label}</span>
            <button
              onClick={() => remove(c.id)}
              disabled={isPending}
              className="text-xs text-stamp underline underline-offset-2 disabled:opacity-50"
            >
              Remover
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Nova categoria…"
          className="min-w-0 flex-1 rounded-md bg-ink px-3 py-2 text-paper outline-none placeholder:text-paper/30 text-sm"
        />
        <button
          onClick={add}
          disabled={isPending || !newLabel.trim()}
          className="rounded-md bg-paper px-4 py-2 text-sm font-bold text-print disabled:opacity-40"
        >
          {isPending ? "…" : "Adicionar"}
        </button>
      </div>

      {error && <p className="text-sm text-stamp">{error}</p>}
    </div>
  );
}
