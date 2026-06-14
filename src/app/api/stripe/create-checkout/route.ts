import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: "2026-05-27.dahlia",
  });
}

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  const PRICE_IDS: Record<string, string> = {
    plus: process.env.STRIPE_PRICE_PLUS_MONTHLY!,
    pro: process.env.STRIPE_PRICE_PRO_MONTHLY!,
  };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const { tier } = await req.json();
  const priceId = PRICE_IDS[tier];
  if (!priceId) {
    return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
  }

  // Busca ou cria customer no Stripe
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("stripe_customer_id, tier")
    .eq("id", user.id)
    .single();

  if (profile?.tier === tier) {
    return NextResponse.json({ error: "Você já está neste plano" }, { status: 400 });
  }

  let customerId = profile?.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email!,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
    await supabase
      .from("user_profiles")
      .upsert({ id: user.id, stripe_customer_id: customerId });
  }

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? req.headers.get("origin") ?? "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard?upgrade=success`,
    cancel_url: `${origin}/planos`,
    subscription_data: {
      metadata: { supabase_user_id: user.id },
    },
    allow_promotion_codes: true,
    locale: "pt-BR",
  });

  return NextResponse.json({ url: session.url });
}
