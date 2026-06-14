import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/service";

// Mapeia Stripe price ID → tier
function tierFromPriceId(priceId: string): "plus" | "pro" | null {
  if (priceId === process.env.STRIPE_PRICE_PLUS_MONTHLY) return "plus";
  if (priceId === process.env.STRIPE_PRICE_PRO_MONTHLY) return "pro";
  return null;
}

export async function POST(req: NextRequest) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-05-27.dahlia",
  });
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Webhook inválido" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Idempotência
  const { data: seen } = await supabase
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .single();
  if (seen) return NextResponse.json({ received: true });

  await supabase.from("stripe_events").insert({ id: event.id });

  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const userId =
        sub.metadata?.supabase_user_id ??
        (await getUserByCustomer(supabase, sub.customer as string));
      if (!userId) break;

      const priceId = sub.items.data[0]?.price.id;
      const tier = tierFromPriceId(priceId) ?? "free";

      await supabase.from("user_profiles").upsert({
        id: userId,
        tier: sub.status === "active" || sub.status === "trialing" ? tier : "free",
        stripe_subscription_id: sub.id,
        subscription_status: sub.status,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        subscription_period_end: (sub as any).current_period_end
          ? new Date((sub as any).current_period_end * 1000).toISOString()
          : null,
      });
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const userId =
        sub.metadata?.supabase_user_id ??
        (await getUserByCustomer(supabase, sub.customer as string));
      if (!userId) break;

      await supabase.from("user_profiles").upsert({
        id: userId,
        tier: "free",
        subscription_status: "canceled",
        stripe_subscription_id: null,
        subscription_period_end: null,
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const customerId = invoice.customer as string;
      const userId = await getUserByCustomer(supabase, customerId);
      if (!userId) break;

      await supabase
        .from("user_profiles")
        .update({ subscription_status: "past_due" })
        .eq("id", userId);
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function getUserByCustomer(
  supabase: ReturnType<typeof createServiceClient>,
  customerId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();
  return data?.id ?? null;
}
