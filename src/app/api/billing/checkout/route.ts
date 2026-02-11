import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripeServerClient } from "@/lib/stripe/server";
import { isStripeBillingConfigured } from "@/lib/billing";

type CheckoutPayload = {
  interval?: "monthly" | "yearly";
};

const EARLY_BIRD_LIMIT = 10;

export async function POST(request: Request) {
  try {
    if (!isStripeBillingConfigured()) {
      return NextResponse.json({ error: "Stripe billing is not configured." }, { status: 500 });
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const payload = (await request.json().catch(() => ({}))) as CheckoutPayload;
    const interval = payload.interval === "yearly" ? "yearly" : "monthly";
    const monthlyPriceId = process.env.STRIPE_PRICE_MONTHLY_ID!;
    const yearlyPriceId = process.env.STRIPE_PRICE_YEARLY_ID!;
    const usagePriceId = process.env.STRIPE_PRICE_USAGE_ID!;
    const earlyBirdCouponId = process.env.STRIPE_EARLY_BIRD_COUPON_ID;
    const basePriceId = interval === "yearly" ? yearlyPriceId : monthlyPriceId;

    const stripe = getStripeServerClient();
    const admin = getSupabaseAdminClient();

    const { data: existingBilling } = await supabase
      .from("billing_customers")
      .select("stripe_customer_id, early_bird_applied")
      .eq("user_id", user.id)
      .maybeSingle();

    let stripeCustomerId = existingBilling?.stripe_customer_id ?? null;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      stripeCustomerId = customer.id;
    }

    let applyEarlyBird = false;
    if (earlyBirdCouponId && !existingBilling?.early_bird_applied) {
      const { count } = await admin
        .from("billing_customers")
        .select("user_id", { count: "exact", head: true })
        .eq("early_bird_applied", true);

      applyEarlyBird = (count ?? 0) < EARLY_BIRD_LIMIT;
    }

    await admin.from("billing_customers").upsert(
      {
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
      },
      { onConflict: "user_id" },
    );

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ??
      request.headers.get("origin") ??
      "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      success_url: `${origin}/dashboard?billing=success`,
      cancel_url: `${origin}/dashboard?billing=cancel`,
      line_items: [
        { price: basePriceId, quantity: 1 },
        { price: usagePriceId },
      ],
      allow_promotion_codes: true,
      discounts: applyEarlyBird && earlyBirdCouponId ? [{ coupon: earlyBirdCouponId }] : undefined,
      metadata: {
        supabase_user_id: user.id,
        early_bird_candidate: applyEarlyBird ? "true" : "false",
      },
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
