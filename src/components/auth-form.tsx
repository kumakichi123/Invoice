"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthFormProps = {
  mode: "login" | "signup";
  supabaseConfigured: boolean;
};

export function AuthForm({ mode, supabaseConfigured }: AuthFormProps) {
  const supabase = useMemo(
    () => (supabaseConfigured ? getSupabaseBrowserClient() : null),
    [supabaseConfigured],
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [isResetLoading, setIsResetLoading] = useState(false);

  const isLogin = mode === "login";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!supabase) {
      setMessage("Set .env first");
      return;
    }
    if (!email || !password) {
      setMessage("Email + password required");
      return;
    }
    if (!isLogin && password !== confirmPassword) {
      setMessage("Password confirmation does not match");
      return;
    }
    if (!isLogin && password.length < 8) {
      setMessage("Password must be at least 8 characters");
      return;
    }

    setIsLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setMessage("Login failed");
          return;
        }
        window.location.href = "/dashboard";
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });

      if (error) {
        setMessage("Sign up failed");
        return;
      }

      if (data.session) {
        window.location.href = "/dashboard";
        return;
      }

      setMessage("Check your email");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetPassword() {
    setMessage(null);

    if (!supabase) {
      setMessage("Set .env first");
      return;
    }
    if (!email) {
      setMessage("Enter your email first");
      return;
    }

    setIsResetLoading(true);
    try {
      const redirectCandidates = buildResetRedirectCandidates();
      const errorMessages: string[] = [];

      for (const redirectTo of redirectCandidates) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
        if (!error) {
          setMessage("Password reset email sent");
          setShowResetPassword(false);
          return;
        }
        errorMessages.push(`${redirectTo}: ${error.message}`);
      }

      // Final fallback: send without redirectTo so Supabase uses Site URL.
      const { error: fallbackError } = await supabase.auth.resetPasswordForEmail(email);
      if (!fallbackError) {
        setMessage("Password reset email sent");
        setShowResetPassword(false);
        return;
      }

      errorMessages.push(`site_url_fallback: ${fallbackError.message}`);
      console.error("[auth] reset password failed", errorMessages);
      setMessage(buildResetFailureMessage(errorMessages));
    } finally {
      setIsResetLoading(false);
    }
  }

  async function handleGoogleAuth() {
    setMessage(null);

    if (!supabase) {
      setMessage("Set .env first");
      return;
    }

    setIsGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) {
        setMessage("Google login failed");
      }
    } finally {
      setIsGoogleLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="card card-strong w-full max-w-md p-6 md:p-7">
        <p className="mono text-xs tracking-[0.2em] text-slate-600">INVOICEJP</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">{isLogin ? "Login" : "Create account"}</h1>

        <button
          type="button"
          onClick={() => void handleGoogleAuth()}
          disabled={isGoogleLoading || isLoading}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <GoogleIcon />
          <span>{isGoogleLoading ? "Please wait..." : "Continue with Google"}</span>
        </button>

        <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
          <div className="h-px flex-1 bg-slate-200" />
          <span>or</span>
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            autoComplete={isLogin ? "current-password" : "new-password"}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
          {!isLogin ? (
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm password"
              autoComplete="new-password"
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          ) : null}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:opacity-50"
          >
            {isLoading ? "Please wait..." : isLogin ? "Login" : "Create account"}
          </button>
          {isLogin ? (
            <button
              type="button"
              onClick={() => setShowResetPassword((prev) => !prev)}
              className="w-full text-left text-xs font-medium text-slate-700 underline underline-offset-4"
            >
              Forgot password?
            </button>
          ) : null}
          {isLogin && showResetPassword ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">
              <p>Send a password reset link to your email.</p>
              <button
                type="button"
                onClick={() => void handleResetPassword()}
                disabled={isResetLoading || isLoading}
                className="mt-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-100 disabled:opacity-50"
              >
                {isResetLoading ? "Sending..." : "Send reset email"}
              </button>
            </div>
          ) : null}
        </form>

        {!supabaseConfigured ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Missing Supabase env vars.
          </p>
        ) : null}

        {message ? (
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
            {message}
          </p>
        ) : null}

        <div className="mt-4 text-sm text-slate-600">
          {isLogin ? (
            <p>
              New here?{" "}
              <Link href="/signup" className="font-semibold text-slate-900 underline">
                Create account
              </Link>
            </p>
          ) : (
            <p>
              Have an account?{" "}
              <Link href="/login" className="font-semibold text-slate-900 underline">
                Login
              </Link>
            </p>
          )}
        </div>

        <p className="mt-4 text-xs leading-5 text-slate-600">
          {isLogin ? "By logging in, you agree to the" : "By creating an account, you agree to the"}
          <Link href="/legal/terms" className="mx-1 underline underline-offset-4">
            Terms of Service
          </Link>
          and
          <Link href="/legal/privacy" className="mx-1 underline underline-offset-4">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </main>
  );
}

function buildResetRedirectCandidates(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  const path = "/reset-password";
  const currentOrigin = window.location.origin.replace(/\/$/, "");
  const configuredAppUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim().replace(/\/$/, "");

  const candidates = [`${currentOrigin}${path}`];
  if (configuredAppUrl) {
    candidates.push(`${configuredAppUrl}${path}`);
  }

  return Array.from(new Set(candidates.filter(Boolean)));
}

function buildResetFailureMessage(errors: string[]): string {
  const joined = errors.join(" | ").toLowerCase();
  if (joined.includes("redirect") || joined.includes("invalid") || joined.includes("not allowed")) {
    return "Failed to send reset email. Check Supabase Auth Redirect URLs for /reset-password.";
  }
  return "Failed to send reset email. Check Supabase email/auth settings and try again.";
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#EA4335"
        d="M9 7.36v3.46h4.95c-.2 1.11-.84 2.05-1.8 2.68l2.9 2.25c1.69-1.56 2.67-3.85 2.67-6.56 0-.63-.06-1.24-.16-1.83H9z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.17l-2.9-2.25c-.8.54-1.83.86-3.06.86-2.35 0-4.34-1.58-5.05-3.71H.95v2.34A9 9 0 0 0 9 18z"
      />
      <path
        fill="#4A90E2"
        d="M3.95 10.73A5.4 5.4 0 0 1 3.66 9c0-.6.1-1.18.29-1.73V4.93H.95A9 9 0 0 0 0 9c0 1.45.35 2.82.95 4.07l3-2.34z"
      />
      <path
        fill="#FBBC05"
        d="M9 3.58c1.32 0 2.5.45 3.43 1.32l2.57-2.57A8.97 8.97 0 0 0 9 0 9 9 0 0 0 .95 4.93l3 2.34C4.66 5.16 6.65 3.58 9 3.58z"
      />
    </svg>
  );
}
