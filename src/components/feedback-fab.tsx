"use client";

import { useState } from "react";

export function FeedbackFab() {
  const [open, setOpen] = useState(false);
  const [needsReply, setNeedsReply] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setStatus(null);
    setError(null);

    if (!message.trim()) {
      setError("Write a message.");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message.trim(),
          needsReply,
        }),
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Failed to send.");
        return;
      }

      setStatus("Sent");
      setMessage("");
      setNeedsReply(false);
      setTimeout(() => {
        setOpen(false);
        setStatus(null);
      }, 900);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Open feedback form"
        onClick={() => {
          setOpen((prev) => !prev);
          setStatus(null);
          setError(null);
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

          <label className="mt-3 flex items-center gap-2 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={needsReply}
              onChange={(event) => setNeedsReply(event.target.checked)}
              className="h-4 w-4"
            />
            Need reply
          </label>

          <textarea
            rows={5}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Questions (JP accounting/culture), requests, improvements"
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />

          <div className="mt-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => void submit()}
              disabled={submitting}
              className="rounded-lg bg-amber-400 px-3 py-2 text-xs font-semibold text-slate-900 hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Sending..." : "Send"}
            </button>
            {status ? <span className="text-xs text-emerald-700">{status}</span> : null}
            {error ? <span className="text-xs text-red-700">{error}</span> : null}
          </div>
        </aside>
      ) : null}
    </>
  );
}
