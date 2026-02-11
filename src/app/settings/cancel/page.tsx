import Link from "next/link";
import { redirect } from "next/navigation";
import { OpenBillingPortalButton } from "@/components/open-billing-portal-button";
import { isActiveBillingStatus } from "@/lib/billing";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function CancelPage() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: billing } = await supabase
    .from("billing_customers")
    .select("stripe_subscription_status")
    .eq("user_id", user.id)
    .maybeSingle();

  const hasActivePlan = isActiveBillingStatus(billing?.stripe_subscription_status);

  return (
    <main className="min-h-screen bg-[#f4f5f8] text-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">Subscription cancellation</h1>
            <Link href="/settings" className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
              Back to settings
            </Link>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Use Stripe Billing Portal to cancel safely and keep billing history consistent.
          </p>
        </header>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          {!hasActivePlan ? (
            <div>
              <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">No active subscription found.</p>
              <Link
                href="/pricing"
                className="mt-3 inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                View pricing
              </Link>
            </div>
          ) : (
            <div>
              <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
                Cancellation is managed in Stripe Billing Portal. You can cancel and keep service until period end.
              </p>
              <div className="mt-3">
                <OpenBillingPortalButton label="Open portal to cancel" />
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
