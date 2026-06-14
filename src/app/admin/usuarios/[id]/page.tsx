import Link from "next/link";
import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { TIER_LABELS, TIER_LIMITS } from "@/lib/admin";
import { formatBRL } from "@/lib/categories";
import type { UserTier } from "@/lib/types";
import {
  adminSetTier,
  adminSetSuspended,
  adminResetOCR,
} from "../../actions";

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = createServiceClient();
  const db = await createClient();

  const { data: authUser, error } = await service.auth.admin.getUserById(id);
  if (error || !authUser.user) notFound();
  const u = authUser.user;

  const [profileRes, expensesRes] = await Promise.all([
    db.from("user_profiles").select("*").eq("id", id).single(),
    db
      .from("expenses")
      .select("id, amount_cents, description, date")
      .eq("user_id", id)
      .order("date", { ascending: false })
      .limit(20),
  ]);

  const profile = profileRes.data;
  const expenses = expensesRes.data ?? [];

  const tiers: UserTier[] = ["free", "plus", "pro"];

  return (
    <div className="space-y-6">
      <div className="flex items-baseline gap-3">
        <Link href="/admin/usuarios" className="text-paper/50 text-sm underline">
          ← Usuários
        </Link>
        <h1 className="text-xl font-extrabold truncate">{u.email}</h1>
      </div>

      {/* Info geral */}
      <div className="rounded-lg bg-ink-soft p-4 space-y-1 text-sm">
        <p>
          <span className="text-paper/50">ID:</span>{" "}
          <code className="text-xs">{u.id}</code>
        </p>
        <p>
          <span className="text-paper/50">Cadastro:</span>{" "}
          {new Date(u.created_at).toLocaleString("pt-BR")}
        </p>
        <p>
          <span className="text-paper/50">Último login:</span>{" "}
          {u.last_sign_in_at
            ? new Date(u.last_sign_in_at).toLocaleString("pt-BR")
            : "—"}
        </p>
        {profile && (
          <>
            <p>
              <span className="text-paper/50">Plano:</span>{" "}
              <span className="font-bold">{TIER_LABELS[profile.tier]}</span>
            </p>
            <p>
              <span className="text-paper/50">OCR hoje:</span>{" "}
              {profile.ocr_count_date === new Date().toISOString().slice(0, 10)
                ? profile.ocr_count_today
                : 0}{" "}
              /{" "}
              {TIER_LIMITS[profile.tier] === null
                ? "∞"
                : TIER_LIMITS[profile.tier]}
            </p>
            <p>
              <span className="text-paper/50">Status:</span>{" "}
              {profile.suspended ? (
                <span className="text-stamp font-bold">Suspenso</span>
              ) : (
                <span className="text-ok">Ativo</span>
              )}
            </p>
            {profile.stripe_customer_id && (
              <p>
                <span className="text-paper/50">Stripe customer:</span>{" "}
                <code className="text-xs">{profile.stripe_customer_id}</code>
              </p>
            )}
          </>
        )}
      </div>

      {/* Ações */}
      <div className="rounded-lg bg-ink-soft p-4 space-y-4">
        <h2 className="font-bold text-sm uppercase tracking-wide text-paper/50">
          Ações
        </h2>

        {/* Mudar tier */}
        <div>
          <p className="text-sm mb-2">Alterar plano:</p>
          <div className="flex flex-wrap gap-2">
            {tiers.map((t) => (
              <form key={t} action={adminSetTier.bind(null, id, t)}>
                <button
                  type="submit"
                  className={`rounded px-4 py-1.5 text-sm font-bold ${
                    profile?.tier === t
                      ? "bg-ok text-paper"
                      : "bg-ink hover:bg-ink-soft text-paper"
                  }`}
                >
                  {TIER_LABELS[t]}
                  {profile?.tier === t && " ✓"}
                </button>
              </form>
            ))}
          </div>
        </div>

        {/* Suspender */}
        <div className="flex gap-2">
          <form action={adminSetSuspended.bind(null, id, !profile?.suspended)}>
            <button
              type="submit"
              className={`rounded px-4 py-1.5 text-sm font-bold ${
                profile?.suspended
                  ? "bg-ok text-paper"
                  : "bg-stamp/80 text-paper"
              }`}
            >
              {profile?.suspended ? "Reativar conta" : "Suspender conta"}
            </button>
          </form>

          <form action={adminResetOCR.bind(null, id)}>
            <button
              type="submit"
              className="rounded bg-ink px-4 py-1.5 text-sm hover:bg-ink-soft"
            >
              Resetar OCR hoje
            </button>
          </form>
        </div>
      </div>

      {/* Últimos gastos */}
      <div>
        <h2 className="font-bold text-sm uppercase tracking-wide text-paper/50 mb-3">
          Últimos 20 gastos ({expenses.length})
        </h2>
        {expenses.length === 0 ? (
          <p className="text-paper/40 text-sm">Nenhum gasto registrado.</p>
        ) : (
          <div className="rounded-lg bg-ink-soft divide-y divide-paper/5 text-sm">
            {expenses.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-2">
                <div>
                  <p className="font-medium">{e.description}</p>
                  <p className="text-xs text-paper/40">
                    {new Date(e.date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <p className="font-extrabold money">{formatBRL(e.amount_cents)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
