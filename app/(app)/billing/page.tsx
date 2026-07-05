import { createClient } from "@/lib/supabase/server";
import {
  generateSubscriptionInvoice,
  recordSubscriptionPayment,
} from "@/app/actions/data";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorNote, inputClass } from "@/components/FormField";
import { formatCentavos, formatDate } from "@/lib/format";
import {
  PLAN_BASE_CENTAVOS,
  PER_BRANCH_CENTAVOS,
  monthlyTotalCentavos,
  currentBillingPeriod,
} from "@/lib/billing";
import type { Organization, SubscriptionInvoice } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  trialing: "bg-blue-100 text-blue-700",
  past_due: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-500",
  inactive: "bg-amber-100 text-amber-700",
};

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  trialing: "Free trial",
  past_due: "Past due",
  cancelled: "Cancelled",
  inactive: "Not subscribed",
};

const METHODS = ["gcash", "maya", "bank_transfer", "cash", "other"];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: orgData }, { data: branchData }, { data: invoiceData }] =
    await Promise.all([
      supabase
        .from("organizations")
        .select("subscription_status, grace_period_ends_at, trial_ends_at")
        .maybeSingle(),
      supabase.from("branches").select("is_main, is_active"),
      supabase
        .from("subscription_invoices")
        .select("*")
        .order("period_start", { ascending: false }),
    ]);

  const org = orgData as {
    subscription_status: Organization["subscription_status"];
    grace_period_ends_at: string | null;
    trial_ends_at: string | null;
  } | null;
  const branches = (branchData ?? []) as { is_main: boolean; is_active: boolean }[];
  const invoices = (invoiceData ?? []) as SubscriptionInvoice[];

  const activeBranches = branches.filter((b) => b.is_active);
  const additional = activeBranches.filter((b) => !b.is_main).length;
  const monthly = monthlyTotalCentavos(additional);

  const { start: periodStart } = currentBillingPeriod();
  const currentInvoice = invoices.find((i) => i.period_start === periodStart);

  const subStatus = org?.subscription_status ?? "inactive";
  const graceEnds = org?.grace_period_ends_at ?? null;

  const nowMs = new Date().getTime();
  const trialEnds = org?.trial_ends_at ? new Date(org.trial_ends_at) : null;
  const trialDaysLeft = trialEnds
    ? Math.ceil((trialEnds.getTime() - nowMs) / 86_400_000)
    : null;
  const onTrial = subStatus === "trialing" && trialDaysLeft !== null && trialDaysLeft > 0;
  const trialExpired = subStatus === "trialing" && trialDaysLeft !== null && trialDaysLeft <= 0;

  return (
    <>
      <PageHeader title="Billing" breadcrumb={["Billing"]} />

      <div className="max-w-3xl space-y-6">
        <ErrorNote message={error} />

        {onTrial && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <div>
              <p className="text-sm font-semibold text-blue-900">
                You&apos;re on a free trial — {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left
              </p>
              <p className="mt-0.5 text-xs text-blue-700/80">
                Full access until {formatDate(org!.trial_ends_at!)}. No charge until then.
              </p>
            </div>
            <a href="#pay" className="shrink-0 rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600">
              Subscribe now
            </a>
          </div>
        )}

        {trialExpired && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-semibold text-amber-900">Your free trial has ended</p>
            <p className="mt-0.5 text-xs text-amber-700/90">
              Generate this month&apos;s invoice below and record your payment to keep your subscription active.
            </p>
          </div>
        )}

        {/* Plan + current total */}
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 p-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">PrintOS Plan</h2>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    STATUS_STYLE[subStatus] ?? STATUS_STYLE.inactive
                  }`}
                >
                  {STATUS_LABEL[subStatus] ?? subStatus}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {formatCentavos(PLAN_BASE_CENTAVOS)}/month base ·{" "}
                {formatCentavos(PER_BRANCH_CENTAVOS)}/month per additional branch
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold tracking-tight text-slate-900">
                {formatCentavos(monthly)}
              </div>
              <div className="text-xs text-slate-400">per month</div>
            </div>
          </div>

          <div className="divide-y divide-slate-100 p-6">
            <Row
              label="Base plan"
              hint="Includes your main branch"
              value={formatCentavos(PLAN_BASE_CENTAVOS)}
            />
            <Row
              label={`Additional branches (${additional} × ${formatCentavos(PER_BRANCH_CENTAVOS)})`}
              hint={
                additional === 0
                  ? "Add branches under Branches to expand"
                  : `${activeBranches.length} active branches total`
              }
              value={formatCentavos(PER_BRANCH_CENTAVOS * additional)}
            />
            <div className="flex items-center justify-between pt-4">
              <span className="font-semibold text-slate-900">Monthly total</span>
              <span className="text-lg font-bold text-slate-900">
                {formatCentavos(monthly)}
              </span>
            </div>
          </div>

          {graceEnds && subStatus === "active" && (
            <p className="border-t border-slate-100 bg-green-50 px-6 py-3 text-sm text-green-700">
              Subscription paid through {formatDate(graceEnds)}.
            </p>
          )}
        </section>

        {/* This month */}
        <section id="pay" className="scroll-mt-20 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold">This month</h2>
          <p className="mb-4 text-xs text-slate-400">
            Generate this month&apos;s invoice, then record your payment after
            paying via GCash or bank transfer.
          </p>
          {currentInvoice ? (
            <InvoiceRow invoice={currentInvoice} />
          ) : (
            <form action={generateSubscriptionInvoice}>
              <SubmitButton>Generate this month&apos;s invoice</SubmitButton>
            </form>
          )}
        </section>

        {/* History */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold">Invoice history</h2>
          {invoices.length === 0 ? (
            <p className="text-sm text-slate-500">No invoices yet.</p>
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => (
                <InvoiceRow key={inv.id} invoice={inv} />
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Row({
  label,
  hint,
  value,
}: {
  label: string;
  hint?: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="text-sm font-medium text-slate-700">{label}</div>
        {hint && <div className="text-xs text-slate-400">{hint}</div>}
      </div>
      <span className="text-sm font-semibold tabular-nums text-slate-800">{value}</span>
    </div>
  );
}

function InvoiceRow({ invoice }: { invoice: SubscriptionInvoice }) {
  const paid = invoice.status === "paid";
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">
              {formatDate(invoice.period_start)} – {formatDate(invoice.period_end)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                paid ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
              }`}
            >
              {paid ? "Paid" : "Unpaid"}
            </span>
          </div>
          <div className="mt-0.5 text-xs text-slate-400">
            Base {formatCentavos(invoice.base_centavos)} + {invoice.additional_branches}{" "}
            branch{invoice.additional_branches === 1 ? "" : "es"}
            {paid && invoice.method ? ` · Paid via ${invoice.method}` : ""}
          </div>
        </div>
        <span className="text-lg font-bold tabular-nums text-slate-900">
          {formatCentavos(invoice.total_centavos)}
        </span>
      </div>

      {!paid && (
        <form
          action={recordSubscriptionPayment}
          className="mt-3 flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3"
        >
          <input type="hidden" name="id" value={invoice.id} />
          <label className="text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-500">Method</span>
            <select name="method" className={`${inputClass} w-36`} defaultValue="gcash">
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 text-sm">
            <span className="mb-1 block text-xs font-medium text-slate-500">
              Reference (optional)
            </span>
            <input name="reference" placeholder="e.g. GCash ref no." className={inputClass} />
          </label>
          <SubmitButton>Record payment</SubmitButton>
        </form>
      )}
    </div>
  );
}
