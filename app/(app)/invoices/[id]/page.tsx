import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { recordPayment } from "@/app/actions/data";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorNote, Field, inputClass } from "@/components/FormField";
import { formatCentavos, formatDateTime, statusLabel } from "@/lib/format";
import type { Invoice, Payment } from "@/lib/types";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export default async function InvoiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("invoices")
    .select("*, orders(id, order_number, job_type, customers(id, full_name, phone))")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const invoice = data as unknown as Invoice;

  const { data: payData } = await supabase
    .from("payments")
    .select("*")
    .eq("invoice_id", id)
    .order("paid_at", { ascending: false });
  const payments = (payData ?? []) as Payment[];

  const balance = invoice.total_centavos - invoice.amount_paid_centavos;

  return (
    <>
      <PageHeader title={invoice.invoice_number} breadcrumb={["Invoices", invoice.invoice_number]} />

      <div className="max-w-3xl space-y-6">
        <div className="flex justify-end">
          <a
            href={`/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            ⬇ Download PDF
          </a>
        </div>
        <ErrorNote message={error} />

        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Summary</h2>
              <StatusBadge status={invoice.payment_status} />
            </div>
            <Row label="Customer" value={invoice.orders?.customers?.full_name ?? "—"} />
            <Row
              label="Order"
              value={
                invoice.orders ? (
                  <Link href={`/orders/${invoice.orders.id}`} className="text-teal-700">
                    {invoice.orders.order_number}
                  </Link>
                ) : (
                  "—"
                )
              }
            />
            <Row label="Subtotal" value={formatCentavos(invoice.subtotal_centavos)} />
            <Row label="Delivery fee" value={formatCentavos(invoice.delivery_fee_centavos)} />
            <Row label="Discount" value={`- ${formatCentavos(invoice.discount_centavos)}`} />
            <div className="mt-2 border-t border-slate-100 pt-2">
              <Row label="Total" value={formatCentavos(invoice.total_centavos)} />
              <Row label="Paid" value={formatCentavos(invoice.amount_paid_centavos)} />
              <Row
                label="Balance"
                value={
                  <span className={balance > 0 ? "text-red-600" : "text-emerald-600"}>
                    {formatCentavos(balance)}
                  </span>
                }
              />
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">Record payment</h2>
            {invoice.payment_status === "paid" ? (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                This invoice is fully paid.
              </p>
            ) : (
              <form action={recordPayment} className="space-y-3">
                <input type="hidden" name="invoice_id" value={invoice.id} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Field label="Amount (₱)">
                    <input
                      name="amount"
                      type="number"
                      step="0.01"
                      min={0}
                      defaultValue={(balance / 100).toFixed(2)}
                      required
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Method">
                    <select name="method" className={inputClass}>
                      <option value="cash">Cash</option>
                      <option value="gcash">GCash</option>
                      <option value="bank_transfer">Bank transfer</option>
                      <option value="maya">Maya</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                </div>
                <Field label="Reference number">
                  <input name="reference_number" className={inputClass} />
                </Field>
                <SubmitButton>Record payment</SubmitButton>
              </form>
            )}
          </section>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-4 text-sm font-semibold">Payment history</div>
          {payments.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-slate-400">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead>
                <tr className="border-y border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-2 font-medium">Date</th>
                  <th className="px-6 py-2 font-medium">Method</th>
                  <th className="px-6 py-2 font-medium">Reference</th>
                  <th className="px-6 py-2 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-6 py-2 text-slate-600">{formatDateTime(p.paid_at)}</td>
                    <td className="px-6 py-2 text-slate-600">{statusLabel(p.method)}</td>
                    <td className="px-6 py-2 text-slate-500">{p.reference_number ?? "—"}</td>
                    <td className="px-6 py-2 text-right font-semibold text-slate-800">
                      {formatCentavos(p.amount_centavos)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </section>
      </div>
    </>
  );
}
