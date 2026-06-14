import type { UserCategory } from "./types";

export const CATEGORIES = [
  { id: "alimentacao", label: "Alimentação" },
  { id: "lazer", label: "Lazer" },
  { id: "transporte", label: "Transporte" },
  { id: "carro_manutencao", label: "Carro / Manutenção" },
  { id: "saude_farmacia", label: "Saúde / Farmácia" },
  { id: "casa", label: "Casa" },
  { id: "filha", label: "Filha" },
  { id: "outros", label: "Outros" },
] as const;

export type CategoryId = (typeof CATEGORIES)[number]["id"];

export const PAYMENT_METHODS = [
  { id: "rico", label: "Cartão Rico" },
  { id: "pix", label: "Pix" },
  { id: "dinheiro", label: "Dinheiro" },
  { id: "gisele", label: "Cartão Gisele (a pagar)" },
  { id: "outro", label: "Outro" },
] as const;

export function categoryLabel(id: string, userCategories: UserCategory[] = []) {
  // backward compat: expenses saved before the rename
  if (id === "bar_lazer") id = "lazer";
  if (id === "cigarro") id = "outros";

  const override = userCategories.find((c) => c.default_category_id === id);
  if (override) return override.label;

  const builtin = CATEGORIES.find((c) => c.id === id);
  if (builtin) return builtin.label;

  const custom = userCategories.find((c) => c.id === id && !c.default_category_id);
  return custom?.label ?? id;
}

export function paymentLabel(id: string) {
  return PAYMENT_METHODS.find((p) => p.id === id)?.label ?? id;
}

export function formatBRL(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function allCategories(userCategories: UserCategory[] = []) {
  const overrideMap = new Map(
    userCategories
      .filter((c) => c.default_category_id)
      .map((c) => [c.default_category_id!, c.label])
  );

  return [
    ...CATEGORIES.map((c) => ({ id: c.id, label: overrideMap.get(c.id) ?? c.label })),
    ...userCategories
      .filter((c) => !c.default_category_id)
      .map((c) => ({ id: c.id, label: c.label })),
  ];
}
