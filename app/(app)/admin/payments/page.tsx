import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updatePaymentSettings } from "@/app/actions/data";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorNote, Field, inputClass } from "@/components/FormField";

export default async function PaymentSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { error, saved } = await searchParams;
  const supabase = await createClient();

  // Super-admin only.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profile?.role !== "super_admin") redirect("/dashboard");

  const { data: settings } = await supabase
    .from("platform_settings")
    .select("xendit_secret_key, xendit_webhook_token, price_amount, currency")
    .eq("id", 1)
    .maybeSingle();

  const hasSecret = !!settings?.xendit_secret_key;
  const hasToken = !!settings?.xendit_webhook_token;
  const webhookUrl =
    (process.env.NEXT_PUBLIC_SITE_URL ?? "https://mstar-orpin.vercel.app") +
    "/api/xendit/webhook";

  return (
    <>
      <PageHeader title="Payment Settings" breadcrumb={["Subscribers", "Payment Settings"]} />

      <div className="max-w-2xl space-y-6">
        <ErrorNote message={error} />
        {saved && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Payment settings saved.
          </p>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base font-bold text-slate-900">Xendit</h2>
          <p className="mb-4 text-xs text-slate-400">
            The $5 lifetime plan is collected through Xendit. Paste your API secret
            key and webhook verification token here.
          </p>

          <form action={updatePaymentSettings} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Price amount">
                <input
                  name="price_amount"
                  type="number"
                  min={1}
                  defaultValue={settings?.price_amount ?? 5}
                  className={inputClass}
                />
              </Field>
              <Field label="Currency">
                <select name="currency" defaultValue={settings?.currency ?? "USD"} className={inputClass}>
                  <option value="USD">USD ($)</option>
                  <option value="PHP">PHP (₱)</option>
                </select>
              </Field>
            </div>

            <Field label={`Xendit secret key${hasSecret ? " (set — leave blank to keep)" : ""}`}>
              <input
                name="xendit_secret_key"
                type="password"
                autoComplete="off"
                placeholder={hasSecret ? "•••••••• already saved" : "xnd_production_..."}
                className={inputClass}
              />
            </Field>

            <Field label={`Webhook verification token${hasToken ? " (set — leave blank to keep)" : ""}`}>
              <input
                name="xendit_webhook_token"
                type="password"
                autoComplete="off"
                placeholder={hasToken ? "•••••••• already saved" : "your callback token"}
                className={inputClass}
              />
            </Field>

            <SubmitButton>Save payment settings</SubmitButton>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base font-bold text-slate-900">Webhook URL</h2>
          <p className="mb-3 text-xs text-slate-400">
            In the Xendit dashboard → Settings → Webhooks, set the{" "}
            <span className="font-medium">Invoices paid</span> callback URL to:
          </p>
          <code className="block break-all rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {webhookUrl}
          </code>
          <p className="mt-3 text-xs text-slate-400">
            Note: the app still needs <code>SUPABASE_SERVICE_ROLE_KEY</code> set in
            Vercel for checkout and the webhook to reach the database.
          </p>
        </section>
      </div>
    </>
  );
}
