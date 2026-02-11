import type { Metadata } from "next";
import { legalBusiness, legalLastUpdated } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service | InvoiceJP",
  description: "Terms of Service for InvoiceJP.",
};

export default function TermsPage() {
  return (
    <article className="space-y-5 text-sm leading-7 text-slate-800">
      <header>
        <h1 className="text-2xl font-semibold text-slate-900">Terms of Service</h1>
        <p className="mt-2 text-xs text-slate-600">Last updated: {legalLastUpdated}</p>
      </header>

      <section>
        <h2 className="text-base font-semibold text-slate-900">1. Scope</h2>
        <p>
          These Terms govern access to and use of InvoiceJP (the &quot;Service&quot;) provided by{" "}
          {legalBusiness.businessName} (&quot;Company&quot;). By using the Service, you agree to these Terms.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">2. Accounts</h2>
        <p>
          You are responsible for maintaining account credentials and for all activity under your
          account. You must not share credentials or allow unauthorized use.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">3. Fees and Billing</h2>
        <p>
          Paid plans, usage-based charges, and billing cycles are shown at checkout or on pricing
          screens. Payments are processed through Stripe. Except where required by law, fees are
          non-refundable.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">4. Prohibited Conduct</h2>
        <p>
          You must not violate laws, infringe third-party rights, attempt unauthorized access,
          reverse engineer the Service, or interfere with system stability and availability.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">5. Changes and Suspension</h2>
        <p>
          We may modify, suspend, or discontinue all or part of the Service when reasonably needed
          for maintenance, security, legal compliance, or operational reasons.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">6. Intellectual Property</h2>
        <p>
          The Service and related software, branding, and content are owned by the Company or its
          licensors. You retain rights to content you upload, subject to rights needed to operate
          the Service.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">7. Disclaimer</h2>
        <p>
          The Service is provided on an &quot;as is&quot; basis. We do not warrant uninterrupted service or
          perfect extraction accuracy. You are responsible for reviewing outputs before use.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">8. Limitation of Liability</h2>
        <p>
          To the extent permitted by law, the Company&apos;s total liability for claims relating to the
          Service will not exceed the total fees paid by you in the 12 months before the event
          giving rise to the claim.
        </p>
      </section>

      <section>
        <h2 className="text-base font-semibold text-slate-900">9. Updates to Terms</h2>
        <p>
          We may revise these Terms as needed. Material changes will be posted on this site or
          notified to your registered email address.
        </p>
      </section>

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h2 className="text-base font-semibold text-slate-900">10. Governing Law and Venue</h2>
        <p>These Terms are governed by {legalBusiness.governingLaw}.</p>
        <p>
          Any dispute relating to the Service is subject to the exclusive jurisdiction of{" "}
          {legalBusiness.jurisdiction}, unless otherwise required by applicable consumer protection
          law.
        </p>
      </section>
    </article>
  );
}
