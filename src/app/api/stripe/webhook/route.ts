import Stripe from "stripe";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStripeServerClient } from "@/lib/stripe/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const stripe = getStripeServerClient();
  const supabaseAdmin = getSupabaseAdminClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const usagePriceId = process.env.STRIPE_PRICE_USAGE_ID;
  const hdrs = await headers();
  const signature = hdrs.get("stripe-signature");

  if (!webhookSecret || !signature) {
    return NextResponse.json({ error: "Missing webhook secret or signature." }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid webhook signature.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription") {
        const customerId = toId(session.customer);
        const subscriptionId = toId(session.subscription);
        const userIdFromMeta =
          typeof session.metadata?.supabase_user_id === "string"
            ? session.metadata.supabase_user_id
            : null;
        const isEarlyBird =
          typeof session.metadata?.early_bird_candidate === "string" &&
          session.metadata.early_bird_candidate === "true";

        const userId = userIdFromMeta ?? (customerId ? await getUserIdByCustomer(customerId) : null);
        if (userId) {
          const patch: Record<string, unknown> = {
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            updated_at: new Date().toISOString(),
          };
          if (isEarlyBird) {
            patch.early_bird_applied = true;
          }

          await supabaseAdmin
            .from("billing_customers")
            .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
        }
      }
    }

    if (
      event.type === "customer.subscription.created" ||
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = toId(subscription.customer);
      const userIdFromMeta =
        typeof subscription.metadata?.supabase_user_id === "string"
          ? subscription.metadata.supabase_user_id
          : null;
      const userId = userIdFromMeta ?? (customerId ? await getUserIdByCustomer(customerId) : null);

      if (userId) {
        const usageItemId = usagePriceId ? findUsageItemId(subscription, usagePriceId) : null;
        const basePriceId = usagePriceId ? findBasePriceId(subscription, usagePriceId) : null;

        await supabaseAdmin
          .from("billing_customers")
          .upsert(
            {
              user_id: userId,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              stripe_subscription_status: subscription.status,
              stripe_base_price_id: basePriceId,
              stripe_usage_subscription_item_id: usageItemId,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook handling failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  async function getUserIdByCustomer(stripeCustomerId: string): Promise<string | null> {
    const { data } = await supabaseAdmin
      .from("billing_customers")
      .select("user_id")
      .eq("stripe_customer_id", stripeCustomerId)
      .maybeSingle();
    const userId = data?.user_id;
    return typeof userId === "string" ? userId : null;
  }
}

function toId(value: unknown): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && "id" in value && typeof value.id === "string") {
    return value.id;
  }
  return null;
}

function findUsageItemId(subscription: Stripe.Subscription, usagePriceId: string): string | null {
  for (const item of subscription.items.data) {
    if (item.price.id === usagePriceId) {
      return item.id;
    }
  }
  return null;
}

function findBasePriceId(subscription: Stripe.Subscription, usagePriceId: string): string | null {
  for (const item of subscription.items.data) {
    if (item.price.id !== usagePriceId) {
      return item.price.id;
    }
  }
  return null;
}
