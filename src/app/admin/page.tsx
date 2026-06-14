import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/categories";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const supabase = createServiceClient();
  const db = await createClient();

  const [profilesRes, expensesRes, todayRes] = await Promise.all([
    supabase.from("user_profiles").select("tier, suspended, ocr_count_today, ocr_count_date"),
    db.from("expenses").select("amount_cents", { count: "exact" }),
    db
      .from("user_profiles")
      .select("id", { count: "exact" })
      .eq("ocr_count_date", new Date().toISOString().slice(0, 10))
      .gt("ocr_count_today", 0),
  ]);

  const profiles = profilesRes.data ?? [];
  const totalExpenses = expensesRes.count ?? 0;
  const totalRevenue = (expensesRes.data ?? []).reduce((s, e) => s + e.amount_cents, 0);
  const activeToday = todayRes.count ?? 0;

  const byTier = profiles.reduce<Record<string, number>>((acc, p) => {
    acc[p.tier] = (acc[p.tier] ?? 0) + 1;
    return acc;
  }, {});

  const suspended = profiles.filter((p) => p.suspended).length;

  const stats = [
    { label: "Total usuários", value: profiles.length },
    { label: "Ativos hoje (OCR)", value: activeToday },
    { label: "Suspensos", value: suspended },
    { label: "Free", value: byTier.free ?? 0 },
    { label: "Plus", value: byTier.plus ?? 0 },
    { label: "Pro", value: byTier.pro ?? 0 },
    { label: "Total de gastos", value: totalExpenses.toLocaleString("pt-BR") },
    { label: "Volume total", value: formatBRL(totalRevenue) },
  ];

  return (
    <div>
      <h1 className="mt-4 text-2xl font-extrabold">Dashboard</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-ink-soft px-4 py-3">
            <p className="text-xs uppercase tracking-wide text-paper/50">{s.label}</p>
            <p className="mt-1 text-xl font-extrabold money">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Link
          href="/admin/usuarios"
          className="inline-block rounded-lg bg-stamp px-6 py-3 font-bold text-paper"
        >
          Ver todos os usuários →
        </Link>
      </div>
    </div>
  );
}
