"use client";

import { useState } from "react";

type OpenBillingPortalButtonProps = {
  label?: string;
  className?: string;
};

export function OpenBillingPortalButton({
  label = "Open Billing Portal",
  className,
}: OpenBillingPortalButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function openPortal() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };

      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Failed to open billing portal.");
        return;
      }

      window.location.href = payload.url;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void openPortal()}
        disabled={loading}
        className={
          className ??
          "rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black disabled:opacity-60"
        }
      >
        {loading ? "Opening..." : label}
      </button>
      {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
