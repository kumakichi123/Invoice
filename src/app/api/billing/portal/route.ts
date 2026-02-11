import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeServerClient } from "@/lib/stripe/server";
import { isStripeBillingConfigured } from "@/lib/billing";

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

    const { data: billing } = await supabase
      .from("billing_customers")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const stripeCustomerId = billing?.stripe_customer_id;
    if (!stripeCustomerId) {
      return NextResponse.json({ error: "No Stripe customer found." }, { status: 400 });
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL ??
      request.headers.get("origin") ??
      "http://localhost:3000";

    const stripe = getStripeServerClient();
    try {
      const customer = await stripe.customers.retrieve(stripeCustomerId);
      if (typeof customer === "object" && "deleted" in customer && customer.deleted) {
        return NextResponse.json(
          { error: "Stripe customer is deleted. Start checkout again from Pricing." },
          { status: 400 },
        );
      }
    } catch (error) {
      if (isNoSuchCustomerError(error)) {
        return NextResponse.json(
          { error: "Stripe customer not found in current mode. Start checkout again from Pricing." },
          { status: 400 },
        );
      }
      throw error;
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/dashboard`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
