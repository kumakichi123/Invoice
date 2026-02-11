import Link from "next/link";
import { redirect } from "next/navigation";
import { ContactForm } from "@/components/contact-form";
import { isActiveBillingStatus } from "@/lib/billing";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function SettingsPage() {
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
      <div className="mx-auto max-w-5xl px-4 py-6 md:px-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Link href="/dashboard" className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100">
                Dashboard
              </Link>
              <Link href="/pricing" className="rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100">
                Pricing
              </Link>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-600">
            Access contact, guide, and subscription cancellation from one place.
          </p>
        </header>

        <section className="mt-4 grid gap-4 md:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Guide</p>
            <h2 className="mt-2 text-xl font-semibold">How to use</h2>
            <p className="mt-2 text-sm text-slate-600">
              Upload, review, and download workflow for daily invoice operations.
            </p>
            <Link
              href="/settings/guide"
              className="mt-4 inline-flex rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Open guide
            </Link>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Subscription</p>
            <h2 className="mt-2 text-xl font-semibold">{hasActivePlan ? "Active plan" : "No active plan"}</h2>
            <p className="mt-2 text-sm text-slate-600">
              Manage billing details and open cancellation controls.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/pricing"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                View pricing
              </Link>
              <Link
                href="/settings/cancel"
                className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
              >
                Cancellation
              </Link>
            </div>
          </article>
        </section>

        <section id="contact" className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Contact</p>
          <h2 className="mt-2 text-xl font-semibold">Questions and requests</h2>
          <p className="mt-2 text-sm text-slate-600">
            Send questions about Japanese accounting workflow, improvement requests, or support notes.
          </p>
          <div className="mt-4 max-w-xl">
            <ContactForm />
          </div>
        </section>
      </div>
    </main>
  );
}
