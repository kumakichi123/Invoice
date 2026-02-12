import Link from "next/link";
import type { ReactNode } from "react";

type FeatureItem = {
  tag: string;
  title: string;
  body: string;
};

type StepItem = {
  num: string;
  title: string;
  desc: string;
  icon: ReactNode;
};

const FEATURE_ITEMS: FeatureItem[] = [
  {
    tag: "OCR",
    title: "Fast OCR + Structuring",
    body: "Extract key fields from Japanese receipts and invoices in seconds using AI-powered OCR.",
  },
  {
    tag: "EDIT",
    title: "Review Before Export",
    body: "Edit values in one screen, then export clean CSV with confidence.",
  },
  {
    tag: "JP",
    title: "Built for Japan Context",
    body: "Handles common tax fields, qualified invoice formats, and layouts used in Japan.",
  },
  {
    tag: "TEAM",
    title: "Team-Ready Workflow",
    body: "Track processed files and keep operations consistent every month.",
  },
];

const STEP_ITEMS: StepItem[] = [
  {
    num: "01",
    title: "Upload",
    desc: "Drop your Japanese invoice PDF or photo.",
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
        />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Review",
    desc: "AI extracts 8 fields. Edit anything before export.",
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10"
        />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Download",
    desc: "Export a clean, structured CSV instantly.",
    icon: (
      <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12M12 16.5V3"
        />
      </svg>
    ),
  },
];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="orb-drift absolute -left-32 -top-32 h-[460px] w-[460px] rounded-full bg-cyan-200/35 blur-[110px]" />
        <div className="orb-drift-reverse absolute -right-28 top-1/4 h-[380px] w-[380px] rounded-full bg-emerald-200/30 blur-[100px]" />
        <div className="orb-drift absolute bottom-0 left-1/3 h-[320px] w-[320px] rounded-full bg-sky-200/30 blur-[90px]" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-6 md:px-10 md:py-8">
        <header className="rise-in rise-in-1 sticky top-4 z-50 rounded-2xl border border-slate-200 bg-white/85 px-5 py-3 shadow-sm backdrop-blur-xl md:px-7 md:py-4">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold tracking-tight text-slate-900">
              Invoice<span className="gradient-text">JP</span>
            </p>
            <div className="flex items-center gap-2 md:gap-3">
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Sign In
              </Link>
              <Link href="/dashboard" className="btn-primary !rounded-lg !px-5 !py-2 !text-sm">
                Start Free
              </Link>
            </div>
          </div>
        </header>

        <section className="rise-in rise-in-2 overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-sky-50/45 to-cyan-50/40 p-7 shadow-sm md:p-12 lg:p-16">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <div className="mono inline-flex items-center gap-2 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs text-cyan-800">
                <span className="pulse-glow inline-block h-1.5 w-1.5 rounded-full bg-cyan-600" />
                AI-Powered Invoice Processing
              </div>
              <h1 className="mt-5 text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl">
                Japanese invoices, <span className="gradient-text">simplified.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-slate-600 md:text-lg">
                Upload any Japanese invoice or receipt. Get structured, export-ready CSV in seconds with no manual data entry.
              </p>

              <p className="mt-7 text-sm font-medium text-slate-700">
                No credit card required | First 5 invoices free
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Link href="/dashboard" className="btn-primary">
                  Try Free
                </Link>
                <Link href="/pricing" className="btn-secondary">
                  View Pricing
                </Link>
              </div>
            </div>

            <div className="float-animation rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm md:p-6">
              <p className="mono text-xs tracking-[0.2em] text-slate-500">WORKFLOW</p>
              <div className="mt-4 space-y-3">
                {STEP_ITEMS.map((step) => (
                  <div
                    key={step.num}
                    className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 transition hover:border-sky-300 hover:bg-white"
                  >
                    <span className="mono flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-xs font-semibold text-sky-700">
                      {step.num}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                      <p className="text-xs text-slate-600">{step.desc}</p>
                    </div>
                    <span className="text-slate-500 transition group-hover:text-sky-700">{step.icon}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-900">
                Typical processing time: 10-30 seconds per file.
              </div>
            </div>
          </div>
        </section>

        <section className="rise-in rise-in-3 rounded-3xl border border-slate-200 bg-white/85 p-7 shadow-sm backdrop-blur md:p-10">
          <p className="mono text-xs tracking-[0.2em] text-slate-600">HOW IT WORKS</p>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {STEP_ITEMS.map((step) => (
              <div
                key={step.num}
                className="gradient-border-top glow-border-hover group rounded-2xl border border-slate-200 bg-white p-5 transition"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
                    {step.icon}
                  </span>
                  <span className="mono text-2xl font-bold text-slate-400">{step.num}</span>
                </div>
                <p className="mt-3 text-lg font-semibold text-slate-900">{step.title}</p>
                <p className="mt-1 text-sm text-slate-600">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rise-in rise-in-4 rounded-3xl border border-slate-200 bg-white/85 p-7 shadow-sm backdrop-blur md:p-10">
          <div className="grid gap-4 md:grid-cols-2">
            <article className="glow-border-hover group rounded-2xl border border-slate-200 bg-white p-6 transition">
              <p className="mono text-xs tracking-[0.18em] text-slate-500">FOR BUSINESSES</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900 md:text-3xl">
                Standardize back-office operations
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 md:text-base">
                Process monthly invoice volume with a repeatable CSV workflow. Consistent, auditable, fast.
              </p>
            </article>
            <article className="glow-border-hover group rounded-2xl border border-slate-200 bg-white p-6 transition">
              <p className="mono text-xs tracking-[0.18em] text-slate-500">FOR FREELANCERS</p>
              <p className="mt-3 text-2xl font-semibold text-slate-900 md:text-3xl">Cut manual bookkeeping time</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 md:text-base">
                Spend less time on data entry and more time on billable work. Upload, review, done.
              </p>
            </article>
          </div>
        </section>

        <section className="rise-in rise-in-5 rounded-3xl border border-slate-200 bg-white/85 p-7 shadow-sm backdrop-blur md:p-10">
          <p className="mono text-xs tracking-[0.2em] text-slate-600">FEATURES</p>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {FEATURE_ITEMS.map((item) => (
              <article
                key={item.title}
                className="gradient-border-top glow-border-hover group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5"
              >
                <span className="mono inline-flex rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                  {item.tag}
                </span>
                <p className="mt-2 text-xl font-semibold text-slate-900 md:text-2xl">{item.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 md:text-base">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rise-in rise-in-6 relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-sky-50/35 to-cyan-50/30 p-7 shadow-sm md:p-12">
          <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-cyan-200/40 blur-3xl" />
          <p className="mono text-xs tracking-[0.2em] text-slate-600">PRICING</p>
          <h2 className="mt-3 text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
            Starter: <span className="gradient-text">$29/month</span>
          </h2>
          <ul className="mt-6 space-y-3 text-base text-slate-700 md:text-lg">
            <li className="flex items-center gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700">OK</span>
              100 invoices/month included
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700">OK</span>
              Additional invoices: $0.40 each
            </li>
            <li className="flex items-center gap-3">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-100 text-xs font-semibold text-sky-700">OK</span>
              Annual billing: save 20%
            </li>
          </ul>
          <p className="mt-7 text-sm font-medium text-slate-700">Try 5 files free - no card required</p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <Link href="/dashboard" className="btn-primary">
              Start Free Trial
            </Link>
            <Link href="/pricing" className="btn-secondary">
              Full Pricing Details
            </Link>
          </div>
        </section>

        <footer className="rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-medium text-slate-600">
              (c) {new Date().getFullYear()} Invoice<span className="text-sky-600">JP</span>
            </p>
            <div className="flex flex-wrap items-center gap-5 text-sm">
              <Link href="/legal/notice" className="text-slate-500 transition hover:text-slate-900">
                Legal Notice
              </Link>
              <Link href="/legal/privacy" className="text-slate-500 transition hover:text-slate-900">
                Privacy Policy
              </Link>
              <Link href="/legal/terms" className="text-slate-500 transition hover:text-slate-900">
                Terms of Service
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
