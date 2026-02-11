"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function ResetPasswordPage() {
  const supabaseConfigured = isSupabaseConfigured();
  const supabase = useMemo(
    () => (supabaseConfigured ? getSupabaseBrowserClient() : null),
    [supabaseConfigured],
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }
      setHasRecoverySession(Boolean(data.session));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasRecoverySession(true);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!supabase) {
      setMessage("Set .env first");
      return;
    }
    if (!hasRecoverySession) {
      setMessage("Open the reset link from your email first");
      return;
    }
    if (!password || !confirmPassword) {
      setMessage("Both password fields are required");
      return;
    }
    if (password.length < 8) {
      setMessage("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Password confirmation does not match");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage("Failed to update password");
        return;
      }

      await supabase.auth.signOut();
      setMessage("Password updated. Please login with your new password.");
      setPassword("");
      setConfirmPassword("");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="card card-strong w-full max-w-md p-6 md:p-7">
        <p className="mono text-xs tracking-[0.2em] text-slate-600">INVOICEJP</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">Reset password</h1>
        <p className="mt-2 text-sm text-slate-600">
          Set a new password after opening the recovery link from your email.
        </p>

        <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="New password"
            autoComplete="new-password"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:opacity-50"
          >
            {isLoading ? "Please wait..." : "Update password"}
          </button>
        </form>

        {!hasRecoverySession ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Recovery session not found. Use the password reset link from your email.
          </p>
        ) : null}

        {message ? (
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            {message}
          </p>
        ) : null}

        <p className="mt-4 text-sm text-slate-600">
          Back to{" "}
          <Link href="/login" className="font-semibold text-slate-900 underline">
            Login
          </Link>
        </p>
      </section>
    </main>
  );
}
