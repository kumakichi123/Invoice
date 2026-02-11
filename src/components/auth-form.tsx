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
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <section className="card card-strong w-full max-w-md p-6 md:p-7">
        <p className="mono text-xs tracking-[0.2em] text-slate-600">INVOICEJP</p>
        <h1 className="mt-2 text-3xl font-semibold text-slate-900">{isLogin ? "Login" : "Create account"}</h1>

        <form className="mt-5 space-y-3" onSubmit={handleSubmit}>
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
          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:opacity-50"
          >
            {isLoading ? "Please wait..." : isLogin ? "Login" : "Create account"}
          </button>
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
