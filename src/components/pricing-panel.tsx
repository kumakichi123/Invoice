"use client";

import Link from "next/link";
import { useState } from "react";
import { OpenBillingPortalButton } from "@/components/open-billing-portal-button";

type PricingPanelProps = {
  billingConfigured: boolean;
  isSignedIn: boolean;
  hasActivePlan: boolean;
  earlyBirdApplied: boolean;
  earlyBirdSlotsLeft: number | null;
};

type Interval = "monthly" | "yearly";

export function PricingPanel({
  billingConfigured,
  isSignedIn,
  hasActivePlan,
  earlyBirdApplied,
  earlyBirdSlotsLeft,
}: PricingPanelProps) {
  const [actionLoading, setActionLoading] = useState<Interval | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout(interval: Interval) {
    setActionLoading(interval);
    setError(null);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ interval }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };
      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Checkout failed.");
        return;
      }

      window.location.href = payload.url;
    } finally {
      setActionLoading(null);
    }
  }

  const couponText = earlyBirdApplied
    ? "Early Bird active: your account has lifetime 50% off on the base subscription fee."
    : earlyBirdSlotsLeft !== null && earlyBirdSlotsLeft > 0
      ? `Early Bird open: first 10 users get lifetime 50% off (${earlyBirdSlotsLeft} slots left).`
      : null;

  return (
    <main className="min-h-screen bg-[#060b14] text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-8 md:px-8 md:py-10">
        <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-700/60 bg-slate-900/70 px-4 py-3 backdrop-blur">
          <p className="text-xl font-semibold tracking-tight">InvoiceJP</p>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Link href="/dashboard" className="rounded-lg px-3 py-2 text-slate-200 hover:bg-slate-800">
              Dashboard
            </Link>
            <Link href="/settings" className="rounded-lg px-3 py-2 text-slate-200 hover:bg-slate-800">
              Settings
            </Link>
          </div>
        </header>

        <section className="relative mt-4 overflow-hidden rounded-3xl border border-slate-700/60 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 md:p-9">
          <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-24 bottom-0 h-52 w-52 rounded-full bg-blue-500/15 blur-3xl" />

          <p className="text-xs uppercase tracking-[0.24em] text-slate-300">Pricing</p>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight md:text-5xl">Simple plan, clear overage.</h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-300 md:text-base">
            100 extractions per month are included. After that, overage is metered at $0.40 per file.
          </p>

          {couponText ? (
            <p className="mt-4 inline-flex rounded-full border border-cyan-300/40 bg-cyan-300/15 px-4 py-2 text-xs text-cyan-100">
              {couponText}
            </p>
          ) : null}
        </section>

        <section className="mt-4 grid gap-3 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">Monthly</p>
            <p className="mt-2 text-4xl font-semibold">$29</p>
            <p className="mt-1 text-sm text-slate-400">per month</p>
          </article>
          <article className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">Yearly</p>
            <p className="mt-2 text-4xl font-semibold">-20%</p>
            <p className="mt-1 text-sm text-slate-400">compared to monthly billing</p>
          </article>
          <article className="rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
            <p className="text-sm text-slate-400">Overage</p>
            <p className="mt-2 text-4xl font-semibold">$0.40</p>
            <p className="mt-1 text-sm text-slate-400">per extra extraction</p>
          </article>
        </section>

        <section className="mt-4 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-5">
          {!billingConfigured ? (
            <p className="rounded-lg border border-amber-300/50 bg-amber-200/20 px-3 py-2 text-sm text-amber-100">
              Billing is not configured yet. Add Stripe env values to enable checkout.
            </p>
          ) : !isSignedIn ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-slate-300">
                Pricing is public. Sign in to start your plan and checkout.
              </p>
              <Link
                href="/login"
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
              >
                Login to continue
              </Link>
              <Link
                href="/signup"
                className="rounded-xl border border-slate-500 bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                Create account
              </Link>
            </div>
          ) : hasActivePlan ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">Your plan is active</p>
                <p className="mt-1 text-sm text-slate-300">Change plan or cancel anytime from billing portal.</p>
              </div>
              <OpenBillingPortalButton />
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void startCheckout("monthly")}
                disabled={actionLoading !== null}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 disabled:opacity-60"
              >
                {actionLoading === "monthly" ? "Opening..." : "Start Monthly ($29/mo)"}
              </button>
              <button
                type="button"
                onClick={() => void startCheckout("yearly")}
                disabled={actionLoading !== null}
                className="rounded-xl border border-slate-500 bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
              >
                {actionLoading === "yearly" ? "Opening..." : "Start Yearly ($23.2/mo billed yearly)"}
              </button>
              <p className="text-xs text-slate-400">
                Includes 100 files/month. Overage is $0.40 per file. Coupon is auto-applied when Early Bird slots remain.
              </p>
            </div>
          )}

          {error ? <p className="mt-2 text-sm text-red-300">{error}</p> : null}
        </section>
      </div>
    </main>
  );
}
