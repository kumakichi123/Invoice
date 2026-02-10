export type InvoiceFields = {
  vendor: string;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: string;
  taxAmount: string;
  total: string;
};

export const CSV_HEADERS = [
  "Vendor/Supplier",
  "Invoice number",
  "Issue date",
  "Due date",
  "Currency",
  "Subtotal",
  "Tax amount",
  "Total",
] as const;

const FIELD_ALIASES: Record<keyof InvoiceFields, string[]> = {
  vendor: ["vendor", "supplier", "vendorname", "suppliername"],
  invoiceNumber: [
    "invoicenumber",
    "invoiceid",
    "invoicecode",
    "invno",
    "billnumber",
  ],
  issueDate: ["issuedate", "invoiceissuedate", "dateofissue", "billingdate"],
  dueDate: ["duedate", "paymentduedate", "payby", "paymentdate"],
  currency: ["currency", "currencycode"],
  subtotal: ["subtotal", "amountbeforetax", "pretaxamount", "netamount"],
  taxAmount: ["taxamount", "consumptiontax", "vat", "tax"],
  total: ["total", "totalamount", "grandtotal", "amountdue"],
};

const CANONICAL_FIELD_NAMES = new Set(
  Object.values(FIELD_ALIASES).flat().map((value) => canonicalKey(value)),
);

export function createEmptyInvoiceFields(): InvoiceFields {
  return {
    vendor: "",
    invoiceNumber: "",
    issueDate: "",
    dueDate: "",
    currency: "JPY",
    subtotal: "",
    taxAmount: "",
    total: "",
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
  output.issueDate = normalizeDateValue(output.issueDate);
  output.dueDate = normalizeDateValue(output.dueDate);
  output.subtotal = normalizeAmountValue(output.subtotal);
  output.taxAmount = normalizeAmountValue(output.taxAmount);
  output.total = normalizeAmountValue(output.total);

  return output;
}

export function invoiceFieldsToCsv(fields: InvoiceFields): string {
  const values = [
    fields.vendor,
    fields.invoiceNumber,
    fields.issueDate,
    fields.dueDate,
    "JPY",
    fields.subtotal,
    fields.taxAmount,
    fields.total,
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
