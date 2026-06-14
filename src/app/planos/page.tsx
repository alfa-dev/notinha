import { getCurrentProfile, TIER_LABELS } from "@/lib/admin";
import PlansClient from "./PlansClient";
import AppHeader from "@/components/AppHeader";

export default async function PlanosPage() {
  const profile = await getCurrentProfile();

  return (
    <>
      <AppHeader title="Planos" />
      <main className="mx-auto max-w-2xl p-6 pb-16">
        {profile && (
          <p className="mt-2 mb-6 text-sm text-print-faint">
            Plano atual:{" "}
            <span className="font-semibold text-paper">{TIER_LABELS[profile.tier]}</span>
            {profile.subscription_status === "active" && profile.subscription_period_end && (
              <span className="ml-2 text-print-faint/70">
                · renova em {new Date(profile.subscription_period_end).toLocaleDateString("pt-BR")}
              </span>
            )}
            {profile.subscription_status === "past_due" && (
              <span className="ml-2 font-semibold text-stamp"> · pagamento pendente</span>
            )}
          </p>
        )}
        <PlansClient
          currentTier={profile?.tier ?? "free"}
          hasSubscription={!!profile?.stripe_subscription_id}
        />
      </main>
    </>
  );
}
