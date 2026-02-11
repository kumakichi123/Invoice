import { PricingPanel } from "@/components/pricing-panel";
import { isActiveBillingStatus, isStripeBillingConfigured } from "@/lib/billing";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function PricingPage() {
  const supabaseConfigured = isSupabaseConfigured();
  const billingConfigured = isStripeBillingConfigured();
  let isSignedIn = false;
  let hasActivePlan = false;
  let earlyBirdApplied = false;
  let earlyBirdSlotsLeft: number | null = null;

  if (supabaseConfigured) {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    isSignedIn = Boolean(user);

    if (user) {
      const { data: billingData } = await supabase
        .from("billing_customers")
        .select("stripe_subscription_status, early_bird_applied")
        .eq("user_id", user.id)
        .maybeSingle();

      hasActivePlan = isActiveBillingStatus(billingData?.stripe_subscription_status);
      earlyBirdApplied = billingData?.early_bird_applied ?? false;
    }

    if (billingConfigured && !earlyBirdApplied) {
      const admin = getSupabaseAdminClient();
      const { count: appliedCount } = await admin
        .from("billing_customers")
        .select("user_id", { head: true, count: "exact" })
        .eq("early_bird_applied", true);
      earlyBirdSlotsLeft = Math.max(0, 10 - (appliedCount ?? 0));
    }
  }

  return (
    <PricingPanel
      billingConfigured={billingConfigured}
      isSignedIn={isSignedIn}
      hasActivePlan={hasActivePlan}
      earlyBirdApplied={earlyBirdApplied}
      earlyBirdSlotsLeft={earlyBirdSlotsLeft}
    />
  );
}
