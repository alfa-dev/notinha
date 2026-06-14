import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { TIER_LABELS } from "@/lib/admin";
import type { AdminUser } from "@/lib/types";

export default async function AdminUsuariosPage() {
  const service = createServiceClient();
  const db = await createClient();

  // Lista todos os usuários via auth admin API
  const { data: authData } = await service.auth.admin.listUsers({ perPage: 200 });
  const authUsers = authData?.users ?? [];

  // Busca perfis
  const { data: profiles } = await db
    .from("user_profiles")
    .select("*");

  // Conta gastos por usuário
  const { data: expCounts } = await db
    .from("expenses")
    .select("user_id");

  const countByUser = (expCounts ?? []).reduce<Record<string, number>>((acc, e) => {
    acc[e.user_id] = (acc[e.user_id] ?? 0) + 1;
    return acc;
  }, {});

  const profileMap = Object.fromEntries(
    (profiles ?? []).map((p) => [p.id, p])
  );

  const users: AdminUser[] = authUsers.map((u) => ({
    id: u.id,
    email: u.email ?? "(sem email)",
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    profile: profileMap[u.id] ?? null,
    expense_count: countByUser[u.id] ?? 0,
  }));

  users.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div>
      <h1 className="mt-4 text-2xl font-extrabold">
        Usuários ({users.length})
      </h1>

      <div className="mt-4 overflow-x-auto rounded-lg bg-ink-soft">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-paper/10 text-left text-xs uppercase tracking-wide text-paper/50">
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Plano</th>
              <th className="px-4 py-3">Gastos</th>
              <th className="px-4 py-3">OCR hoje</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Cadastro</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-paper/5 last:border-0 hover:bg-paper/5"
              >
                <td className="px-4 py-3 font-medium">{u.email}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                      u.profile?.tier === "pro"
                        ? "bg-ok/20 text-ok"
                        : u.profile?.tier === "plus"
                        ? "bg-stamp/20 text-stamp"
                        : "bg-paper/10 text-paper/60"
                    }`}
                  >
                    {TIER_LABELS[u.profile?.tier ?? "free"]}
                  </span>
                </td>
                <td className="px-4 py-3 text-paper/70">{u.expense_count}</td>
                <td className="px-4 py-3 text-paper/70">
                  {u.profile?.ocr_count_date ===
                  new Date().toISOString().slice(0, 10)
                    ? u.profile?.ocr_count_today ?? 0
                    : 0}
                </td>
                <td className="px-4 py-3">
                  {u.profile?.suspended ? (
                    <span className="text-xs font-bold text-stamp">Suspenso</span>
                  ) : u.profile?.subscription_status === "past_due" ? (
                    <span className="text-xs text-stamp">Inadimplente</span>
                  ) : (
                    <span className="text-xs text-ok">Ativo</span>
                  )}
                </td>
                <td className="px-4 py-3 text-paper/50 text-xs">
                  {new Date(u.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/usuarios/${u.id}`}
                    className="text-xs underline underline-offset-2 text-paper/60"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
