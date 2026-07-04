import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { generateInvoice } from "@/app/actions/data";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorNote, inputClass } from "@/components/FormField";
import { formatCentavos, formatDate } from "@/lib/format";
import type { Invoice } from "@/lib/types";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: invData }, { data: orderData }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, orders(id, order_number, job_type, customers(id, full_name))")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("orders")
      .select("id, order_number, job_type, total_centavos, customers(full_name)")
      .not("status", "eq", "cancelled")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const invoices = (invData ?? []) as unknown as Invoice[];
  const invoicedOrderIds = new Set(invoices.map((i) => i.order_id));
  const uninvoiced = (orderData ?? []).filter((o) => !invoicedOrderIds.has(o.id)) as unknown as {
    id: string;
    order_number: string;
    job_type: string;
    total_centavos: number;
    customers?: { full_name: string } | null;
  }[];

  return (
    <>
      <PageHeader title="Invoices" breadcrumb={["Invoices"]} />

      <div className="space-y-6">
        <ErrorNote message={error} />

        {uninvoiced.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-base font-bold text-slate-900">Generate invoice</h2>
            <form action={generateInvoice} className="flex flex-wrap items-end gap-3">
              <label className="block flex-1 text-sm">
                <span className="mb-1 block font-medium text-slate-700">Order</span>
                <select name="order_id" required className={inputClass}>
                  {uninvoiced.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} — {o.customers?.full_name ?? "Walk-in"} ·{" "}
                      {formatCentavos(o.total_centavos)}
                    </option>
                  ))}
                </select>
              </label>
              <button className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-600">
                Generate
              </button>
            </form>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-4 text-base font-bold text-slate-900">
            All invoices{" "}
            <span className="ml-1 text-sm font-normal text-slate-400">{invoices.length}</span>
          </div>
          {invoices.length === 0 ? (
            <p className="px-6 pb-8 text-sm text-slate-400">No invoices yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-6 py-3 font-medium">Invoice</th>
                    <th className="px-6 py-3 font-medium">Customer</th>
                    <th className="px-6 py-3 font-medium">Order</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 text-right font-medium">Paid</th>
                    <th className="px-6 py-3 text-right font-medium">Total</th>
                    <th className="px-6 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                      <td className="px-6 py-3 font-medium">
                        <Link href={`/invoices/${inv.id}`} className="text-teal-700">
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        {inv.orders?.customers?.full_name ?? "—"}
                      </td>
                      <td className="px-6 py-3 text-slate-500">
                        {inv.orders?.order_number ?? "—"}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={inv.payment_status} />
                      </td>
                      <td className="px-6 py-3 text-right text-slate-600">
                        {formatCentavos(inv.amount_paid_centavos)}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-slate-800">
                        {formatCentavos(inv.total_centavos)}
                      </td>
                      <td className="px-6 py-3 text-slate-500">{formatDate(inv.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
