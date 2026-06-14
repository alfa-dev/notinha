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
  default_category_id?: string | null;
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

export type UserTier = "free" | "plus" | "pro";
export type UserRole = "user" | "admin";
export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "past_due"
  | "trialing"
  | null;

export type UserProfile = {
  id: string;
  role: UserRole;
  tier: UserTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_period_end: string | null;
  suspended: boolean;
  ocr_count_today: number;
  ocr_count_date: string;
  created_at: string;
  updated_at: string;
};

/** Para o painel admin — inclui dados do auth.users */
export type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  profile: UserProfile | null;
  expense_count: number;
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
  limitReached?: boolean;
  tier?: UserTier;
  location?: { latitude: number; longitude: number; address?: string };
  spaceId?: string | null;
};
