import { InvoiceMvp } from "@/components/invoice-mvp";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabaseConfigured = isSupabaseConfigured();
  let user = null;

  if (supabaseConfigured) {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    user = data.user;
  }

  return <InvoiceMvp initialUser={user} supabaseConfigured={supabaseConfigured} />;
}
