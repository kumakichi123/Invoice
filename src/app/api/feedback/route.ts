import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 3000;
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
const DEFAULT_FEEDBACK_ATTACHMENT_BUCKET = "feedback-attachments";

type FeedbackJsonPayload = {
  message?: unknown;
  needsReply?: unknown;
};

type ParsedFeedbackInput = {
  message: string;
  needsReply: boolean;
  attachment: File | null;
};

type AttachmentMeta = {
  bucket: string;
  path: string;
  fileName: string;
  contentType: string | null;
  sizeBytes: number;
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

    const parsed = await parseFeedbackInput(request);

    if (!parsed.message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    if (parsed.message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Message is too long." }, { status: 400 });
    }

    let attachmentMeta: AttachmentMeta | null = null;
    if (parsed.attachment) {
      if (parsed.attachment.size <= 0) {
        return NextResponse.json({ error: "Attached file is empty." }, { status: 400 });
      }
      if (parsed.attachment.size > MAX_ATTACHMENT_BYTES) {
        return NextResponse.json({ error: "Attachment must be 10MB or smaller." }, { status: 400 });
      }

      const bucket = process.env.FEEDBACK_ATTACHMENT_BUCKET ?? DEFAULT_FEEDBACK_ATTACHMENT_BUCKET;
      const objectPath = buildAttachmentPath(user.id, parsed.attachment.name);
      const bytes = new Uint8Array(await parsed.attachment.arrayBuffer());

      const admin = getSupabaseAdminClient();
      const { error: uploadError } = await admin.storage
        .from(bucket)
        .upload(objectPath, bytes, {
          contentType: parsed.attachment.type || "application/octet-stream",
          upsert: false,
        });

      if (uploadError) {
        return NextResponse.json({ error: `Attachment upload failed: ${uploadError.message}` }, { status: 500 });
      }

      attachmentMeta = {
        bucket,
        path: objectPath,
        fileName: parsed.attachment.name,
        contentType: parsed.attachment.type || null,
        sizeBytes: parsed.attachment.size,
      };
    }

    const { data, error: insertError } = await supabase
      .from("feedback_messages")
      .insert({
        user_id: user.id,
        message: parsed.message,
        needs_reply: parsed.needsReply,
        attachment_bucket: attachmentMeta?.bucket ?? null,
        attachment_path: attachmentMeta?.path ?? null,
        attachment_file_name: attachmentMeta?.fileName ?? null,
        attachment_content_type: attachmentMeta?.contentType ?? null,
        attachment_size_bytes: attachmentMeta?.sizeBytes ?? null,
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
      needsReply: parsed.needsReply,
      message: parsed.message,
      attachment: attachmentMeta,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function parseFeedbackInput(request: Request): Promise<ParsedFeedbackInput> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const messageValue = formData.get("message");
    const message = typeof messageValue === "string"
      ? messageValue.trim()
      : "";
    const needsReply = parseBoolean(formData.get("needsReply"));
    const attachmentValue = formData.get("attachment");
    const attachment = attachmentValue instanceof File && attachmentValue.size > 0
      ? attachmentValue
      : null;

    return { message, needsReply, attachment };
  }

  const body = (await request.json().catch(() => ({}))) as FeedbackJsonPayload;
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const needsReply = parseBoolean(body.needsReply);
  return { message, needsReply, attachment: null };
}

function parseBoolean(value: unknown): boolean {
  if (value === true) {
    return true;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return false;
}

function buildAttachmentPath(userId: string, originalName: string): string {
  const datePrefix = new Date().toISOString().slice(0, 10);
  const safeName = sanitizeFileName(originalName);
  return `${userId}/${datePrefix}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
}

function sanitizeFileName(fileName: string): string {
  const fallback = "attachment.bin";
  const trimmed = fileName.trim();
  const safe = (trimmed || fallback).replace(/[^a-zA-Z0-9._-]/g, "_");
  return safe.slice(0, 120) || fallback;
}

async function notifyByEmailIfConfigured(input: {
  id: string;
  createdAt: string;
  userId: string;
  needsReply: boolean;
  message: string;
  attachment: AttachmentMeta | null;
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

  const attachmentSummary = input.attachment
    ? [
        "Attachment:",
        `- name: ${input.attachment.fileName}`,
        `- size: ${input.attachment.sizeBytes} bytes`,
        `- type: ${input.attachment.contentType ?? "unknown"}`,
        `- path: ${input.attachment.bucket}/${input.attachment.path}`,
      ].join("\n")
    : "Attachment: none";

  const text = [
    `Feedback ID: ${input.id}`,
    `Created: ${input.createdAt}`,
    `User ID: ${input.userId}`,
    `Needs reply: ${input.needsReply ? "yes" : "no"}`,
    attachmentSummary,
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
