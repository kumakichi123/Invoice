import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const FALLBACK_PATH = "/dashboard";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", request.url));
  }

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(new URL("/login?error=oauth_callback_failed", request.url));
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
