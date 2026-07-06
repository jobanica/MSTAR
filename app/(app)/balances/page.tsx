import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCentavos, formatDate } from "@/lib/format";
import type { Invoice } from "@/lib/types";

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default async function BalancesPage() {
  const supabase = await createClient();

  // Collectibles = invoices not fully paid. Remaining = total − amount paid.
  const { data } = await supabase
    .from("invoices")
    .select("*, orders(id, order_number, customer_id, customers(id, full_name))")
    .in("payment_status", ["unpaid", "partial"])
    .order("created_at", { ascending: false })
    .limit(300);

  const invoices = ((data ?? []) as unknown as Invoice[]).map((inv) => ({
    ...inv,
    remaining_centavos: Math.max(inv.total_centavos - inv.amount_paid_centavos, 0),
  }));
  const open = invoices.filter((inv) => inv.remaining_centavos > 0);

  const totalOutstanding = open.reduce((s, inv) => s + inv.remaining_centavos, 0);

  // Roll up by customer for the collectibles-per-customer view.
  type CustGroup = {
    id: string | null;
    name: string;
    count: number;
    outstanding: number;
  };
  const byCustomer = new Map<string, CustGroup>();
  for (const inv of open) {
    const cust = inv.orders?.customers;
    const key = cust?.id ?? "walk-in";
    const g =
      byCustomer.get(key) ??
      { id: cust?.id ?? null, name: cust?.full_name ?? "Walk-in", count: 0, outstanding: 0 };
    g.count += 1;
    g.outstanding += inv.remaining_centavos;
    byCustomer.set(key, g);
  }
  const customers = [...byCustomer.values()].sort((a, b) => b.outstanding - a.outstanding);

  return (
    <>
      <PageHeader title="Balances & Collectibles" breadcrumb={["Balances & Collectibles"]} />

      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total outstanding" value={formatCentavos(totalOutstanding)} />
          <StatCard label="Open invoices" value={open.length} />
          <StatCard label="Customers owing" value={customers.length} />
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-4 text-base font-bold text-slate-900">
            Collectibles by customer
          </div>
          {customers.length === 0 ? (
            <p className="px-6 pb-8 text-sm text-slate-400">
              No outstanding balances. Everything is collected. 🎉
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-6 py-3 font-medium">Customer</th>
                    <th className="px-6 py-3 text-right font-medium">Open invoices</th>
                    <th className="px-6 py-3 text-right font-medium">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((c) => (
                    <tr key={c.id ?? c.name} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                      <td className="px-6 py-3 font-medium">
                        {c.id ? (
                          <Link href={`/customers/${c.id}`} className="text-teal-700 hover:underline">
                            {c.name}
                          </Link>
                        ) : (
                          <span className="text-slate-600">{c.name}</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-600">{c.count}</td>
                      <td className="px-6 py-3 text-right font-semibold text-slate-900">
                        {formatCentavos(c.outstanding)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-4 text-base font-bold text-slate-900">
            Open invoices{" "}
            <span className="ml-1 text-sm font-normal text-slate-400">{open.length}</span>
          </div>
          {open.length === 0 ? (
            <p className="px-6 pb-8 text-sm text-slate-400">Nothing to collect.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-6 py-3 font-medium">Invoice</th>
                    <th className="px-6 py-3 font-medium">Customer</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Due</th>
                    <th className="px-6 py-3 text-right font-medium">Paid</th>
                    <th className="px-6 py-3 text-right font-medium">Total</th>
                    <th className="px-6 py-3 text-right font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {open.map((inv) => (
                    <tr key={inv.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                      <td className="px-6 py-3 font-medium">
                        <Link href={`/invoices/${inv.id}`} className="text-teal-700 hover:underline">
                          {inv.invoice_number}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        {inv.orders?.customers?.full_name ?? "—"}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={inv.payment_status} />
                      </td>
                      <td className="px-6 py-3 text-slate-500">
                        {inv.due_date ? formatDate(inv.due_date) : "—"}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-600">
                        {formatCentavos(inv.amount_paid_centavos)}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-600">
                        {formatCentavos(inv.total_centavos)}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-rose-600">
                        {formatCentavos(inv.remaining_centavos)}
                      </td>
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
