export const ACTIVE_BILLING_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
]);

export function isActiveBillingStatus(status: string | null | undefined): boolean {
  if (!status) {
    return false;
  }
  return ACTIVE_BILLING_STATUSES.has(status);
}

export function isStripeBillingConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_PRICE_MONTHLY_ID &&
    process.env.STRIPE_PRICE_YEARLY_ID &&
    process.env.STRIPE_PRICE_USAGE_ID &&
    process.env.STRIPE_METER_EVENT_NAME &&
    process.env.STRIPE_WEBHOOK_SECRET &&
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
