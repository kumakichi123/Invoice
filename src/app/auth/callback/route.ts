import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const FALLBACK_PATH = "/dashboard";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const providerError = requestUrl.searchParams.get("error");
  const providerErrorDescription = requestUrl.searchParams.get("error_description");

  if (providerError) {
    const reason = [providerError, providerErrorDescription].filter(Boolean).join(": ");
    return redirectToLoginWithError(request, "oauth_provider_error", reason);
  }

  if (!code) {
    return redirectToLoginWithError(request, "missing_code");
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error(
      `[auth/callback] exchangeCodeForSession failed code=${error.code ?? "unknown"} message=${error.message}`,
    );
    return redirectToLoginWithError(request, "oauth_callback_failed", error.message);
  }

  return NextResponse.redirect(new URL(next, request.url));
}

function sanitizeNextPath(value: string | null): string {
  if (!value || !value.startsWith("/")) {
    return FALLBACK_PATH;
  }

  if (value.startsWith("//")) {
    return FALLBACK_PATH;
  }

  return value;
}

function redirectToLoginWithError(
  request: NextRequest,
  errorCode: string,
  reason?: string | null,
): NextResponse {
  const target = new URL("/login", request.url);
  target.searchParams.set("error", errorCode);
  if (reason) {
    target.searchParams.set("reason", reason.slice(0, 180));
  }
  return NextResponse.redirect(target);
}
