import type { Metadata } from "next";
import { legalBusiness, legalLastUpdated } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Legal Notice | InvoiceJP",
  description: "Legal notice and seller information for InvoiceJP.",
};

const rows = [
  { label: "Business Name", value: legalBusiness.businessName },
  { label: "Representative", value: legalBusiness.representative },
  { label: "Address", value: legalBusiness.address },
  { label: "Phone", value: legalBusiness.phone },
  { label: "Support Email", value: legalBusiness.email },
  { label: "Website", value: legalBusiness.appUrl },
  {
    label: "Pricing",
    value: "Pricing is shown on checkout pages and billing screens before purchase.",
  },
  {
    label: "Additional Fees",
    value: "Customers are responsible for internet/communication costs and any banking fees.",
  },
  {
    label: "Payment Method",
    value: "Credit card payments via Stripe.",
  },
  {
    label: "Payment Timing",
    value: "Subscription charges are processed at checkout and on each renewal date.",
  },
  {
    label: "Service Availability",
    value: "Access is enabled promptly after successful payment (except planned maintenance).",
  },
  {
    label: "Refunds and Cancellations",
    value:
      "Due to the nature of digital services, fees are generally non-refundable unless required by applicable law.",
  },
  {
    label: "Subscription Cancellation",
    value:
      "You can cancel before the next billing date from the Stripe customer portal. Access remains available through the current paid term.",
  },
  {
    label: "Supported Environment",
    value: "Latest Chrome, Edge, Safari, and Firefox.",
  },
  {
    label: "Support Hours",
    value: legalBusiness.supportHours,
  },
];

export default function LegalNoticePage() {
  return (
    <article className="space-y-5 text-sm text-slate-800">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Legal Notice</h1>
        <p className="mt-2 text-xs text-slate-600">Last updated: {legalLastUpdated}</p>
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-200">
        {rows.map((row) => (
          <dl
            key={row.label}
            className="grid border-b border-slate-200 bg-white last:border-b-0 md:grid-cols-[220px_1fr]"
          >
            <dt className="bg-slate-50 px-4 py-3 font-semibold text-slate-700">{row.label}</dt>
            <dd className="px-4 py-3">{row.value}</dd>
          </dl>
        ))}
      </div>

      <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        If your service is available to Japanese consumers, this page can also serve as disclosure
        information under Japan&apos;s Act on Specified Commercial Transactions.
      </p>
    </article>
  );
}
