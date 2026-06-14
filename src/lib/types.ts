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
  space_id: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string | null;
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

export type UserCategory = {
  id: string;
  user_id: string;
  label: string;
  position: number;
};

export type Space = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  space_members?: SpaceMember[];
};

export type SpaceMember = {
  space_id: string;
  user_id: string;
  display_name: string | null;
  joined_at: string;
};

export type SpaceInvite = {
  id: string;
  space_id: string;
  code: string;
  created_by: string;
  used_by: string | null;
  expires_at: string | null;
  created_at: string;
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
  questions: string[];
  confidence: "high" | "medium" | "low";
};

/** Job na fila de OCR */
export type OCRJob = {
  id: string;
  file?: File;
  text?: string;
  status: "queued" | "processing" | "done" | "error";
  result?: { parsed: ParsedReceipt; receiptPath: string | null };
  error?: string;
  location?: { latitude: number; longitude: number; address?: string };
  spaceId?: string | null;
};
