"use client";

import { useRef, useState, type ChangeEvent } from "react";

type ContactFormProps = {
  onSent?: () => void;
};

const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

export function ContactForm({ onSent }: ContactFormProps) {
  const [needsReply, setNeedsReply] = useState(false);
  const [message, setMessage] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function clearAttachment() {
    setAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function onAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    setError(null);

    if (!file) {
      setAttachment(null);
      return;
    }

    if (file.size > MAX_ATTACHMENT_BYTES) {
      setAttachment(null);
      setError("Attachment must be 10MB or smaller.");
      event.target.value = "";
      return;
    }

    setAttachment(file);
  }

  async function submit() {
    setStatus(null);
    setError(null);

    if (!message.trim()) {
      setError("Write a message.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("message", message.trim());
      formData.append("needsReply", needsReply ? "true" : "false");
      if (attachment) {
        formData.append("attachment", attachment);
      }

      const response = await fetch("/api/feedback", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(payload.error ?? "Failed to send.");
        return;
      }

      setStatus("Sent");
      setMessage("");
      setNeedsReply(false);
      clearAttachment();
      onSent?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50 via-white to-amber-50 p-4">
      <p className="text-sm font-semibold text-slate-900">We are happy to help with even the smallest questions.</p>
      <p className="mt-1 text-xs text-slate-600">
        Japanese accounting workflow, feature requests, bug reports, all welcome.
      </p>

      <label className="mt-3 flex items-center gap-2 text-xs text-slate-700">
        <input
          type="checkbox"
          checked={needsReply}
          onChange={(event) => setNeedsReply(event.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
        />
        Need reply
      </label>

      <textarea
        rows={7}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Questions (JP accounting/culture), requests, improvements"
        className="mt-2 w-full rounded-xl border border-cyan-200 bg-white/90 px-3 py-2.5 text-sm outline-none ring-cyan-200 transition focus:border-cyan-400 focus:ring-2"
      />

      <div className="mt-3 rounded-xl border border-cyan-200 bg-white/90 p-3">
        <p className="text-xs font-semibold text-slate-700">Attachment (optional, max 10MB)</p>
        <input
          ref={fileInputRef}
          type="file"
          onChange={onAttachmentChange}
          className="mt-2 w-full text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-cyan-100 file:px-3 file:py-1.5 file:font-semibold file:text-cyan-800 hover:file:bg-cyan-200"
        />
        {attachment ? (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-lg bg-cyan-50 px-2 py-1.5 text-xs text-slate-700">
            <span className="truncate">{attachment.name}</span>
            <button
              type="button"
              onClick={clearAttachment}
              className="shrink-0 rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs hover:bg-slate-50"
            >
              Remove
            </button>
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting}
          className="rounded-lg bg-gradient-to-r from-cyan-500 to-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Sending..." : "Send"}
        </button>
        {status ? <span className="text-xs font-medium text-emerald-700">{status}</span> : null}
        {error ? <span className="text-xs font-medium text-red-700">{error}</span> : null}
      </div>
    </div>
  );
}
