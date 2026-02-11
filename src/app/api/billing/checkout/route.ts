import { NextResponse } from "next/server";
import Stripe from "stripe";
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

    const stripeCustomerId = await getUsableCustomerId({
      stripe,
      currentCustomerId: existingBilling?.stripe_customer_id ?? null,
      userId: user.id,
      email: user.email ?? null,
    });

    let applyEarlyBird = false;
    if (earlyBirdCouponId && !existingBilling?.early_bird_applied) {
      const { count } = await admin
        .from("billing_customers")
        .select("user_id", { count: "exact", head: true })
        .eq("early_bird_applied", true);

      applyEarlyBird = (count ?? 0) < EARLY_BIRD_LIMIT;
    }

    const { error: upsertError } = await admin.from("billing_customers").upsert(
      {
        user_id: user.id,
        stripe_customer_id: stripeCustomerId,
      },
      { onConflict: "user_id" },
    );
    if (upsertError) {
      return NextResponse.json({ error: `Billing profile update failed: ${upsertError.message}` }, { status: 500 });
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ??
      request.headers.get("origin") ??
      "http://localhost:3000";

    const autoDiscounts =
      applyEarlyBird && earlyBirdCouponId ? [{ coupon: earlyBirdCouponId }] : undefined;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      success_url: `${origin}/dashboard?billing=success`,
      cancel_url: `${origin}/dashboard?billing=cancel`,
      line_items: [
        { price: basePriceId, quantity: 1 },
        { price: usagePriceId },
      ],
      // Stripe forbids setting both allow_promotion_codes and discounts at once.
      allow_promotion_codes: autoDiscounts ? undefined : true,
      discounts: autoDiscounts,
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
    console.error(`[billing/checkout] ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function getUsableCustomerId(input: {
  stripe: Stripe;
  currentCustomerId: string | null;
  userId: string;
  email: string | null;
}) {
  if (input.currentCustomerId) {
    try {
      const customer = await input.stripe.customers.retrieve(input.currentCustomerId);
      if (typeof customer === "object" && "deleted" in customer && customer.deleted) {
        throw new Error("Stripe customer is deleted.");
      }
      return input.currentCustomerId;
    } catch (error) {
      if (!isNoSuchCustomerError(error)) {
        throw error;
      }
      console.warn(
        `[billing/checkout] stale stripe customer user=${input.userId} customer=${input.currentCustomerId}`,
      );
    }
  }

  const customer = await input.stripe.customers.create({
    email: input.email ?? undefined,
    metadata: {
      supabase_user_id: input.userId,
    },
  });
  return customer.id;
}

function isNoSuchCustomerError(error: unknown): boolean {
  if (!(error instanceof Stripe.errors.StripeError)) {
    return false;
  }
  if (error.type === "StripeInvalidRequestError" && error.code === "resource_missing") {
    return true;
  }
  const message = error.message?.toLowerCase() ?? "";
  return message.includes("no such customer");
}
