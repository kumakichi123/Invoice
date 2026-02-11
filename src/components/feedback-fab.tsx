"use client";

import { useState } from "react";
import { ContactForm } from "@/components/contact-form";

export function FeedbackFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Open feedback form"
        onClick={() => {
          setOpen((prev) => !prev);
        }}
        className="fixed bottom-5 right-5 z-40 rounded-full border border-amber-300 bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-900 shadow-lg shadow-amber-200 transition hover:bg-amber-300"
      >
        Contact
      </button>

      <span className="pointer-events-none fixed bottom-5 right-5 z-30 h-10 w-24 animate-pulse rounded-full bg-amber-200/70" />

      {open ? (
        <aside className="fixed bottom-20 right-5 z-50 w-[320px] rounded-xl border border-amber-200 bg-white p-3 shadow-2xl">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-900">Contact</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded border border-slate-300 px-2 py-1 text-xs"
            >
              X
            </button>
          </div>

          <div className="mt-3">
            <ContactForm
              onSent={() => {
                setTimeout(() => setOpen(false), 900);
              }}
            />
          </div>
        </aside>
      ) : null}
    </>
  );
}
