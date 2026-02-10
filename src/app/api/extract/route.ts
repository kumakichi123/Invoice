import { NextResponse } from "next/server";
import { type InvoiceFields } from "@/lib/invoice";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

type DifyUploadResponse = {
  id?: string;
};

type DifyInvoiceFields = Pick<
  InvoiceFields,
  "vendor" | "invoiceNumber" | "issueDate" | "dueDate" | "currency" | "subtotal" | "taxAmount" | "total"
>;

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

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required." }, { status: 400 });
    }

    if (file.size <= 0) {
      return NextResponse.json({ error: "Uploaded file is empty." }, { status: 400 });
    }

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

    const difyResponse = await fetch(`${baseUrl}/v1/workflows/run`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {
          invoice_file: {
            type: file.type.startsWith("image/") ? "image" : "document",
            transfer_method: "local_file",
            upload_file_id: uploadedFileId,
          },
        },
        response_mode: "blocking",
        user: user.id,
      }),
    });

    if (!difyResponse.ok) {
      const body = await safeText(difyResponse);
      return NextResponse.json(
        { error: `Dify workflow failed (${difyResponse.status}): ${body}` },
        { status: 502 },
      );
    }

    const workflowResult = (await difyResponse.json()) as Record<string, unknown>;
    const outputs = getDifyOutputs(workflowResult);
    const fixedFields = extractFixedInvoiceFields(outputs);

    return NextResponse.json({ fields: fixedFields, raw: outputs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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
    throw new Error(`Dify file upload failed (${response.status}): ${failureText}`);
  }

  const payload = (await response.json()) as DifyUploadResponse;
  if (!payload.id) {
    throw new Error("Dify upload response does not include file id.");
  }

  return payload.id;
}

function getDifyOutputs(response: Record<string, unknown>): unknown {
  const data = response.data;
  if (isRecord(data) && "outputs" in data) {
    return data.outputs;
  }

  if ("outputs" in response) {
    return response.outputs;
  }

  return {};
}

function extractFixedInvoiceFields(outputs: unknown): DifyInvoiceFields {
  const payload = parseJsonIfString(outputs);
  if (!isRecord(payload)) {
    throw new Error("Dify output must be a JSON object.");
  }

  return {
    vendor: toFieldString(payload.vendor),
    invoiceNumber: toFieldString(payload.invoiceNumber),
    issueDate: toFieldString(payload.issueDate),
    dueDate: toFieldString(payload.dueDate),
    currency: "JPY",
    subtotal: toAmountString(payload.subtotal),
    taxAmount: toAmountString(payload.taxAmount),
    total: toAmountString(payload.total),
  };
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

function toFieldString(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function toAmountString(value: unknown): string {
  const raw = toFieldString(value);
  if (!raw) {
    return "";
  }
  const compact = raw.replace(/,/g, "").replace(/[^0-9.-]/g, "");
  if (!compact) {
    return "";
  }
  const parsed = Number(compact);
  return Number.isFinite(parsed) ? String(parsed) : "";
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
