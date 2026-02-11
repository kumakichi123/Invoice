import type { Metadata } from "next";
import { legalBusiness, legalLastUpdated } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy | InvoiceJP",
  description: "Privacy policy for InvoiceJP.",
};

export default function PrivacyPage() {
  return (
    <article className="space-y-5 text-sm leading-7 text-slate-800">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Privacy Policy</h1>
        <p className="mt-2 text-xs text-slate-600">Last updated: {legalLastUpdated}</p>
      </header>

      <section>
        <h2 className="text-base font-semibold text-slate-900">1. Information We Collect</h2>
        <p>
          We may collect account information (such as email address), uploaded invoice files,
          extraction output data, billing and transaction records, usage logs, and support
          inquiries.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">2. How We Use Information</h2>
        <p>
          We use information to provide and improve the Service, process billing, authenticate
          users, prevent abuse, respond to support requests, and comply with legal obligations.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">3. Sharing and Disclosure</h2>
        <p>
          We do not sell personal data. We may share data with service providers that help us run
          the Service, and when required by law, legal process, or to protect rights and security.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">4. Service Providers</h2>
        <p>
          We may rely on third-party providers such as Supabase (infrastructure and auth), Stripe
          (payments), Dify (AI workflow processing), and Resend (email). Their handling of data is
          governed by their own terms and policies.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">5. International Transfers</h2>
        <p>
          Your data may be processed in countries other than your own. We take reasonable measures
          to protect personal data in line with applicable data protection laws.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">6. Security</h2>
        <p>
          We use administrative, technical, and organizational safeguards designed to protect
          personal data from unauthorized access, loss, misuse, and alteration.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">7. Your Rights</h2>
        <p>
          Depending on your jurisdiction, you may have rights to access, correct, delete, or
          restrict certain processing of your personal data. Contact us to submit a request.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">8. Policy Updates</h2>
        <p>
          We may update this policy from time to time. Material changes will be posted on this
          page with a revised update date.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-base font-semibold text-slate-900">9. Contact</h2>
        <p>Business: {legalBusiness.businessName}</p>
        <p>Email: {legalBusiness.email}</p>
        <p>Support Hours: {legalBusiness.supportHours}</p>
      </section>
    </article>
  );
}
