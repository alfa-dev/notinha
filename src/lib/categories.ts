export const CATEGORIES = [
  { id: "alimentacao", label: "Alimentação" },
  { id: "bar_lazer", label: "Bar / Lazer" },
  { id: "transporte", label: "Transporte" },
  { id: "carro_manutencao", label: "Carro / Manutenção" },
  { id: "cigarro", label: "Cigarro" },
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

export function categoryLabel(id: string) {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id;
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
