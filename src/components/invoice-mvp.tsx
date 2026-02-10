"use client";

import JSZip from "jszip";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  createEmptyInvoiceFields,
  invoiceFieldsToCsv,
  normalizeInvoiceFields,
  toNullableNumber,
  type InvoiceFields,
} from "@/lib/invoice";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const MAX_FILES = 20;
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

type InvoiceMvpProps = {
  initialUser: User | null;
  supabaseConfigured: boolean;
};

type QueueStatus = "queued" | "processing" | "done" | "needs_review" | "failed";
type Confidence = "Low" | "Med" | "High";

type QueueItem = {
  id: string;
  file: File;
  name: string;
  size: number;
  status: QueueStatus;
  progress: number;
  fields: InvoiceFields;
  rawJsonText: string;
  notes: string;
  error: string | null;
};

type ExtractResponse = {
  fields?: unknown;
  raw?: unknown;
  error?: string;
};

export function InvoiceMvp({ initialUser, supabaseConfigured }: InvoiceMvpProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const supabase = useMemo(
    () => (supabaseConfigured ? getSupabaseBrowserClient() : null),
    [supabaseConfigured],
  );

  const [user, setUser] = useState<User | null>(initialUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isQueueRunning, setIsQueueRunning] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reviewItem = queue.find((item) => item.id === reviewId) ?? null;
  const sortedQueue = [...queue].sort((a, b) => statusRank(a.status) - statusRank(b.status));

  useEffect(() => {
    if (!supabase) {
      return;
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  const processSingle = useCallback(async (id: string) => {
    const target = queue.find((item) => item.id === id);
    if (!target) {
      return;
    }

    setIsQueueRunning(true);
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, status: "processing", progress: 35, error: null } : item,
      ),
    );

    try {
      const payload = await runExtract(target.file);
      const normalized = normalizeInvoiceFields(payload.fields ?? {});
      const nextStatus = needsReview(normalized) ? "needs_review" : "done";
      const rawJsonText = JSON.stringify(payload.raw ?? {}, null, 2);

      setQueue((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: nextStatus,
                progress: 100,
                fields: normalized,
                rawJsonText,
                error: null,
              }
            : item,
        ),
      );
      setStatus("Processed");
    } catch (runError) {
      const message = runError instanceof Error ? shortError(runError.message) : "Failed";
      setQueue((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: "failed", progress: 0, error: message } : item,
        ),
      );
    } finally {
      setIsQueueRunning(false);
    }
  }, [queue]);

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

  async function signIn() {
    resetMessages();
    if (!supabase) {
      setAuthStatus("Set .env");
      return;
    }
    if (!email || !password) {
      setAuthStatus("Email + password");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setAuthStatus("Login failed");
      return;
    }

    setAuthStatus("Logged in");
    setPassword("");
  }

  async function signUp() {
    resetMessages();
    if (!supabase) {
      setAuthStatus("Set .env");
      return;
    }
    if (!email || !password) {
      setAuthStatus("Email + password");
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (signUpError) {
      setAuthStatus("Sign up failed");
      return;
    }

    setAuthStatus(data.session ? "Logged in" : "Check email");
    setPassword("");
  }

  async function signOut() {
    resetMessages();
    if (!supabase) {
      setAuthStatus("Set .env");
      return;
    }
    await supabase.auth.signOut();
    setAuthStatus("Logged out");
  }

  function handleSelectFiles(fileList: FileList | null) {
    resetMessages();
    if (!fileList || fileList.length === 0) {
      return;
    }

    if (!supabaseConfigured) {
      setError("Set .env first");
      return;
    }

    const available = MAX_FILES - queue.length;
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
        item.id === id ? { ...item, status: "queued", progress: 0, error: null } : item,
      ),
    );
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
                [name]: name === "currency" ? "JPY" : value,
              },
            }
          : item,
      ),
    );
  }

  function updateReviewNotes(value: string) {
    if (!reviewItem) {
      return;
    }

    setQueue((prev) =>
      prev.map((item) => (item.id === reviewItem.id ? { ...item, notes: value } : item)),
    );
  }

  function applyReviewJson(value: string) {
    if (!reviewItem) {
      return;
    }

    try {
      const parsed = JSON.parse(value);
      const normalized = normalizeInvoiceFields(parsed);
      setQueue((prev) =>
        prev.map((item) =>
          item.id === reviewItem.id
            ? {
                ...item,
                rawJsonText: value,
                fields: normalized,
                status: needsReview(normalized) ? "needs_review" : "done",
              }
            : item,
        ),
      );
      setStatus("Updated");
    } catch {
      setError("Invalid JSON");
    }
  }

  async function downloadItemCsv(itemId: string) {
    resetMessages();
    const item = queue.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }

    triggerCsvDownload(invoiceFieldsToCsv(item.fields), item.name);
    await saveExport(item);
    setStatus("CSV downloaded");
  }

  async function downloadAllZip() {
    resetMessages();
    const completed = queue.filter(
      (item) => item.status === "done" || item.status === "needs_review",
    );
    if (completed.length === 0) {
      setError("No completed files");
      return;
    }

    const zip = new JSZip();
    completed.forEach((item) => {
      const base = item.name.replace(/\.[a-z0-9]+$/i, "");
      const safe = base.replace(/[^a-z0-9-_]/gi, "_");
      zip.file(`${safe}.csv`, invoiceFieldsToCsv(item.fields));
    });

    const blob = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = "invoice-csv.zip";
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus("ZIP downloaded");
  }

  async function saveExport(item: QueueItem) {
    if (!supabase || !user) {
      return;
    }

    await supabase.from("invoice_exports").insert({
      user_id: user.id,
      source_file_name: item.name,
      vendor: item.fields.vendor,
      invoice_number: item.fields.invoiceNumber,
      issue_date: item.fields.issueDate || null,
      due_date: item.fields.dueDate || null,
      currency: "JPY",
      subtotal: toNullableNumber(item.fields.subtotal),
      tax_amount: toNullableNumber(item.fields.taxAmount),
      total: toNullableNumber(item.fields.total),
      raw_json: safeParseJson(item.rawJsonText),
    });
  }

  function resetMessages() {
    setStatus(null);
    setError(null);
  }

  return (
    <main className="min-h-screen bg-[#f4f5f8] text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-5 md:px-6">
        <header className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">Invoice Extractor</h1>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowPrivacy((prev) => !prev)}
                className="rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
              >
                Privacy
              </button>
              {user ? (
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
                >
                  Logout
                </button>
              ) : (
                <button
                  type="button"
                  onClick={signIn}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
                >
                  Login
                </button>
              )}
            </div>
          </div>

          {showPrivacy ? (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Files can be deleted on request.
            </p>
          ) : null}

          {!user ? (
            <div className="mt-3 grid gap-2 md:grid-cols-3">
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
              />
              <button
                type="button"
                onClick={signUp}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
              >
                Create account
              </button>
            </div>
          ) : null}

          {authStatus ? (
            <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              {authStatus}
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
            <p className="text-2xl">☁</p>
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
              disabled={!supabaseConfigured}
              className="hidden"
            />
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">
              <span className="text-slate-600">Output format:</span>
              <strong>CSV</strong>
            </div>
            <button
              type="button"
              onClick={() => setStatus("Tips: 300dpi / no shadow / straight scan")}
              className="text-xs text-slate-500 underline underline-offset-2"
            >
              Upload better scan tips
            </button>
          </div>
        </section>

        <section className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-3xl font-semibold tracking-tight">Processing Files</h2>
            <button
              type="button"
              onClick={downloadAllZip}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold shadow-sm hover:bg-slate-50"
            >
              Download All (ZIP)
            </button>
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
                  className="rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold">{item.name}</p>
                      <p className="text-sm text-slate-500">{formatFileMeta(item.file, item.size)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {(item.status === "done" || item.status === "needs_review") && (
                        <button
                          type="button"
                          onClick={() => downloadItemCsv(item.id)}
                          className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                        >
                          Download CSV
                        </button>
                      )}
                      {item.status === "needs_review" && (
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

          <div className="mt-4 flex flex-col gap-2">
            <ReviewField
              label="Vendor"
              value={reviewItem.fields.vendor}
              confidence={fieldConfidence("vendor", reviewItem.fields.vendor)}
              onChange={(value) => updateReviewField("vendor", value)}
            />
            <ReviewField
              label="Invoice No"
              value={reviewItem.fields.invoiceNumber}
              confidence={fieldConfidence("invoiceNumber", reviewItem.fields.invoiceNumber)}
              onChange={(value) => updateReviewField("invoiceNumber", value)}
            />
            <ReviewField
              label="Issue Date"
              type="date"
              value={reviewItem.fields.issueDate}
              confidence={fieldConfidence("issueDate", reviewItem.fields.issueDate)}
              onChange={(value) => updateReviewField("issueDate", value)}
            />
            <ReviewField
              label="Due Date"
              type="date"
              value={reviewItem.fields.dueDate}
              confidence={fieldConfidence("dueDate", reviewItem.fields.dueDate)}
              onChange={(value) => updateReviewField("dueDate", value)}
            />
            <ReviewField
              label="Subtotal"
              value={reviewItem.fields.subtotal}
              confidence={fieldConfidence("subtotal", reviewItem.fields.subtotal)}
              onChange={(value) => updateReviewField("subtotal", value)}
            />
            <ReviewField
              label="Tax"
              value={reviewItem.fields.taxAmount}
              confidence={fieldConfidence("taxAmount", reviewItem.fields.taxAmount)}
              onChange={(value) => updateReviewField("taxAmount", value)}
            />
            <ReviewField
              label="Total"
              value={reviewItem.fields.total}
              confidence={fieldConfidence("total", reviewItem.fields.total)}
              onChange={(value) => updateReviewField("total", value)}
            />
          </div>

          <label className="mt-3 block">
            <span className="text-xs font-semibold text-slate-700">Notes</span>
            <textarea
              value={reviewItem.notes}
              onChange={(event) => updateReviewNotes(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </label>

          <label className="mt-3 block">
            <span className="text-xs font-semibold text-slate-700">Raw JSON</span>
            <textarea
              value={reviewItem.rawJsonText}
              onChange={(event) =>
                setQueue((prev) =>
                  prev.map((item) =>
                    item.id === reviewItem.id ? { ...item, rawJsonText: event.target.value } : item,
                  ),
                )
              }
              rows={6}
              className="mono mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-slate-500"
            />
          </label>

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => applyReviewJson(reviewItem.rawJsonText)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              Apply JSON
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
    </main>
  );
}

function ReviewField(props: {
  label: string;
  value: string;
  confidence: Confidence;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="rounded-lg border border-slate-200 p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-700">{props.label}</span>
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
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        className="mt-1 w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-slate-500"
      />
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
  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    name: file.name,
    size: file.size,
    status: "queued",
    progress: 0,
    fields: createEmptyInvoiceFields(),
    rawJsonText: "{}",
    notes: "",
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

function formatFileMeta(file: File, size: number): string {
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

function statusRank(status: QueueStatus): number {
  if (status === "done") {
    return 0;
  }
  if (status === "needs_review") {
    return 1;
  }
  if (status === "processing") {
    return 2;
  }
  if (status === "queued") {
    return 3;
  }
  return 4;
}

function needsReview(fields: InvoiceFields): boolean {
  if (!fields.vendor || !fields.invoiceNumber || !fields.issueDate || !fields.total) {
    return true;
  }
  const total = Number(fields.total);
  return !Number.isFinite(total);
}

function fieldConfidence(name: keyof InvoiceFields, value: string): Confidence {
  if (!value) {
    return "Low";
  }

  if (name === "issueDate" || name === "dueDate") {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? "High" : "Low";
  }
  if (name === "subtotal" || name === "taxAmount" || name === "total") {
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

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return { raw: value };
  }
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
