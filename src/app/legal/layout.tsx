import Link from "next/link";
import { missingLegalFieldLabels } from "@/lib/legal";

const links = [
  { href: "/legal/tokushoho", label: "特商法に基づく表記" },
  { href: "/legal/privacy", label: "プライバシーポリシー" },
  { href: "/legal/terms", label: "利用規約" },
];

export default function LegalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="min-h-screen px-4 py-8 md:px-8 md:py-10">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <header className="card card-strong p-5 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="mono text-xs tracking-[0.2em] text-slate-700">
              INVOICEJP
            </Link>
            <nav className="flex flex-wrap gap-3 text-xs text-slate-700">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="underline decoration-slate-400 underline-offset-4 hover:decoration-slate-700"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          {missingLegalFieldLabels.length > 0 ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              公開前に設定が必要な項目: {missingLegalFieldLabels.join(" / ")}
            </p>
          ) : null}
        </header>

        <section className="card p-5 md:p-7">{children}</section>
      </div>
    </main>
  );
}
