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
              <Link href="/legal/tokushoho" className="underline underline-offset-4">特商法</Link>
              <Link href="/legal/privacy" className="underline underline-offset-4">プライバシー</Link>
              <Link href="/legal/terms" className="underline underline-offset-4">利用規約</Link>
            </div>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="text-4xl font-semibold leading-tight text-slate-900 md:text-6xl">
                請求書をCSV化して
                <br />
                経理処理を短縮
              </h1>
              <p className="mt-4 max-w-2xl text-sm text-slate-700 md:text-base">
                日本語の請求書PDF・画像をAIで抽出し、レビュー後にそのままCSVへ。
                手入力の時間を削り、記帳や集計を安定化します。
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard"
                  className="rounded-xl bg-[color:var(--accent)] px-6 py-3 text-center text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)]"
                >
                  無料で試す
                </Link>
                <Link
                  href="/login"
                  className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-center text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  ログイン
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  "PDF / JPG / PNG",
                  "1ファイル最大10MB",
                  "最大20件を一括処理",
                  "レビュー編集対応",
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
                  "1. アップロード",
                  "2. AI抽出",
                  "3. 手動レビュー",
                  "4. CSV出力",
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
                <p className="text-xs text-slate-500">抽出フィールド例</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-700">
                  <dt>Vendor</dt>
                  <dd className="text-right">ABC商事</dd>
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
              <p className="mt-2 text-xl font-semibold text-slate-900">入力作業を削減</p>
              <p className="mt-2 text-sm text-slate-700">
                請求書の主要項目を自動抽出し、転記ミスを減らします。
              </p>
            </article>
            <article className="rounded-xl bg-white/75 px-4 py-4">
              <p className="mono text-xs text-slate-600">VALUE 02</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">レビュー前提で安心</p>
              <p className="mt-2 text-sm text-slate-700">
                低信頼フィールドを確認し、確定前に手直しできます。
              </p>
            </article>
            <article className="rounded-xl bg-white/75 px-4 py-4">
              <p className="mono text-xs text-slate-600">VALUE 03</p>
              <p className="mt-2 text-xl font-semibold text-slate-900">すぐに運用開始</p>
              <p className="mt-2 text-sm text-slate-700">
                ブラウザだけで使えるため、導入コストを抑えられます。
              </p>
            </article>
          </div>
        </section>

        <section className="card rise-in p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="mono text-xs tracking-[0.18em] text-slate-600">PRICING</p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">シンプルな従量課金</h2>
            </div>
            <p className="text-sm text-slate-700">
              月額プラン / 年額プラン / 超過従量の組み合わせ
            </p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">月額</p>
              <p className="mt-2 text-2xl font-semibold">$29<span className="text-sm font-normal">/mo</span></p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">年額</p>
              <p className="mt-2 text-2xl font-semibold">-20%</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-sm font-semibold text-slate-800">超過分</p>
              <p className="mt-2 text-2xl font-semibold">$0.40<span className="text-sm font-normal">/件</span></p>
            </div>
          </div>
        </section>

        <footer className="card p-5 text-sm text-slate-700 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p>InvoiceJP | Japanese Invoice to CSV</p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/legal/tokushoho" className="underline underline-offset-4">特商法に基づく表記</Link>
              <Link href="/legal/privacy" className="underline underline-offset-4">プライバシーポリシー</Link>
              <Link href="/legal/terms" className="underline underline-offset-4">利用規約</Link>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}
