import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile, TIER_LABELS } from "@/lib/admin";
import PlansClient from "./PlansClient";

export default async function PlanosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profile = await getCurrentProfile();

  return (
    <main className="mx-auto max-w-2xl p-6 pb-16">
      <header className="flex items-baseline justify-between py-2">
        <h1 className="text-2xl font-extrabold tracking-tight">Planos</h1>
        <Link
          href="/dashboard"
          className="text-sm font-bold underline underline-offset-4"
        >
          ← Voltar
        </Link>
      </header>

      {profile && (
        <p className="mt-2 text-sm text-paper/60">
          Seu plano atual:{" "}
          <span className="font-bold text-paper">
            {TIER_LABELS[profile.tier]}
          </span>
          {profile.subscription_status === "active" &&
            profile.subscription_period_end && (
              <span className="ml-2 text-paper/40">
                · renova em{" "}
                {new Date(profile.subscription_period_end).toLocaleDateString(
                  "pt-BR"
                )}
              </span>
            )}
          {profile.subscription_status === "past_due" && (
            <span className="ml-2 text-stamp font-semibold">
              · pagamento pendente
            </span>
          )}
        </p>
      )}

      <PlansClient
        currentTier={profile?.tier ?? "free"}
        hasSubscription={!!profile?.stripe_subscription_id}
      />
    </main>
  );
}
