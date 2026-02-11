import Link from "next/link";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function GuidePage() {
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

  return (
    <main className="min-h-screen bg-[#f4f5f8] text-slate-900">
      <div className="mx-auto max-w-4xl px-4 py-6 md:px-6">
        <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h1 className="text-3xl font-semibold tracking-tight">How to use InvoiceJP</h1>
            <Link href="/settings" className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100">
              Back to settings
            </Link>
          </div>
        </header>

        <section className="mt-4 space-y-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Step 1</p>
            <h2 className="mt-2 text-xl font-semibold">Upload files</h2>
            <p className="mt-2 text-sm text-slate-600">
              Drop PDF/JPG/PNG files. Maximum is 20 files and 10MB per file.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Step 2</p>
            <h2 className="mt-2 text-xl font-semibold">Review extracted fields</h2>
            <p className="mt-2 text-sm text-slate-600">
              Open Review from each processed card and edit any field before final export.
            </p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Step 3</p>
            <h2 className="mt-2 text-xl font-semibold">Download CSV</h2>
            <p className="mt-2 text-sm text-slate-600">
              Download per file or select multiple completed files and download ZIP in one action.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}
