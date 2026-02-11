export type InvoiceFields = {
  vendor: string;
  vendorRegistrationNumber: string;
  invoiceNumber: string;
  issueDate: string;
  issueTime: string;
  dueDate: string;
  currency: string;
  subtotal: string;
  taxAmount: string;
  total: string;
  totalAmountTaxInc: string;
  tax10TargetAmount: string;
  tax10Amount: string;
  tax8TargetAmount: string;
  tax8Amount: string;
  paymentMethod: string;
  documentType: string;
  notes: string;
};

export type InvoiceConfidenceLevel = "Low" | "Med" | "High";

export type InvoiceFieldConfidence = Partial<
  Record<keyof InvoiceFields, InvoiceConfidenceLevel>
>;

export const CSV_HEADERS = [
  "Document Type",
  "Vendor",
  "Vendor Registration Number",
  "Invoice Number",
  "Issue Date",
  "Issue Time",
  "Due Date",
  "Currency",
  "Subtotal",
  "Tax Amount",
  "Total",
  "Total Amount Tax Inc",
  "Tax 10 Target Amount",
  "Tax 10 Amount",
  "Tax 8 Target Amount",
  "Tax 8 Amount",
  "Payment Method",
  "Notes",
] as const;

const FIELD_ALIASES: Record<keyof InvoiceFields, string[]> = {
  vendor: ["vendor", "supplier", "vendorname", "suppliername"],
  vendorRegistrationNumber: [
    "vendorregistrationnumber",
    "registrationnumber",
    "tnumber",
  ],
  invoiceNumber: ["invoicenumber", "receiptnumber", "invoiceid", "billnumber"],
  issueDate: ["issuedate", "billingdate", "dateofissue"],
  issueTime: ["issuetime", "time", "timeofissue"],
  dueDate: ["duedate", "paymentduedate", "payby", "paymentdate"],
  currency: ["currency", "currencycode"],
  subtotal: ["subtotal", "amountbeforetax", "pretaxamount", "netamount"],
  taxAmount: ["taxamount", "consumptiontax", "vat", "tax"],
  total: ["total", "totalamount", "grandtotal", "amountdue"],
  totalAmountTaxInc: ["totalamounttaxinc", "totaltaxinc"],
  tax10TargetAmount: ["tax10targetamount", "taxrate10targetamount"],
  tax10Amount: ["tax10amount", "taxrate10amount"],
  tax8TargetAmount: ["tax8targetamount", "taxrate8targetamount"],
  tax8Amount: ["tax8amount", "taxrate8amount"],
  paymentMethod: ["paymentmethod", "payment", "method"],
  documentType: ["documenttype", "doctype"],
  notes: ["notes", "memo", "comment"],
};

const CANONICAL_FIELD_NAMES = new Set(
  Object.values(FIELD_ALIASES).flat().map((value) => canonicalKey(value)),
);

export function createEmptyInvoiceFields(): InvoiceFields {
  return {
    vendor: "",
    vendorRegistrationNumber: "",
    invoiceNumber: "",
    issueDate: "",
    issueTime: "",
    dueDate: "",
    currency: "JPY",
    subtotal: "",
    taxAmount: "",
    total: "",
    totalAmountTaxInc: "",
    tax10TargetAmount: "",
    tax10Amount: "",
    tax8TargetAmount: "",
    tax8Amount: "",
    paymentMethod: "",
    documentType: "",
    notes: "",
  };
}

export function normalizeInvoiceFields(input: unknown): InvoiceFields {
  const output = createEmptyInvoiceFields();
  const source = toBestObject(input);

  if (!source) {
    return output;
  }

  const sourceMap = new Map<string, unknown>();
  for (const [key, value] of Object.entries(source)) {
    sourceMap.set(canonicalKey(key), value);
  }

  for (const fieldName of Object.keys(FIELD_ALIASES) as Array<
    keyof InvoiceFields
  >) {
    const aliases = FIELD_ALIASES[fieldName];
    const foundValue = aliases
      .map((alias) => sourceMap.get(canonicalKey(alias)))
      .find((value) => value !== undefined && value !== null);

    if (foundValue === undefined || foundValue === null) {
      continue;
    }

    output[fieldName] = normalizeFieldValue(fieldName, foundValue);
  }

  output.currency = "JPY";
  output.documentType = normalizeDocumentType(output.documentType);
  output.issueDate = normalizeDateValue(output.issueDate);
  output.dueDate = normalizeDateValue(output.dueDate);
  output.issueTime = normalizeTimeValue(output.issueTime);
  output.subtotal = normalizeAmountValue(output.subtotal);
  output.taxAmount = normalizeAmountValue(output.taxAmount);
  output.total = normalizeAmountValue(output.total);
  output.totalAmountTaxInc = normalizeAmountValue(output.totalAmountTaxInc);
  output.tax10TargetAmount = normalizeAmountValue(output.tax10TargetAmount);
  output.tax10Amount = normalizeAmountValue(output.tax10Amount);
  output.tax8TargetAmount = normalizeAmountValue(output.tax8TargetAmount);
  output.tax8Amount = normalizeAmountValue(output.tax8Amount);

  return output;
}

