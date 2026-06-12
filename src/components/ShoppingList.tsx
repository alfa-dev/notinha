"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  addShoppingItem,
  toggleShoppingItem,
  updateShoppingItem,
  deleteShoppingItem,
  clearChecked,
} from "@/app/actions";
import type { ShoppingItem } from "@/lib/types";

export default function ShoppingList({
  initialItems,
}: {
  initialItems: ShoppingItem[];
}) {
  const router = useRouter();
  const [items, setItems] = useState(initialItems);
  const [newName, setNewName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const openItems = items.filter((i) => !i.checked);
  const doneItems = items.filter((i) => i.checked);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/shopping/generate", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha ao gerar lista");
      router.refresh();
      // recarrega itens via refresh do server component
      location.reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro inesperado");
    } finally {
      setGenerating(false);
    }
  }

  function toggle(item: ShoppingItem) {
    setItems((xs) =>
      xs.map((x) => (x.id === item.id ? { ...x, checked: !x.checked } : x))
    );
    startTransition(() => toggleShoppingItem(item.id, !item.checked));
  }

  function rename(item: ShoppingItem, name: string) {
    setItems((xs) => xs.map((x) => (x.id === item.id ? { ...x, name } : x)));
  }

  function commitRename(item: ShoppingItem, name: string) {
    if (name.trim() && name !== item.name) {
      startTransition(() => updateShoppingItem(item.id, { name: name.trim() }));
    }
  }

  function remove(item: ShoppingItem) {
    setItems((xs) => xs.filter((x) => x.id !== item.id));
    startTransition(() => deleteShoppingItem(item.id));
  }

  async function add() {
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    await addShoppingItem(name, null);
    location.reload();
  }

  return (
    <div className="space-y-4">
      <button
        onClick={generate}
        disabled={generating}
        className="w-full rounded-xl bg-paper py-3 font-extrabold text-print disabled:opacity-50"
      >
        {generating ? "Pensando na lista…" : "✨ Sugerir a partir dos meus gastos"}
      </button>
      {error && <p className="text-sm font-semibold text-stamp">{error}</p>}

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Adicionar item…"
          className="flex-1 rounded-md bg-ink-soft px-3 py-3 outline-none placeholder:text-paper/30"
        />
        <button
          onClick={add}
          disabled={!newName.trim()}
          className="rounded-md bg-ok px-4 font-bold text-paper disabled:opacity-40"
        >
          +
        </button>
      </div>

      <ul className="space-y-2">
        {openItems.map((item) => (
          <Row
            key={item.id}
            item={item}
            onToggle={() => toggle(item)}
            onRename={(v) => rename(item, v)}
            onCommit={(v) => commitRename(item, v)}
            onDelete={() => remove(item)}
          />
        ))}
        {openItems.length === 0 && (
          <li className="rounded-md bg-ink-soft p-4 text-center text-sm text-paper/50">
            Lista vazia. Adiciona um item ou pede sugestão.
          </li>
        )}
      </ul>

      {doneItems.length > 0 && (
        <>
          <div className="flex items-center justify-between pt-2">
            <h2 className="text-xs font-bold uppercase tracking-widest text-paper/50">
              No carrinho ({doneItems.length})
            </h2>
            <button
              onClick={() => {
                setItems((xs) => xs.filter((x) => !x.checked));
                startTransition(() => clearChecked());
              }}
              className="text-xs text-stamp underline"
            >
              Limpar comprados
            </button>
          </div>
          <ul className="space-y-2 opacity-60">
            {doneItems.map((item) => (
              <Row
                key={item.id}
                item={item}
                onToggle={() => toggle(item)}
                onRename={(v) => rename(item, v)}
                onCommit={(v) => commitRename(item, v)}
                onDelete={() => remove(item)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Row({
  item,
  onToggle,
  onRename,
  onCommit,
  onDelete,
}: {
  item: ShoppingItem;
  onToggle: () => void;
  onRename: (v: string) => void;
  onCommit: (v: string) => void;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-md bg-ink-soft px-3 py-2">
      <input
        type="checkbox"
        checked={item.checked}
        onChange={onToggle}
        className="size-5 accent-[#2e7d4f]"
      />
      <div className="min-w-0 flex-1">
        <input
          value={item.name}
          onChange={(e) => onRename(e.target.value)}
          onBlur={(e) => onCommit(e.target.value)}
          className={`w-full bg-transparent outline-none ${item.checked ? "line-through" : ""}`}
        />
        {(item.quantity || item.note) && (
          <p className="truncate text-xs text-paper/50">
            {[item.quantity, item.note].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
      {item.source === "ai" && (
        <span className="shrink-0 rounded bg-paper/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-paper/60">
          IA
        </span>
      )}
      <button onClick={onDelete} className="shrink-0 px-1 text-paper/40">
        ✕
      </button>
    </li>
  );
}
