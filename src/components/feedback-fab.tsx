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
        className="fixed bottom-5 right-5 z-40 rounded-full border border-cyan-200 bg-gradient-to-r from-cyan-300 via-sky-300 to-amber-300 px-5 py-2.5 text-xs font-semibold text-slate-900 shadow-lg shadow-cyan-200 transition hover:scale-[1.02] hover:brightness-95"
      >
        Contact
      </button>

      <span className="pointer-events-none fixed bottom-5 right-5 z-30 h-11 w-28 animate-pulse rounded-full bg-cyan-200/70" />

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close contact form"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px]"
          />
          <aside className="fixed bottom-5 right-5 z-50 w-[92vw] max-w-[520px] rounded-2xl border border-cyan-100 bg-white p-4 shadow-2xl shadow-cyan-100 md:bottom-7 md:right-7 md:p-5">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-slate-900">Contact</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-slate-300 px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
              >
                Close
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
        </>
      ) : null}
    </>
  );
}