export function normalizeInvoiceConfidence(input: unknown): InvoiceFieldConfidence {
  if (!isRecord(input)) {
    return {};
  }

  const output: InvoiceFieldConfidence = {};
  const sourceMap = new Map<string, unknown>();
  for (const [key, value] of Object.entries(input)) {
    sourceMap.set(canonicalKey(key), value);
  }

  for (const fieldName of Object.keys(FIELD_ALIASES) as Array<
    keyof InvoiceFields
  >) {
    const aliases = FIELD_ALIASES[fieldName];
    const foundValue = aliases
      .map((alias) => sourceMap.get(canonicalKey(alias)))
      .find((value) => value !== undefined && value !== null);

    const normalized = normalizeConfidenceValue(foundValue);
    if (normalized) {
      output[fieldName] = normalized;
    }
  }

  return output;
}

export function invoiceFieldsToCsv(fields: InvoiceFields): string {
  const values = [
    fields.documentType,
    fields.vendor,
    fields.vendorRegistrationNumber,
    fields.invoiceNumber,
    fields.issueDate,
    fields.issueTime,
    fields.dueDate,
    "JPY",
    fields.subtotal,
    fields.taxAmount,
    fields.total,
    fields.totalAmountTaxInc,
    fields.tax10TargetAmount,
    fields.tax10Amount,
    fields.tax8TargetAmount,
    fields.tax8Amount,
    fields.paymentMethod,
    fields.notes,
  ];

  const headerLine = CSV_HEADERS.map(csvEscape).join(",");
  const valueLine = values.map(csvEscape).join(",");
  return `${headerLine}\n${valueLine}\n`;
}

export function toNullableNumber(value: string): number | null {
  const normalized = normalizeAmountValue(value);
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeFieldValue(fieldName: keyof InvoiceFields, value: unknown): string {
  if (fieldName === "currency") {
    return "JPY";
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (typeof value === "string") {
    return value.trim();
  }

  return "";
}

function normalizeConfidenceValue(value: unknown): InvoiceConfidenceLevel | null {
  if (typeof value !== "string") {
    return null;
  }

  const lower = value.trim().toLowerCase();
  if (lower === "high") {
    return "High";
  }
  if (lower === "medium" || lower === "med") {
    return "Med";
  }
  if (lower === "low") {
    return "Low";
  }
  return null;
}

function normalizeAmountValue(value: string): string {
  if (!value) {
    return "";
  }

  const compact = value.replace(/,/g, "").replace(/[^0-9.-]/g, "");
  if (!compact) {
    return "";
  }

  const parsed = Number(compact);
  return Number.isFinite(parsed) ? String(parsed) : "";
}

function normalizeDateValue(value: string): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return trimmed;
  }

  const genericParts = trimmed.match(/^(\d{4})\D+(\d{1,2})\D+(\d{1,2})$/);
  if (genericParts) {
    return `${genericParts[1]}-${pad2(genericParts[2])}-${pad2(genericParts[3])}`;
  }

  const slashParts = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashParts) {
    return `${slashParts[3]}-${pad2(slashParts[1])}-${pad2(slashParts[2])}`;
  }

  const parsedDate = new Date(trimmed);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toISOString().slice(0, 10);
  }

  return "";
}

function normalizeTimeValue(value: string): string {
  if (!value) {
    return "";
  }

  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{1,2})[:：](\d{1,2})$/);
  if (!match) {
    return "";
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    return "";
  }
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return "";
  }

  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeDocumentType(value: string): string {
  const lower = value.trim().toLowerCase();
  if (lower === "receipt" || lower === "invoice") {
    return lower;
  }
  return "";
}

function toBestObject(input: unknown): Record<string, unknown> | null {
  if (isRecord(input)) {
    if (hasInvoiceLikeKeys(input)) {
      return input;
    }

    for (const value of Object.values(input)) {
      const parsed = parseJsonIfString(value);
      if (isRecord(parsed) && hasInvoiceLikeKeys(parsed)) {
        return parsed;
      }
    }

    return input;
  }

  const parsed = parseJsonIfString(input);
  if (isRecord(parsed)) {
    return parsed;
  }

  return null;
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

function hasInvoiceLikeKeys(data: Record<string, unknown>): boolean {
  return Object.keys(data)
    .map((key) => canonicalKey(key))
    .some((key) => CANONICAL_FIELD_NAMES.has(key));
}

function canonicalKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pad2(value: string): string {
  return value.padStart(2, "0");
}

function csvEscape(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
