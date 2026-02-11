import Link from "next/link";

const FEATURE_ITEMS = [
  {
    title: "Fast OCR + Structuring",
    body: "Extract key fields from Japanese receipts and invoices in seconds.",
  },
  {
    title: "Review Before Export",
    body: "Edit values in one screen, then export clean CSV with confidence.",
  },
  {
    title: "Built for Japan Context",
    body: "Handles common tax fields and invoice formats used in Japan.",
  },
  {
    title: "Team-Ready Workflow",
    body: "Track processed files and keep operations consistent every month.",
  },
];

const STEP_ITEMS = ["Upload invoice", "Review extracted fields", "Download CSV"];

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-8 md:px-10 md:py-12">
      <div className="pointer-events-none absolute -left-28 top-10 h-72 w-72 rounded-full bg-cyan-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-0 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-sky-200/30 blur-3xl" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-7">
        <header className="card card-strong rise-in px-6 py-4 md:px-8 md:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="mono text-xs tracking-[0.2em] text-slate-700">INVOICEJP</p>
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-white/80"
              >
                Sign In
              </Link>
              <Link
                href="/dashboard"
                className="rounded-lg bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)]"
              >
                Start Free
              </Link>
            </div>
          </div>
        </header>

        <section className="card card-strong rise-in overflow-hidden p-7 md:p-12">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <h1 className="text-5xl font-semibold leading-[1.06] text-slate-900 md:text-7xl">
                Japanese invoice processing,
                <br />
                simplified.
              </h1>
              <p className="mt-4 max-w-2xl text-base text-slate-700 md:text-xl">
                For businesses and freelancers dealing with Japanese invoices from overseas
              </p>

              <p className="mt-8 text-sm font-semibold text-slate-800 md:text-base">
                No credit card required | First 5 invoices free
              </p>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="rounded-xl bg-[color:var(--accent)] px-8 py-3 text-center text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] md:text-base"
                >
                  Try Free
                </Link>
                <Link
                  href="/pricing"
                  className="rounded-xl border border-slate-300 bg-white px-8 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-100 md:text-base"
                >
                  View Pricing
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <p className="mono text-xs tracking-[0.18em] text-slate-500">WORKFLOW</p>
              <div className="mt-3 space-y-2">
                {STEP_ITEMS.map((step, index) => (
                  <div
                    key={step}
                    className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800"
                  >
                    <span>{step}</span>
                    <span className="mono text-xs text-slate-500">0{index + 1}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs text-cyan-900">
                Typical processing time: 10-30 seconds per file.
              </div>
            </div>
          </div>
        </section>

        <section className="card rise-in p-7 md:p-10">
          <div className="grid gap-4 md:grid-cols-2">
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="mono text-xs tracking-[0.15em] text-slate-500">FOR BUSINESSES</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">Standardize back-office operations</p>
              <p className="mt-2 text-sm text-slate-700 md:text-base">
                Process monthly invoice volume with a repeatable CSV workflow.
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="mono text-xs tracking-[0.15em] text-slate-500">FOR FREELANCERS</p>
              <p className="mt-2 text-2xl font-semibold text-slate-900">Cut manual bookkeeping time</p>
              <p className="mt-2 text-sm text-slate-700 md:text-base">
                Spend less time on data entry and more time on billable work.
              </p>
            </article>
          </div>
        </section>

        <section className="card rise-in p-7 md:p-10">
          <p className="mono text-xs tracking-[0.2em] text-slate-600">FEATURES</p>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {FEATURE_ITEMS.map((item) => (
              <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xl font-semibold text-slate-900 md:text-2xl">{item.title}</p>
                <p className="mt-2 text-sm text-slate-700 md:text-base">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="card card-strong rise-in p-7 md:p-12">
          <p className="mono text-xs tracking-[0.2em] text-slate-600">PRICING</p>
          <h2 className="mt-3 text-4xl font-semibold text-slate-900 md:text-5xl">Starter: $29/month</h2>
          <ul className="mt-6 space-y-2 text-base text-slate-700 md:text-lg">
            <li>- 100 invoices/month included</li>
            <li>- Additional invoices: $0.40 each</li>
          </ul>
          <p className="mt-8 text-sm font-semibold text-slate-800 md:text-base">Try 5 files free</p>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="rounded-xl bg-[color:var(--accent)] px-8 py-3 text-center text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] md:text-base"
            >
              Start Free Trial
            </Link>
            <Link
              href="/pricing"
              className="rounded-xl border border-slate-300 bg-white px-8 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-100 md:text-base"
            >
              Full Pricing
            </Link>
          </div>
        </section>

        <footer className="card p-5 text-sm text-slate-700 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p>InvoiceJP</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/legal/notice" className="underline underline-offset-4">Legal Notice</Link>
              <Link href="/legal/privacy" className="underline underline-offset-4">Privacy Policy</Link>
              <Link href="/legal/terms" className="underline underline-offset-4">Terms of Service</Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
