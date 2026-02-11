import Link from "next/link";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-8 md:px-10 md:py-12">
      <div className="pointer-events-none absolute -left-24 top-16 h-56 w-56 rounded-full bg-emerald-300/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-0 h-64 w-64 rounded-full bg-amber-300/30 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-1/4 h-56 w-56 rounded-full bg-cyan-300/20 blur-3xl" />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="card card-strong rise-in p-6 md:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="mono text-xs tracking-[0.2em] text-slate-700">INVOICEJP</p>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
              <Link href="/legal/notice" className="underline underline-offset-4">Legal Notice</Link>
              <Link href="/legal/privacy" className="underline underline-offset-4">Privacy</Link>
              <Link href="/legal/terms" className="underline underline-offset-4">Terms</Link>
            </div>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="text-4xl font-semibold leading-tight text-slate-900 md:text-6xl">
                Convert Japanese invoices
                <br />
                into clean CSV
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-slate-700 md:text-base">
                Upload PDF or image invoices, extract key fields with AI, review quickly, and
                export production-ready CSV files for your accounting workflow. Built with
                Japanese invoice and bookkeeping context in mind.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="rounded-xl bg-[color:var(--accent)] px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)]"
                >
                  Start Free
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  Sign In
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  "PDF / JPG / PNG",
                  "Up to 10MB per file",
                  "Batch up to 20 files",
                  "Review and edit before export",
                  "Japan accounting context-aware",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-slate-300 bg-white/80 px-3 py-1 text-xs text-slate-700"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <p className="mono text-xs tracking-[0.18em] text-slate-500">FLOW PREVIEW</p>
              <div className="mt-3 space-y-2">
                {[
                  "1. Upload",
                  "2. AI extraction",
                  "3. Manual review",
                  "4. CSV export",
                ].map((step) => (
                  <div
                    key={step}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  >
                    {step}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500">Example extracted fields</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700">
                  <dt>Vendor</dt>
                  <dd className="text-right">ABC Trading Co.</dd>
                  <dt>Issue Date</dt>
                  <dd className="text-right">2026-02-10</dd>
                  <dt>Total</dt>
                  <dd className="text-right">JPY 128,700</dd>
                </dl>
              </div>
            </div>
          </div>
        </header>

        <section className="card rise-in p-5 md:p-6">
          <div className="grid gap-3 md:grid-cols-3">
            <article className="rounded-xl bg-white/75 px-4 py-4">
              <p className="mono text-xs text-slate-600">VALUE 01</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">Reduce Manual Entry</p>
              <p className="mt-2 text-sm text-slate-700">
                Auto-capture core invoice fields and cut down repetitive typing work.
              </p>
            </article>
            <article className="rounded-xl bg-white/75 px-4 py-4">
              <p className="mono text-xs text-slate-600">VALUE 02</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">Built for Review</p>
              <p className="mt-2 text-sm text-slate-700">
                Validate extraction output and fix edge cases before committing data.
              </p>
            </article>
            <article className="rounded-xl bg-white/75 px-4 py-4">
              <p className="mono text-xs text-slate-600">VALUE 03</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">Japan Accounting Context</p>
              <p className="mt-2 text-sm text-slate-700">
                Strong fit for Japanese bookkeeping practices, tax fields, and invoice wording.
              </p>
            </article>
          </div>
        </section>

        <section className="card rise-in p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mono text-xs tracking-[0.18em] text-slate-600">PRICING</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">Simple Subscription + Usage</h2>
            </div>
            <p className="text-sm text-slate-700">
              Monthly or yearly base plan plus usage overage.
            </p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">Monthly</p>
              <p className="mt-2 text-2xl font-semibold">$29<span className="text-sm font-normal">/mo</span></p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">Yearly</p>
              <p className="mt-2 text-2xl font-semibold">-20%</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">Overage</p>
              <p className="mt-2 text-2xl font-semibold">$0.40<span className="text-sm font-normal">/file</span></p>
            </div>
          </div>
        </section>

        <footer className="card p-5 text-sm text-slate-700 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p>InvoiceJP | Japanese Invoice to CSV</p>
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
