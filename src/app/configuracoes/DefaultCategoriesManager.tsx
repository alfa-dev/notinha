"use client";

import { useState, useTransition } from "react";
import { setDefaultCategoryLabel } from "@/app/actions";
import { CATEGORIES } from "@/lib/categories";
import type { UserCategory } from "@/lib/types";

export default function DefaultCategoriesManager({
  overrides,
}: {
  overrides: UserCategory[];
}) {
  const buildMap = (list: UserCategory[]) =>
    Object.fromEntries(
      list
        .filter((c) => c.default_category_id)
        .map((c) => [c.default_category_id!, c.label])
    );

  const [localOverrides, setLocalOverrides] = useState<Record<string, string>>(
    buildMap(overrides)
  );
  const [editing, setEditing] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isPending, startTransition] = useTransition();

  function startEdit(id: string) {
    setEditing(id);
    setEditValue(localOverrides[id] ?? "");
  }

  function save(id: string) {
    const trimmed = editValue.trim();
    startTransition(async () => {
      await setDefaultCategoryLabel(id, trimmed);
      setLocalOverrides((prev) => {
        const next = { ...prev };
        if (!trimmed) delete next[id];
        else next[id] = trimmed;
        return next;
      });
      setEditing(null);
    });
  }

  return (
    <ul className="space-y-2">
      {CATEGORIES.map((c) => {
        const current = localOverrides[c.id] ?? c.label;
        const overridden = !!localOverrides[c.id];
        const isEditing = editing === c.id;

        return (
          <li key={c.id}>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") save(c.id);
                    if (e.key === "Escape") setEditing(null);
                  }}
                  placeholder={c.label}
                  className="min-w-0 flex-1 rounded-md bg-ink px-3 py-1.5 text-sm text-paper outline-none placeholder:text-paper/30"
                />
                <button
                  onClick={() => save(c.id)}
                  disabled={isPending}
                  className="text-xs font-bold text-ok disabled:opacity-50"
                >
                  {isPending ? "…" : "Salvar"}
                </button>
                <button
                  onClick={() => setEditing(null)}
                  className="text-xs text-paper/40"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm text-paper/70">
                  {current}
                  {overridden && (
                    <span className="ml-2 text-[10px] text-paper/35">
                      (padrão: {c.label})
                    </span>
                  )}
                </span>
                <button
                  onClick={() => startEdit(c.id)}
                  className="text-xs text-paper/40 underline underline-offset-2 hover:text-paper/70"
                >
                  Renomear
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
