import Stripe from "stripe";

let cachedStripe: Stripe | null = null;

export function getStripeServerClient(): Stripe {
  if (cachedStripe) {
    return cachedStripe;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY.");
  }

  cachedStripe = new Stripe(secretKey);
  return cachedStripe;
}
