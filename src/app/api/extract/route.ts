import { NextResponse } from "next/server";
import {
  normalizeInvoiceConfidence,
  normalizeInvoiceFields,
  type InvoiceFieldConfidence,
  type InvoiceFields,
} from "@/lib/invoice";
import { isActiveBillingStatus, isStripeBillingConfigured } from "@/lib/billing";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getStripeServerClient } from "@/lib/stripe/server";

export const runtime = "nodejs";

const DIFY_MAX_RETRIES = 2;
const DIFY_STREAM_TIMEOUT_MS = 240_000;
const DIFY_TOTAL_BUDGET_MS = 320_000;
const FREE_EXTRACTIONS_WITHOUT_PLAN = 5;

type DifyUploadResponse = {
  id?: string;
};

type DifyExtractPayload = {
  fields: InvoiceFields;
  confidence: InvoiceFieldConfidence;
};

export async function POST(request: Request) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: "Supabase environment values are missing." },
        { status: 500 },
      );
    }

    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in first." }, { status: 401 });
    }

    let stripeCustomerIdForUsage: string | null = null;
    if (isStripeBillingConfigured()) {
      const { data: billingProfile, error: billingError } = await supabase
        .from("billing_customers")
        .select("stripe_subscription_status, stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (billingError) {
        return NextResponse.json({ error: "Billing profile lookup failed." }, { status: 500 });
      }

      if (!isActiveBillingStatus(billingProfile?.stripe_subscription_status)) {
        const { count: processedCount, error: countError } = await supabase
          .from("invoice_exports")
          .select("id", { head: true, count: "exact" })
          .eq("user_id", user.id);

        if (countError) {
          return NextResponse.json({ error: "Usage lookup failed." }, { status: 500 });
        }

        if ((processedCount ?? 0) >= FREE_EXTRACTIONS_WITHOUT_PLAN) {
          return NextResponse.json(
            { error: "Subscription required. Start a plan from Billing." },
            { status: 402 },
          );
        }
      }

      stripeCustomerIdForUsage = billingProfile?.stripe_customer_id ?? null;
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
    }

    console.info(
      `[extract] Start user=${user.id} file=${file.name} size=${file.size} type=${file.type || "unknown"}`,
    );

    const apiKey = process.env.DIFY_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing DIFY_API_KEY in server environment." },
        { status: 500 },
      );
    }

    const baseUrl = (process.env.DIFY_BASE_URL ?? "https://api.dify.ai").replace(/\/$/, "");

    const uploadedFileId = await uploadToDify({
      baseUrl,
      apiKey,
      file,
      userId: user.id,
    });
    console.info(`[extract] Uploaded to Dify file_id=${uploadedFileId}`);

    const workflowResult = await runWorkflowWithRetry({
      baseUrl,
      apiKey,
      userId: user.id,
      uploadFileId: uploadedFileId,
      inputType: file.type.startsWith("image/") ? "image" : "document",
    });

    if (!workflowResult.ok) {
      console.error(
        `[extract] Dify workflow failed status=${workflowResult.status} body=${workflowResult.body}`,
      );
      return NextResponse.json(
        { error: `Dify workflow failed (${workflowResult.status}): ${workflowResult.body}` },
        { status: 502 },
      );
    }

    console.info(`[extract] Dify raw response=${safeJsonStringify(workflowResult.json)}`);

    const outputs = getDifyOutputs(workflowResult.json);
    let extracted: DifyExtractPayload;
    try {
      extracted = extractFixedInvoiceFields(outputs);
    } catch (mappingError) {
      const message =
        mappingError instanceof Error ? mappingError.message : "Fixed-field mapping failed.";
      console.error(
        `[extract] Mapping failed message=${message} outputs=${safeJsonStringify(outputs)}`,
      );
      return NextResponse.json(
        {
          error: `Dify output mapping failed: ${message}`,
          raw: workflowResult.json,
          raw_outputs: outputs,
        },
        { status: 422 },
      );
    }

    if (stripeCustomerIdForUsage && process.env.STRIPE_METER_EVENT_NAME) {
      try {
        const stripe = getStripeServerClient();
        await stripe.billing.meterEvents.create({
          event_name: process.env.STRIPE_METER_EVENT_NAME,
          payload: {
            stripe_customer_id: stripeCustomerIdForUsage,
            value: "1",
          },
          timestamp: Math.floor(Date.now() / 1000),
        });
      } catch (usageError) {
        const message = usageError instanceof Error ? usageError.message : "Unknown usage error";
        console.error(`[extract] Stripe usage record failed user=${user.id} error=${message}`);
      }
    }

    return NextResponse.json({
      fields: extracted.fields,
      confidence: extracted.confidence,
      raw: workflowResult.json,
      raw_outputs: outputs,
      raw_stream_events: workflowResult.streamEvents,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    console.error(`[extract] Unexpected error=${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function runWorkflowWithRetry(params: {
  baseUrl: string;
  apiKey: string;
  userId: string;
  uploadFileId: string;
  inputType: "image" | "document";
}): Promise<
  | { ok: true; json: unknown; streamEvents: unknown[] }
  | { ok: false; status: number; body: string }
> {
  const startedAt = Date.now();

  for (let attempt = 1; attempt <= DIFY_MAX_RETRIES; attempt += 1) {
    if (Date.now() - startedAt > DIFY_TOTAL_BUDGET_MS) {
      return { ok: false, status: 504, body: "Dify workflow timeout." };
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DIFY_STREAM_TIMEOUT_MS);

    try {
      const response = await fetch(`${params.baseUrl}/v1/workflows/run`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${params.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          inputs: {
            invoice_file: {
              type: params.inputType,
              transfer_method: "local_file",
              upload_file_id: params.uploadFileId,
            },
          },
          response_mode: "streaming",
          user: params.userId,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const streamed = await readDifyWorkflowStream(response, {
          baseUrl: params.baseUrl,
          apiKey: params.apiKey,
        });
        if (!streamed.ok) {
          if (attempt < DIFY_MAX_RETRIES) {
            await sleep(attempt * 1200);
            continue;
          }
          return { ok: false, status: streamed.status, body: streamed.body };
        }

        return { ok: true, json: streamed.json, streamEvents: streamed.streamEvents };
      }

      const body = await safeText(response);
      const friendlyBody = simplifyDifyFailureBody(body);

      console.error(
        `[extract] Dify workflow attempt=${attempt}/${DIFY_MAX_RETRIES} failed status=${response.status} body=${friendlyBody}`,
      );

      if (attempt < DIFY_MAX_RETRIES && isRetryableStatus(response.status)) {
        await sleep(attempt * 1200);
        continue;
      }

      return { ok: false, status: response.status, body: friendlyBody };
    } catch (error) {
      clearTimeout(timeout);

      const message = error instanceof Error ? error.message : "Unknown fetch error";
      console.error(
        `[extract] Dify workflow attempt=${attempt}/${DIFY_MAX_RETRIES} exception=${message}`,
      );

      if (attempt < DIFY_MAX_RETRIES) {
        await sleep(attempt * 1200);
        continue;
      }

      return { ok: false, status: 504, body: simplifyDifyFailureBody(message) };
    }
  }

  return { ok: false, status: 504, body: "Dify workflow timeout." };
}

async function readDifyWorkflowStream(
  response: Response,
  client: { baseUrl: string; apiKey: string },
): Promise<
  | { ok: true; json: unknown; streamEvents: unknown[] }
  | { ok: false; status: number; body: string }
> {
  if (!response.body) {
    return { ok: false, status: 502, body: "Dify streaming response has no body." };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let workflowRunId = "";
  let lastError = "";
  let finishedPayload: unknown = null;
  let taskId = "";
  const streamEvents: unknown[] = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      const payload = parseSseChunk(chunk);
      if (!payload) {
        continue;
      }

      streamEvents.push(payload);

      if (!isRecord(payload)) {
        continue;
      }

      const eventType = typeof payload.event === "string" ? payload.event : "";
      if (!workflowRunId) {
        workflowRunId = firstString(
          asString(payload.workflow_run_id),
          isRecord(payload.data) ? asString(payload.data.id) : null,
          isRecord(payload.data) ? asString(payload.data.workflow_run_id) : null,
        );
      }
      if (!taskId) {
        taskId = firstString(asString(payload.task_id), isRecord(payload.data) ? asString(payload.data.task_id) : null);
      }

      if (eventType === "workflow_finished") {
        finishedPayload = payload;
      }

      if (eventType === "error") {
        lastError = firstString(
          asString(payload.message),
          asString(payload.error),
          isRecord(payload.data) ? asString(payload.data.error) : null,
        );
      }
    }
  }

  const lastPayload = parseSseChunk(buffer);
  if (lastPayload) {
    streamEvents.push(lastPayload);
    if (isRecord(lastPayload)) {
      const eventType = typeof lastPayload.event === "string" ? lastPayload.event : "";
      if (!workflowRunId) {
        workflowRunId = firstString(
          asString(lastPayload.workflow_run_id),
          isRecord(lastPayload.data) ? asString(lastPayload.data.id) : null,
          isRecord(lastPayload.data) ? asString(lastPayload.data.workflow_run_id) : null,
        );
      }
      if (eventType === "workflow_finished") {
        finishedPayload = lastPayload;
      }
      if (eventType === "error") {
        lastError = firstString(
          asString(lastPayload.message),
          asString(lastPayload.error),
          isRecord(lastPayload.data) ? asString(lastPayload.data.error) : null,
        );
      }
    }
  }

  if (finishedPayload) {
    return { ok: true, json: finishedPayload, streamEvents };
  }

  if (workflowRunId) {
    const detail = await getWorkflowRunDetail({
      baseUrl: client.baseUrl,
      apiKey: client.apiKey,
      workflowRunId,
    });

    if (detail.ok) {
      return {
        ok: true,
        json: {
          event: "workflow_finished_fallback",
          workflow_run_id: workflowRunId,
          task_id: taskId || null,
          data: detail.data,
        },
        streamEvents,
      };
    }
  }

  if (lastError) {
    return { ok: false, status: 502, body: lastError };
  }

  return {
    ok: false,
    status: 504,
    body: "Dify stream ended without workflow_finished event.",
  };
}

async function getWorkflowRunDetail(params: {
  baseUrl: string;
  apiKey: string;
  workflowRunId: string;
}): Promise<{ ok: true; data: unknown } | { ok: false }> {
  if (!params.baseUrl || !params.apiKey || !params.workflowRunId) {
    return { ok: false };
  }

  const token = params.apiKey.replace(/^Bearer\s+/i, "");
  const response = await fetch(`${params.baseUrl}/v1/workflows/run/${params.workflowRunId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    return { ok: false };
  }

  const data = (await response.json()) as unknown;
  return { ok: true, data };
}

function parseSseChunk(chunk: string): unknown {
  const normalizedChunk = chunk.trim();
  if (!normalizedChunk) {
    return null;
  }

  const lines = normalizedChunk.split(/\r?\n/);
  const dataLines: string[] = [];
  let explicitEvent = "";

  for (const line of lines) {
    if (line.startsWith("event:")) {
      explicitEvent = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  const dataText = dataLines.join("\n").trim();
  if (!dataText || dataText === "[DONE]") {
    return null;
  }

  const parsed = parseJsonIfString(dataText);
  if (isRecord(parsed)) {
    if (explicitEvent && !("event" in parsed)) {
      return { ...parsed, event: explicitEvent };
    }
    return parsed;
  }

  if (!explicitEvent) {
    return parsed;
  }

  return {
    event: explicitEvent,
    data: parsed,
  };
}

async function uploadToDify(params: {
  baseUrl: string;
  apiKey: string;
  file: File;
  userId: string;
}): Promise<string> {
  const body = new FormData();
  body.append("file", params.file, params.file.name);
  body.append("user", params.userId);

  const response = await fetch(`${params.baseUrl}/v1/files/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
    },
    body,
  });

  if (!response.ok) {
    const failureText = await safeText(response);
    console.error(`[extract] Dify upload failed status=${response.status} body=${failureText}`);
    throw new Error(`Dify file upload failed (${response.status}): ${failureText}`);
  }

  const payload = (await response.json()) as DifyUploadResponse;
  console.info(`[extract] Dify upload response=${safeJsonStringify(payload)}`);
  if (!payload.id) {
    throw new Error("Dify upload response does not include file id.");
  }

  return payload.id;
}

function getDifyOutputs(response: unknown): unknown {
  if (!isRecord(response)) {
    return {};
  }

  const data = response.data;
  if (isRecord(data) && "outputs" in data) {
    return data.outputs;
  }

  if ("outputs" in response) {
    return response.outputs;
  }

  return {};
}

function extractFixedInvoiceFields(outputs: unknown): DifyExtractPayload {
  const payload = resolveInvoicePayload(outputs);
  if (!isRecord(payload)) {
    throw new Error("Dify output must be a JSON object.");
  }

  const fields = normalizeInvoiceFields(payload);
  const confidence = normalizeInvoiceConfidence(payload.confidence);
  return { fields, confidence };
}

function resolveInvoicePayload(outputs: unknown): unknown {
  let current = parseJsonIfString(outputs);

  for (let i = 0; i < 3; i += 1) {
    if (!isRecord(current)) {
      return current;
    }

    if ("vendor" in current || "invoiceNumber" in current || "issueDate" in current) {
      return current;
    }

    if ("outputs" in current) {
      current = parseJsonIfString(current.outputs);
      continue;
    }

    return current;
  }

  return current;
}

function parseJsonIfString(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "No response body";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function firstString(...values: Array<string | null>): string {
  for (const value of values) {
    if (value) {
      return value;
    }
  }
  return "";
}

function safeJsonStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return "[unserializable]";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status === 500 || status === 502 || status === 503;
}

function simplifyDifyFailureBody(body: string): string {
  const lower = body.toLowerCase();

  if (lower.includes("cloudflare") && lower.includes("gateway time-out")) {
    const rayIdMatch = body.match(/Cloudflare Ray ID:\s*<strong[^>]*>([^<]+)<\/strong>/i);
    const rayIdSuffix = rayIdMatch?.[1] ? ` (Ray ID: ${rayIdMatch[1]})` : "";
    return `Dify gateway timeout via Cloudflare${rayIdSuffix}`;
  }

  const compact = body.replace(/\s+/g, " ").trim();
  return compact.slice(0, 500);
}
