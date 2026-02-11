"use client";

import JSZip from "jszip";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  createEmptyInvoiceFields,
  invoiceFieldsToCsv,
  normalizeInvoiceConfidence,
  normalizeInvoiceFields,
  toNullableNumber,
  type InvoiceFieldConfidence,
  type InvoiceFields,
} from "@/lib/invoice";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { FeedbackFab } from "@/components/feedback-fab";
import { isActiveBillingStatus } from "@/lib/billing";

const MAX_FILES = 20;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const REVIEW_FIELD_CONFIG: Array<{
  key: keyof InvoiceFields;
  label: string;
  type?: "text" | "date" | "time";
  multiline?: boolean;
}> = [
  { key: "vendor", label: "Vendor" },
  { key: "vendorRegistrationNumber", label: "Reg. Number" },
  { key: "invoiceNumber", label: "Invoice No" },
  { key: "issueDate", label: "Issue Date", type: "date" },
  { key: "issueTime", label: "Issue Time", type: "time" },
  { key: "dueDate", label: "Due Date", type: "date" },
  { key: "currency", label: "Currency" },
  { key: "subtotal", label: "Subtotal" },
  { key: "taxAmount", label: "Tax Amount" },
  { key: "total", label: "Total" },
  { key: "totalAmountTaxInc", label: "Total (Tax Inc.)" },
  { key: "tax10TargetAmount", label: "Tax 10% Target" },
  { key: "tax10Amount", label: "Tax 10% Amount" },
  { key: "tax8TargetAmount", label: "Tax 8% Target" },
  { key: "tax8Amount", label: "Tax 8% Amount" },
  { key: "paymentMethod", label: "Payment Method" },
  { key: "documentType", label: "Document Type" },
  { key: "notes", label: "Notes", multiline: true },
];

const FIELD_HELP: Record<keyof InvoiceFields, string> = {
  vendor: "Store or supplier name.",
  vendorRegistrationNumber: "Japanese invoice registration number (T + 13 digits).",
  invoiceNumber: "Invoice or receipt number.",
  issueDate: "Issue date in YYYY-MM-DD.",
  issueTime: "Issue time in HH:mm (24h).",
  dueDate: "Payment due date. Leave blank if not present.",
  currency: "Currency code. Usually JPY.",
  subtotal: "Amount before tax.",
  taxAmount: "Total consumption tax.",
  total: "Grand total including tax.",
  totalAmountTaxInc: "Total amount including tax.",
  tax10TargetAmount: "Taxable amount at 10%.",
  tax10Amount: "Tax amount at 10%.",
  tax8TargetAmount: "Taxable amount at 8%.",
  tax8Amount: "Tax amount at 8%.",
  paymentMethod: "Payment method such as card or cash.",
  documentType: "Document type: receipt or invoice.",
  notes: "Optional notes for manual correction.",
};

type InvoiceMvpProps = {
  initialUser: User | null;
  supabaseConfigured: boolean;
  initialExports: InitialExportRow[];
  currentPage: number;
  totalPages: number;
  totalExports: number;
  billingConfigured: boolean;
  billing: {
    stripe_subscription_status: string | null;
    early_bird_applied: boolean;
  };
};

type QueueStatus = "queued" | "processing" | "done" | "needs_review" | "failed";
type Confidence = "Low" | "Med" | "High";
type QueueSource = "upload" | "db";

type InitialExportRow = {
  id: string;
  source_file_name: string | null;
  vendor: string | null;
  vendor_registration_number: string | null;
  invoice_number: string | null;
  issue_date: string | null;
  issue_time: string | null;
  due_date: string | null;
  currency: string | null;
  subtotal: string | number | null;
  tax_amount: string | number | null;
  total: string | number | null;
  total_amount_tax_inc: string | number | null;
  tax10_target_amount: string | number | null;
  tax10_amount: string | number | null;
  tax8_target_amount: string | number | null;
  tax8_amount: string | number | null;
  payment_method: string | null;
  document_type: string | null;
  notes: string | null;
  raw_json: unknown;
  created_at: string;
};

