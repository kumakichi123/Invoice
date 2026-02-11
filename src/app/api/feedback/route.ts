import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type FeedbackPayload = {
  message?: unknown;
  needsReply?: unknown;
};

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 500 });
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as FeedbackPayload;
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const needsReply = body.needsReply === true;

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    if (message.length > 3000) {
      return NextResponse.json({ error: "Message is too long." }, { status: 400 });
    }

    const { data, error: insertError } = await supabase
      .from("feedback_messages")
      .insert({
        user_id: user.id,
        message,
        needs_reply: needsReply,
      })
      .select("id, created_at")
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    await notifyByEmailIfConfigured({
      id: data.id,
      createdAt: data.created_at,
      userId: user.id,
      needsReply,
      message,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function notifyByEmailIfConfigured(input: {
  id: string;
  createdAt: string;
  userId: string;
  needsReply: boolean;
  message: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const notifyTo = process.env.FEEDBACK_NOTIFY_TO;
  const notifyFrom = process.env.FEEDBACK_NOTIFY_FROM;

  if (!apiKey || !notifyTo || !notifyFrom) {
    return;
  }

  const subject = input.needsReply
    ? `[InvoiceJP] Feedback (reply requested) - ${input.userId}`
    : `[InvoiceJP] Feedback - ${input.userId}`;

  const text = [
    `Feedback ID: ${input.id}`,
    `Created: ${input.createdAt}`,
    `User ID: ${input.userId}`,
    `Needs reply: ${input.needsReply ? "yes" : "no"}`,
    "",
    input.message,
  ].join("\n");

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: notifyFrom,
        to: [notifyTo],
        subject,
        text,
      }),
    });
  } catch {
    // Notification is optional. DB insert already succeeded.
  }
}
