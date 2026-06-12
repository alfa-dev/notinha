export type ExpenseStatus = "confirmed" | "pending_review";

export type PendingQuestion = { q: string; a: string | null };

export type ExpenseItem = {
  id?: string;
  description: string;
  quantity: number;
  unit_cents: number | null;
  total_cents: number;
  position?: number;
};

export type Expense = {
  id: string;
  user_id: string;
  date: string; // yyyy-mm-dd
  merchant: string | null;
  description: string;
  amount_cents: number;
  category: string;
  payment_method: string;
  reimburse_to: string | null;
  receipt_path: string | null;
  status: ExpenseStatus;
  questions: PendingQuestion[];
  notes: string | null;
  created_at: string;
  expense_items?: ExpenseItem[];
};

export type ShoppingItem = {
  id: string;
  user_id: string;
  name: string;
  quantity: string | null;
  note: string | null;
  checked: boolean;
  source: "ai" | "manual";
  position: number;
};

/** Resposta estruturada da IA ao ler uma notinha / texto livre */
export type ParsedReceipt = {
  merchant: string | null;
  date: string | null; // yyyy-mm-dd, null se não visível
  description: string;
  amount_cents: number | null;
  category: string;
  payment_method: string | null;
  items: { description: string; quantity: number; unit_cents: number | null; total_cents: number }[];
  /** perguntas que a IA precisa fazer antes de classificar com confiança */
  questions: string[];
  confidence: "high" | "medium" | "low";
};