type QueueItem = {
  id: string;
  dbId: string | null;
  source: QueueSource;
  createdAt: number;
  processedAt: number | null;
  selected: boolean;
  file: File | null;
  name: string;
  size: number;
  status: QueueStatus;
  progress: number;
  fields: InvoiceFields;
  confidence: InvoiceFieldConfidence;
  error: string | null;
};

type ExtractResponse = {
  fields?: unknown;
  confidence?: unknown;
  raw?: unknown;
  error?: string;
};

type SaveExportResult = {
  id: string | null;
  error: string | null;
};

export function InvoiceMvp({
  initialUser,
  supabaseConfigured,
  initialExports,
  currentPage,
  totalPages,
  totalExports,
  billingConfigured,
  billing,
}: InvoiceMvpProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const supabase = useMemo(
    () => (supabaseConfigured ? getSupabaseBrowserClient() : null),
    [supabaseConfigured],
  );
  const user = initialUser;

  const [showHelp, setShowHelp] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>(() =>
    initialExports.map((row) => createQueueItemFromExport(row)),
  );
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const [isBillingActionRunning, setIsBillingActionRunning] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reviewItem = queue.find((item) => item.id === reviewId) ?? null;
  const sortedQueue = [...queue].sort((a, b) => b.createdAt - a.createdAt);
  const hasActivePlan = isActiveBillingStatus(billing.stripe_subscription_status);

  const selectedCount = queue.filter((item) => item.selected).length;
  const completedCount = queue.filter(
    (item) => item.status === "done" || item.status === "needs_review",
  ).length;
  const selectedCompleted = queue.filter(
    (item) => item.selected && (item.status === "done" || item.status === "needs_review"),
  );

  const saveExport = useCallback(async (item: QueueItem): Promise<SaveExportResult> => {
    if (!supabase || !user) {
      return { id: null, error: "Supabase session is missing" };
    }

    const rawJson = createPersistedRawJson(item.fields, item.confidence);

    if (item.source === "db" && item.dbId) {
      const { data, error: updateError } = await supabase
        .from("invoice_exports")
        .update({
          source_file_name: item.name,
          vendor: item.fields.vendor,
          vendor_registration_number: normalizeTextForDb(item.fields.vendorRegistrationNumber),
          invoice_number: item.fields.invoiceNumber,
          issue_date: normalizeDateForDb(item.fields.issueDate),
          issue_time: normalizeTimeForDb(item.fields.issueTime),
          due_date: normalizeDateForDb(item.fields.dueDate),
          currency: item.fields.currency || "JPY",
          subtotal: toNullableNumber(item.fields.subtotal),
          tax_amount: toNullableNumber(item.fields.taxAmount),
          total: toNullableNumber(item.fields.total),
          total_amount_tax_inc: toNullableNumber(item.fields.totalAmountTaxInc),
          tax10_target_amount: toNullableNumber(item.fields.tax10TargetAmount),
          tax10_amount: toNullableNumber(item.fields.tax10Amount),
          tax8_target_amount: toNullableNumber(item.fields.tax8TargetAmount),
          tax8_amount: toNullableNumber(item.fields.tax8Amount),
          payment_method: normalizeTextForDb(item.fields.paymentMethod),
          document_type: normalizeDocumentTypeForDb(item.fields.documentType),
          notes: normalizeTextForDb(item.fields.notes),
          raw_json: rawJson,
        })
        .eq("id", item.dbId)
        .eq("user_id", user.id)
        .select("id")
        .single();

      if (updateError) {
        return { id: null, error: updateError.message };
      }

      return { id: data?.id ?? item.dbId, error: null };
    }

    const { data, error: insertError } = await supabase.from("invoice_exports").insert({
      user_id: user.id,
      source_file_name: item.name,
      vendor: item.fields.vendor,
      vendor_registration_number: normalizeTextForDb(item.fields.vendorRegistrationNumber),
      invoice_number: item.fields.invoiceNumber,
      issue_date: normalizeDateForDb(item.fields.issueDate),
      issue_time: normalizeTimeForDb(item.fields.issueTime),
      due_date: normalizeDateForDb(item.fields.dueDate),
      currency: item.fields.currency || "JPY",
      subtotal: toNullableNumber(item.fields.subtotal),
      tax_amount: toNullableNumber(item.fields.taxAmount),
      total: toNullableNumber(item.fields.total),
      total_amount_tax_inc: toNullableNumber(item.fields.totalAmountTaxInc),
      tax10_target_amount: toNullableNumber(item.fields.tax10TargetAmount),
      tax10_amount: toNullableNumber(item.fields.tax10Amount),
      tax8_target_amount: toNullableNumber(item.fields.tax8TargetAmount),
      tax8_amount: toNullableNumber(item.fields.tax8Amount),
      payment_method: normalizeTextForDb(item.fields.paymentMethod),
      document_type: normalizeDocumentTypeForDb(item.fields.documentType),
      notes: normalizeTextForDb(item.fields.notes),
      raw_json: rawJson,
    }).select("id").single();

    if (insertError) {
      return { id: null, error: insertError.message };
    }

    if (data?.id) {
      setQueue((prev) =>
        prev.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                source: "db",
                dbId: data.id,
              }
            : entry,
        ),
      );
      return { id: data.id, error: null };
    }

    return { id: null, error: "No id returned from insert" };
  }, [supabase, user]);

  useEffect(() => {
    setQueue(initialExports.map((row) => createQueueItemFromExport(row)));
    setReviewId(null);
  }, [currentPage, initialExports]);

  const processSingle = useCallback(async (id: string) => {
    const target = queue.find((item) => item.id === id);
    if (!target || !target.file) {
      return;
    }

    setIsQueueRunning(true);
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: "processing", progress: 35, error: null }
          : item,
      ),
    );

    try {
      const payload = await runExtract(target.file);
      const normalized = normalizeInvoiceFields(payload.fields ?? {});
      const normalizedConfidence = normalizeInvoiceConfidence(payload.confidence);
      const nextStatus = needsReview(normalized) ? "needs_review" : "done";
      const processedAt = Date.now();

      setQueue((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: nextStatus,
                progress: 100,
                fields: normalized,
                confidence: normalizedConfidence,
                processedAt,
                error: null,
              }
            : item,
        ),
      );

      const saveResult = await saveExport({
        ...target,
        status: nextStatus,
        progress: 100,
        fields: normalized,
        confidence: normalizedConfidence,
        processedAt,
      });

      if (saveResult.error) {
        setQueue((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  error: "DB save failed",
                }
              : item,
          ),
        );
        setError(`DB save failed: ${saveResult.error}`);
      } else {
        setStatus("Processed");
      }
    } catch (runError) {
      const message = runError instanceof Error ? shortError(runError.message) : "Failed";
      setQueue((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: "failed",
                progress: 0,
                processedAt: Date.now(),
                error: message,
              }
            : item,
        ),
      );
    } finally {
      setIsQueueRunning(false);
    }
  }, [queue, saveExport]);

  useEffect(() => {
    if (!supabaseConfigured || !user || isQueueRunning) {
      return;
    }

    const nextQueued = queue.find((item) => item.status === "queued");
    if (!nextQueued) {
      return;
    }

    void processSingle(nextQueued.id);
  }, [queue, isQueueRunning, processSingle, supabaseConfigured, user]);

  async function runExtract(file: File): Promise<ExtractResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/extract", {
      method: "POST",
      body: formData,
    });

    const payload = (await response.json().catch(() => ({}))) as ExtractResponse;
    if (!response.ok) {
      throw new Error(payload.error ?? `HTTP ${response.status}`);
    }

    return payload;
  }

  async function signOut() {
    if (!supabase) {
      setError("Set .env first");
      return;
    }
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  async function startCheckout(interval: "monthly" | "yearly") {
    setIsBillingActionRunning(true);
    setError(null);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ interval }),
      });

      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
      };
      if (!response.ok || !payload.url) {
        setError(payload.error ?? "Checkout failed.");
        return;
      }

      window.location.href = payload.url;
    } finally {
      setIsBillingActionRunning(false);
    }
  }

  async function openBillingPortal() {
    setIsBillingActionRunning(true);
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
        setError(payload.error ?? "Portal failed.");
        return;
      }

      window.location.href = payload.url;
    } finally {
      setIsBillingActionRunning(false);
    }
  }

  function handleSelectFiles(fileList: FileList | null) {
    resetMessages();
    if (!fileList || fileList.length === 0) {
      return;
    }
    if (!user) {
      setError("Login first");
      return;
    }
    if (!supabaseConfigured) {
      setError("Set .env first");
      return;
    }
    if (billingConfigured && !hasActivePlan) {
      setError("Subscription required");
      return;
    }

    const uploadCount = queue.filter((item) => item.source === "upload").length;
    const available = MAX_FILES - uploadCount;
    if (available <= 0) {
      setError("Max 20 files");
      return;
    }

    const selected = Array.from(fileList);
    const supported = selected.filter((file) => isSupportedFile(file));
    const sizeOk = supported.filter((file) => file.size > 0 && file.size <= MAX_FILE_SIZE_BYTES);
    const accepted = sizeOk.slice(0, available);

    if (accepted.length === 0) {
      setError("No valid files");
      return;
    }

    const newItems = accepted.map((file, index) => createQueueItem(file, index));
    setQueue((prev) => [...prev, ...newItems]);
    setStatus(`${newItems.length} queued`);

    if (accepted.length < selected.length) {
      setError("Some files skipped");
    }
  }

  function onDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    handleSelectFiles(event.dataTransfer.files);
  }

  function retryItem(id: string) {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              status: "queued",
              progress: 0,
              processedAt: null,
              error: null,
            }
          : item,
      ),
    );
  }

  async function removeItem(id: string) {
    const target = queue.find((item) => item.id === id);
    if (!target) {
      return;
    }

    if (target.dbId && supabase) {
      const { error: deleteError } = await supabase
        .from("invoice_exports")
        .delete()
        .eq("id", target.dbId);
      if (deleteError) {
        setError("Delete failed");
        return;
      }
    }

    setQueue((prev) => prev.filter((item) => item.id !== id));
    setReviewId((prev) => (prev === id ? null : prev));
  }

  function toggleItemSelection(id: string) {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, selected: !item.selected } : item,
      ),
    );
  }

  function selectCompleted() {
    setQueue((prev) =>
      prev.map((item) =>
        item.status === "done" || item.status === "needs_review"
          ? { ...item, selected: true }
          : item,
      ),
    );
  }

  function clearSelection() {
    setQueue((prev) => prev.map((item) => ({ ...item, selected: false })));
  }

  async function deleteSelected() {
    if (selectedCount === 0) {
      setError("Select files first");
      return;
    }

    const selectedItems = queue.filter((item) => item.selected);
    const selectedIds = new Set(selectedItems.map((item) => item.id));
    const selectedDbIds = selectedItems
      .map((item) => item.dbId)
      .filter((value): value is string => Boolean(value));

    if (selectedDbIds.length > 0 && supabase) {
      const { error: deleteError } = await supabase
        .from("invoice_exports")
        .delete()
        .in("id", selectedDbIds);
      if (deleteError) {
        setError("Delete failed");
        return;
      }
    }

    setQueue((prev) => prev.filter((item) => !selectedIds.has(item.id)));
    setReviewId((prev) => (prev && selectedIds.has(prev) ? null : prev));
    setStatus("Selected files deleted");
  }

  function openReview(id: string) {
    setReviewId(id);
  }

  function closeReview() {
    setReviewId(null);
  }

  function updateReviewField(name: keyof InvoiceFields, value: string) {
    if (!reviewItem) {
      return;
    }

    setQueue((prev) =>
      prev.map((item) =>
        item.id === reviewItem.id
          ? {
              ...item,
              fields: {
                ...item.fields,
                [name]: value,
              },
            }
          : item,
      ),
    );
  }

  async function saveReview() {
    if (!reviewItem) {
      return;
    }

    setIsSavingReview(true);
    const saveResult = await saveExport(reviewItem);
    setIsSavingReview(false);

    if (saveResult.error) {
      setError(`DB save failed: ${saveResult.error}`);
      return;
    }

    setStatus("Saved");
  }

  async function downloadItemCsv(itemId: string) {
    resetMessages();
    const item = queue.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    const saveResult = await saveExport(item);
    if (saveResult.error) {
      setError(`DB save failed: ${saveResult.error}`);
      return;
    }
    triggerCsvDownload(invoiceFieldsToCsv(item.fields), item.name);
    setStatus("CSV downloaded");
  }

  async function downloadSelectedZip() {
    resetMessages();
    if (selectedCompleted.length === 0) {
      setError("Select completed files");
      return;
    }

    for (const item of selectedCompleted) {
      const saveResult = await saveExport(item);
      if (saveResult.error) {
        setError(`DB save failed: ${saveResult.error}`);
        return;
      }
    }

    const zip = new JSZip();
    selectedCompleted.forEach((item) => {
      const base = item.name.replace(/\.[a-z0-9]+$/i, "");
      const safe = base.replace(/[^a-z0-9-_]/gi, "_");
      zip.file(`${safe}.csv`, invoiceFieldsToCsv(item.fields));
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = "invoice-selected-csv.zip";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    setStatus("Selected ZIP downloaded");
  }

  function resetMessages() {
    setStatus(null);
    setError(null);
  }

  return (
    <main className="min-h-screen bg-[#f4f5f8] text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
        <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">InvoiceJP</h1>
              <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-600">
                <Link href="/legal/notice" className="underline underline-offset-4">
                  Legal Notice
                </Link>
                <Link href="/legal/privacy" className="underline underline-offset-4">
                  Privacy Policy
                </Link>
                <Link href="/legal/terms" className="underline underline-offset-4">
                  Terms of Service
                </Link>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowHelp((prev) => !prev)}
                className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                Help
              </button>
              {user && billingConfigured ? (
                hasActivePlan ? (
                  <button
                    type="button"
                    onClick={() => void openBillingPortal()}
                    disabled={isBillingActionRunning}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:opacity-60"
                  >
                    Billing
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => void startCheckout("monthly")}
                      disabled={isBillingActionRunning}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-60"
                    >
                      $29/mo
                    </button>
                    <button
                      type="button"
                      onClick={() => void startCheckout("yearly")}
                      disabled={isBillingActionRunning}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold disabled:opacity-60"
                    >
                      Yearly -20%
                    </button>
                  </div>
                )
              ) : null}
              {user ? (
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
                >
                  Logout
                </button>
              ) : (
                <Link
                  href="/login"
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
                >
                  Login
                </Link>
              )}
            </div>
          </div>

          {billingConfigured ? (
            <p
              className={`mt-3 rounded-lg px-3 py-2 text-xs ${
                hasActivePlan
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-amber-50 text-amber-900"
              }`}
            >
              {hasActivePlan
                ? "Plan active: 100 included / month, $0.40 overage."
                : "No active plan. Subscribe to process invoices."}
              {!billing.early_bird_applied ? " First 10 users get 50% off." : ""}
            </p>
          ) : null}

          {showHelp ? (
            <section className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <h2 className="text-sm font-semibold text-slate-900">Field Guide</h2>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {REVIEW_FIELD_CONFIG.map((field) => (
                  <p key={field.key} className="text-xs text-slate-700">
                    <span className="font-semibold">{field.label}:</span> {FIELD_HELP[field.key]}
                  </p>
                ))}
              </div>
            </section>
          ) : null}

          {!supabaseConfigured ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Missing Supabase env vars.
            </p>
          ) : null}
        </header>

        <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-10 text-center transition ${
              dragging ? "border-blue-400 bg-blue-50" : "border-slate-300 bg-slate-50"
            }`}
          >
            <p className="text-sm text-slate-500">UPLOAD</p>
            <p className="mt-2 text-3xl font-medium">Drop PDFs or images here</p>
            <p className="mt-1 text-lg text-slate-600">or click to upload</p>
            <p className="mt-4 text-sm text-slate-500">
              PDF / JPG / PNG | Max {MAX_FILES} files, {MAX_FILE_SIZE_MB}MB each
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,image/*"
              onChange={(event) => {
                handleSelectFiles(event.target.files);
                event.currentTarget.value = "";
              }}
              disabled={!supabaseConfigured || !user || (billingConfigured && !hasActivePlan)}
              className="hidden"
            />
          </div>

          <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
            <span className="text-slate-600">Output format:</span>
            <strong>CSV</strong>
          </div>
        </section>

        <section className="mt-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-3xl font-semibold tracking-tight">Processing Files</h2>
            <div className="flex flex-wrap items-center gap-2">
              {completedCount > 0 ? (
                <button
                  type="button"
                  onClick={selectCompleted}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                >
                  Select completed
                </button>
              ) : null}
              {selectedCount > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                  >
                    Clear selection
                  </button>
                  <button
                    type="button"
                    onClick={downloadSelectedZip}
                    className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50"
                  >
                    Download Selected (ZIP)
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteSelected()}
                    className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-50"
                  >
                    Delete Selected
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">DB: {totalExports} files</p>
            {selectedCount > 0 ? (
              <p className="text-sm text-slate-600">Selected: {selectedCount}</p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3">
            {sortedQueue.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-500 shadow-sm">
                No files
              </div>
            ) : (
              sortedQueue.map((item) => (
                <article
                  key={item.id}
                  className={`rounded-xl border bg-white px-4 py-4 shadow-sm ${
                    item.selected ? "border-blue-300" : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={item.selected}
                          onChange={() => toggleItemSelection(item.id)}
                          className="h-4 w-4"
                        />
                        <p className="truncate text-lg font-semibold">{item.name}</p>
                        {(item.status === "done" || item.status === "needs_review") && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                            OK
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-500">{formatFileMeta(item.file, item.size)}</p>
                      {item.processedAt ? (
                        <p className="mt-1 text-xs text-slate-500">Processed: {formatDateTime(item.processedAt)}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      {(item.status === "done" || item.status === "needs_review") && (
                        <button
                          type="button"
                          onClick={() => void downloadItemCsv(item.id)}
                          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                        >
                          Download CSV
                        </button>
                      )}
                      {(item.status === "done" || item.status === "needs_review") && (
                        <button
                          type="button"
                          onClick={() => openReview(item.id)}
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                        >
                          Review
                        </button>
                      )}
                      {item.status === "failed" && (
                        <button
                          type="button"
                          onClick={() => retryItem(item.id)}
                          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-50"
                        >
                          Retry
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => void removeItem(item.id)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {item.status === "processing" ? (
                    <div className="mt-3 h-2 w-full rounded-full bg-slate-200">
                      <div
                        className="h-2 rounded-full bg-blue-600 transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                  ) : null}

                  <div className="mt-3 flex items-center gap-2">
                    <StatusBadge status={item.status} />
                    {item.error ? <span className="text-xs text-red-600">{item.error}</span> : null}
                  </div>
                </article>
              ))
            )}
          </div>

          {totalPages > 1 ? (
            <div className="mt-3 flex items-center justify-end gap-2">
              <Link
                href={currentPage > 1 ? `/dashboard?page=${currentPage - 1}` : "/dashboard"}
                aria-disabled={currentPage <= 1}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                  currentPage <= 1
                    ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
                    : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                Prev
              </Link>
              <span className="text-sm text-slate-600">
                {currentPage} / {totalPages}
              </span>
              <Link
                href={
                  currentPage < totalPages
                    ? `/dashboard?page=${currentPage + 1}`
                    : `/dashboard?page=${totalPages}`
                }
                aria-disabled={currentPage >= totalPages}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
                  currentPage >= totalPages
                    ? "pointer-events-none border-slate-200 bg-slate-100 text-slate-400"
                    : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                }`}
              >
                Next
              </Link>
            </div>
          ) : null}
        </section>

        {status ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
            {status}
          </p>
        ) : null}
        {error ? (
          <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </div>

      {reviewItem ? (
        <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-slate-200 bg-white p-4 shadow-2xl md:p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Review</h3>
            <button
              type="button"
              onClick={closeReview}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm"
            >
              Close
            </button>
          </div>

          <p className="mt-2 truncate text-xs text-slate-500">{reviewItem.name}</p>

          <div className="mt-4 max-h-[62vh] space-y-2 overflow-y-auto pr-1">
            {REVIEW_FIELD_CONFIG.map((field) => (
              <ReviewField
                key={field.key}
                label={field.label}
                help={FIELD_HELP[field.key]}
                value={reviewItem.fields[field.key]}
                confidence={resolveFieldConfidence(reviewItem, field.key)}
                type={field.type}
                multiline={field.multiline}
                onChange={(value) => updateReviewField(field.key, value)}
              />
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void saveReview()}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
              disabled={isSavingReview}
            >
              {isSavingReview ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => void downloadItemCsv(reviewItem.id)}
              className="rounded-lg bg-blue-700 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800"
            >
              Download CSV
            </button>
          </div>
        </aside>
      ) : null}

      {user ? <FeedbackFab /> : null}
    </main>
  );
}

function ReviewField(props: {
  label: string;
  help: string;
  value: string;
  confidence: Confidence;
  onChange: (value: string) => void;
  type?: "text" | "date" | "time";
  multiline?: boolean;
}) {
  return (
    <label className="rounded-lg border border-slate-200 p-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-slate-700">{props.label}</span>
          <span
            className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-300 text-[10px] text-slate-600"
            title={props.help}
          >
            ?
          </span>
        </div>
        <span
          className={`text-xs ${
            props.confidence === "Low"
              ? "text-amber-600"
              : props.confidence === "Med"
                ? "text-slate-500"
                : "text-emerald-600"
          }`}
        >
          {props.confidence}
        </span>
      </div>
      {props.multiline ? (
        <textarea
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
        />
      ) : (
        <input
          type={props.type ?? "text"}
          value={props.value}
          onChange={(event) => props.onChange(event.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
        />
      )}
    </label>
  );
}

function StatusBadge({ status }: { status: QueueStatus }) {
  if (status === "done") {
    return (
      <span className="inline-flex rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
        Done
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex rounded-md bg-red-100 px-2.5 py-1 text-xs font-semibold text-red-700">
        Failed
      </span>
    );
  }
  if (status === "needs_review") {
    return (
      <span className="inline-flex rounded-md bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
        Needs review
      </span>
    );
  }
  if (status === "processing") {
    return (
      <span className="inline-flex rounded-md bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
        Processing
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-md bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
      Queued
    </span>
  );
}

function createQueueItem(file: File, index: number): QueueItem {
  const createdAt = Date.now() + index;
  return {
    id: `${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    dbId: null,
    source: "upload",
    createdAt,
    processedAt: null,
    selected: false,
    file,
    name: file.name,
    size: file.size,
    status: "queued",
    progress: 0,
    fields: createEmptyInvoiceFields(),
    confidence: {},
    error: null,
  };
}

function createQueueItemFromExport(row: InitialExportRow): QueueItem {
  const parsedRaw = isRecord(row.raw_json) ? row.raw_json : {};
  const fieldsPayload =
    isRecord(parsedRaw.fields) ? parsedRaw.fields : parsedRaw;
  const confidencePayload =
    isRecord(parsedRaw.confidence) ? parsedRaw.confidence : undefined;
  const normalized = normalizeInvoiceFields(fieldsPayload);
  const confidence = normalizeInvoiceConfidence(
    confidencePayload,
  );
  const createdAt = Date.parse(row.created_at) || Date.now();

  const fields: InvoiceFields = {
    ...normalized,
    vendor: normalized.vendor || row.vendor || "",
    vendorRegistrationNumber:
      normalized.vendorRegistrationNumber || row.vendor_registration_number || "",
    invoiceNumber: normalized.invoiceNumber || row.invoice_number || "",
    issueDate: normalized.issueDate || row.issue_date || "",
    issueTime: normalized.issueTime || row.issue_time || "",
    dueDate: normalized.dueDate || row.due_date || "",
    currency: normalized.currency || row.currency || "JPY",
    subtotal: normalized.subtotal || formatNumberLike(row.subtotal),
    taxAmount: normalized.taxAmount || formatNumberLike(row.tax_amount),
    total: normalized.total || formatNumberLike(row.total),
    totalAmountTaxInc: normalized.totalAmountTaxInc || formatNumberLike(row.total_amount_tax_inc),
    tax10TargetAmount: normalized.tax10TargetAmount || formatNumberLike(row.tax10_target_amount),
    tax10Amount: normalized.tax10Amount || formatNumberLike(row.tax10_amount),
    tax8TargetAmount: normalized.tax8TargetAmount || formatNumberLike(row.tax8_target_amount),
    tax8Amount: normalized.tax8Amount || formatNumberLike(row.tax8_amount),
    paymentMethod: normalized.paymentMethod || row.payment_method || "",
    documentType: normalized.documentType || row.document_type || "",
    notes: normalized.notes || row.notes || "",
  };

  return {
    id: `db-${row.id}`,
    dbId: row.id,
    source: "db",
    createdAt,
    processedAt: createdAt,
    selected: false,
    file: null,
    name: row.source_file_name || `${row.id}.csv`,
    size: 0,
    status: needsReview(fields) ? "needs_review" : "done",
    progress: 100,
    fields,
    confidence,
    error: null,
  };
}

function isSupportedFile(file: File): boolean {
  if (file.type === "application/pdf") {
    return true;
  }
  if (file.type.startsWith("image/")) {
    return true;
  }
  return file.name.toLowerCase().endsWith(".pdf");
}

function formatNumberLike(value: string | number | null): string {
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  if (typeof value === "string") {
    return value.trim();
  }
  return "";
}

function formatFileMeta(file: File | null, size: number): string {
  if (!file) {
    return "Saved export";
  }
  const typeLabel = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
    ? "PDF"
    : "Image";
  return `${typeLabel} - ${formatFileSize(size)}`;
}

function formatFileSize(size: number): string {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(0)}KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)}MB`;
}

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${yy}-${mm}-${dd} ${hh}:${min}`;
}

function normalizeDateForDb(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

function normalizeTimeForDb(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return /^\d{2}:\d{2}$/.test(trimmed) ? trimmed : null;
}

function normalizeDocumentTypeForDb(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  if (trimmed === "receipt" || trimmed === "invoice") {
    return trimmed;
  }
  return null;
}

function normalizeTextForDb(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function needsReview(fields: InvoiceFields): boolean {
  if (!fields.vendor || !fields.invoiceNumber || !fields.issueDate || !fields.total) {
    return true;
  }
  const total = Number(fields.total);
  return !Number.isFinite(total);
}

function resolveFieldConfidence(item: QueueItem, name: keyof InvoiceFields): Confidence {
  const fromDify = item.confidence[name];
  if (fromDify) {
    return fromDify;
  }
  return heuristicConfidence(name, item.fields[name]);
}

function heuristicConfidence(name: keyof InvoiceFields, value: string): Confidence {
  if (!value) {
    return "Low";
  }

  if (name === "issueDate" || name === "dueDate") {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? "High" : "Low";
  }
  if (name === "issueTime") {
    return /^\d{2}:\d{2}$/.test(value) ? "High" : "Low";
  }
  if (
    name === "subtotal" ||
    name === "taxAmount" ||
    name === "total" ||
    name === "tax10TargetAmount" ||
    name === "tax10Amount" ||
    name === "tax8TargetAmount" ||
    name === "tax8Amount"
  ) {
    return Number.isFinite(Number(value)) ? "High" : "Low";
  }
  if (value.length < 3) {
    return "Med";
  }
  return "High";
}

function shortError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("unauthorized")) {
    return "Login required";
  }
  if (lower.includes("subscription required")) {
    return "Subscription required";
  }
  if (lower.includes("timeout") || lower.includes("gateway")) {
    return "Dify timeout";
  }
  if (lower.includes("cloudflare")) {
    return "Dify upstream error";
  }
  if (lower.includes("empty")) {
    return "Empty file";
  }
  if (lower.includes("blurry")) {
    return "Too blurry";
  }
  if (lower.includes("corrupt")) {
    return "File corrupted";
  }
  if (lower.includes("text")) {
    return "Text not detected";
  }
  return "Failed";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function createPersistedRawJson(
  fields: InvoiceFields,
  confidence: InvoiceFieldConfidence,
): Record<string, unknown> {
  return {
    fields,
    confidence,
  };
}

function triggerCsvDownload(csvText: string, sourceName: string) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const base = sourceName.replace(/\.[a-z0-9]+$/i, "");
  const safe = base.replace(/[^a-z0-9-_]/gi, "_");
  link.href = url;
  link.download = `${safe}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
