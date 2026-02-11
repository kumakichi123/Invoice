import { InvoiceMvp } from "@/components/invoice-mvp";
import { redirect } from "next/navigation";
import { isStripeBillingConfigured } from "@/lib/billing";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

type DashboardPageProps = {
  searchParams?: Promise<{ page?: string }> | { page?: string };
};

const PAGE_SIZE = 50;

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabaseConfigured = isSupabaseConfigured();
  let user = null;
  let initialExports: Array<{
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
  }> = [];
  let totalExports = 0;
  let billing: {
    stripe_subscription_status: string | null;
    early_bird_applied: boolean;
  } = {
    stripe_subscription_status: null,
    early_bird_applied: false,
  };

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const requestedPage = Number(resolvedSearchParams?.page ?? "1");
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0
    ? Math.floor(requestedPage)
    : 1;

  if (supabaseConfigured) {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;

    if (!user) {
      redirect("/login");
    }

    const from = (currentPage - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const { data: exportsData, count } = await supabase
      .from("invoice_exports")
      .select(
        "id, source_file_name, vendor, vendor_registration_number, invoice_number, issue_date, issue_time, due_date, currency, subtotal, tax_amount, total, total_amount_tax_inc, tax10_target_amount, tax10_amount, tax8_target_amount, tax8_amount, payment_method, document_type, notes, raw_json, created_at",
        { count: "exact" },
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    initialExports = exportsData ?? [];
    totalExports = count ?? 0;

    if (isStripeBillingConfigured()) {
      const { data: billingData } = await supabase
        .from("billing_customers")
        .select("stripe_subscription_status, early_bird_applied")
        .eq("user_id", user.id)
        .maybeSingle();

      billing = {
        stripe_subscription_status: billingData?.stripe_subscription_status ?? null,
        early_bird_applied: billingData?.early_bird_applied ?? false,
      };
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalExports / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  return (
    <InvoiceMvp
      initialUser={user}
      supabaseConfigured={supabaseConfigured}
      initialExports={initialExports}
      currentPage={safeCurrentPage}
      totalPages={totalPages}
      totalExports={totalExports}
      billing={billing}
      billingConfigured={isStripeBillingConfigured()}
    />
  );
}
