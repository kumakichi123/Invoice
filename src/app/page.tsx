import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-8 md:px-10 md:py-12">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
        <header className="card card-strong rise-in p-7 md:p-10">
          <p className="mono text-xs tracking-[0.2em] text-slate-700">JAPAN INVOICE</p>
          <h1 className="mt-3 text-5xl font-semibold text-slate-900 md:text-7xl">JP -&gt; CSV</h1>
          <p className="mono mt-4 text-sm text-slate-700">PDF | IMG | 8 FIELDS | JPY</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="rounded-xl bg-[color:var(--accent)] px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)]"
            >
              OPEN
            </Link>
            <Link
              href="/dashboard"
              className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              TRY
            </Link>
          </div>
        </header>

        <section className="card rise-in p-5 md:p-6">
          <div className="grid gap-3 text-center md:grid-cols-4">
            <div className="rounded-xl bg-white/75 px-3 py-4">
              <p className="mono text-xs text-slate-600">01</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">Upload</p>
            </div>
            <div className="rounded-xl bg-white/75 px-3 py-4">
              <p className="mono text-xs text-slate-600">02</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">Extract</p>
            </div>
            <div className="rounded-xl bg-white/75 px-3 py-4">
              <p className="mono text-xs text-slate-600">03</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">Edit</p>
            </div>
            <div className="rounded-xl bg-white/75 px-3 py-4">
              <p className="mono text-xs text-slate-600">04</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">CSV</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
