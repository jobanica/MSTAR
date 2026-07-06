import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { addManualBalance, recordManualBalancePayment, deleteManualBalance } from "@/app/actions/data";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorNote, Field, inputClass } from "@/components/FormField";
import { formatCentavos, formatDate } from "@/lib/format";
import type { Invoice, ManualBalance } from "@/lib/types";

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
    </div>
  );
}

export default async function BalancesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  // Collectibles come from two sources: invoices that aren't fully paid,
  // and manually-entered opening/legacy balances for existing customers.
  const [{ data: invData }, { data: manualData }, { data: custData }] = await Promise.all([
    supabase
      .from("invoices")
      .select("*, orders(id, order_number, customer_id, customers(id, full_name))")
      .in("payment_status", ["unpaid", "partial"])
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("manual_balances")
      .select("*, customers(id, full_name)")
      .order("created_at", { ascending: false })
      .limit(300),
    supabase
      .from("customers")
      .select("id, full_name")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  const invoices = ((invData ?? []) as unknown as Invoice[]).map((inv) => ({
    ...inv,
    remaining_centavos: Math.max(inv.total_centavos - inv.amount_paid_centavos, 0),
  }));
  const open = invoices.filter((inv) => inv.remaining_centavos > 0);

  const manual = ((manualData ?? []) as unknown as ManualBalance[]).map((m) => ({
    ...m,
    remaining_centavos: Math.max(m.amount_centavos - m.amount_paid_centavos, 0),
  }));
  const openManual = manual.filter((m) => m.remaining_centavos > 0);
  const customers = (custData ?? []) as { id: string; full_name: string }[];

  const totalOutstanding =
    open.reduce((s, inv) => s + inv.remaining_centavos, 0) +
    openManual.reduce((s, m) => s + m.remaining_centavos, 0);

  // Roll up by customer across both sources for the collectibles view.
  type CustGroup = { id: string | null; name: string; count: number; outstanding: number };
  const byCustomer = new Map<string, CustGroup>();
  const bump = (id: string | null, name: string, amount: number) => {
    const key = id ?? `name:${name}`;
    const g = byCustomer.get(key) ?? { id, name, count: 0, outstanding: 0 };
    g.count += 1;
    g.outstanding += amount;
    byCustomer.set(key, g);
  };
  for (const inv of open) {
    const c = inv.orders?.customers;
    bump(c?.id ?? null, c?.full_name ?? "Walk-in", inv.remaining_centavos);
  }
  for (const m of openManual) {
    bump(m.customers?.id ?? m.customer_id, m.customers?.full_name ?? "—", m.remaining_centavos);
  }
  const custGroups = [...byCustomer.values()].sort((a, b) => b.outstanding - a.outstanding);

  return (
    <>
      <PageHeader title="Balances & Collectibles" breadcrumb={["Balances & Collectibles"]} />

      <div className="space-y-6">
        <ErrorNote message={error} />

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total outstanding" value={formatCentavos(totalOutstanding)} />
          <StatCard label="Open items" value={open.length + openManual.length} />
          <StatCard label="Customers owing" value={custGroups.length} />
        </div>

        {/* Manually add a balance for a customer (opening / legacy amounts). */}
        <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between px-6 py-4 text-base font-bold text-slate-900">
            <span>Add a balance</span>
            <span className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-semibold text-white group-open:hidden">
              ＋ New balance
            </span>
            <span className="hidden text-sm font-normal text-slate-400 group-open:inline">
              Close
            </span>
          </summary>
          <div className="border-t border-slate-100 px-6 py-5">
            {customers.length === 0 ? (
              <p className="text-sm text-slate-500">
                You need a customer first.{" "}
                <Link href="/customers/new" className="font-medium text-teal-700 underline">
                  Create one
                </Link>
                .
              </p>
            ) : (
              <form action={addManualBalance} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Customer">
                    <select name="customer_id" required className={inputClass}>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.full_name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Description (optional)">
                    <input
                      name="description"
                      placeholder="e.g. Carried-over balance, tarpaulin job"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Amount owed (₱)">
                    <input name="amount" type="number" step="0.01" min={0} required className={inputClass} />
                  </Field>
                  <Field label="Already paid (₱, optional)">
                    <input name="amount_paid" type="number" step="0.01" min={0} defaultValue={0} className={inputClass} />
                  </Field>
                  <Field label="Due date (optional)">
                    <input name="due_date" type="date" className={inputClass} />
                  </Field>
                </div>
                <button className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-600">
                  Save balance
                </button>
              </form>
            )}
          </div>
        </details>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-4 text-base font-bold text-slate-900">
            Collectibles by customer
          </div>
          {custGroups.length === 0 ? (
            <p className="px-6 pb-8 text-sm text-slate-400">
              No outstanding balances. Everything is collected. 🎉
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-6 py-3 font-medium">Customer</th>
                    <th className="px-6 py-3 text-right font-medium">Open items</th>
                    <th className="px-6 py-3 text-right font-medium">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {custGroups.map((c) => (
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

        {openManual.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="px-6 py-4 text-base font-bold text-slate-900">
              Manual balances{" "}
              <span className="ml-1 text-sm font-normal text-slate-400">{openManual.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-6 py-3 font-medium">Customer</th>
                    <th className="px-6 py-3 font-medium">Description</th>
                    <th className="px-6 py-3 font-medium">Due</th>
                    <th className="px-6 py-3 text-right font-medium">Paid</th>
                    <th className="px-6 py-3 text-right font-medium">Amount</th>
                    <th className="px-6 py-3 text-right font-medium">Balance</th>
                    <th className="px-6 py-3 text-right font-medium">Collect</th>
                  </tr>
                </thead>
                <tbody>
                  {openManual.map((m) => (
                    <tr key={m.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                      <td className="px-6 py-3 font-medium">
                        <Link href={`/customers/${m.customer_id}`} className="text-teal-700 hover:underline">
                          {m.customers?.full_name ?? "—"}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-slate-600">{m.description ?? "—"}</td>
                      <td className="px-6 py-3 text-slate-500">
                        {m.due_date ? formatDate(m.due_date) : "—"}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-600">
                        {formatCentavos(m.amount_paid_centavos)}
                      </td>
                      <td className="px-6 py-3 text-right text-slate-600">
                        {formatCentavos(m.amount_centavos)}
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-rose-600">
                        {formatCentavos(m.remaining_centavos)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <form action={recordManualBalancePayment} className="flex items-center gap-1">
                            <input type="hidden" name="id" value={m.id} />
                            <input
                              name="amount"
                              type="number"
                              step="0.01"
                              min={0}
                              placeholder="₱"
                              className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-right text-xs"
                            />
                            <button className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50">
                              Record
                            </button>
                          </form>
                          <form action={recordManualBalancePayment}>
                            <input type="hidden" name="id" value={m.id} />
                            <input type="hidden" name="settle" value="1" />
                            <button className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-500">
                              Settle
                            </button>
                          </form>
                          <form action={deleteManualBalance}>
                            <input type="hidden" name="id" value={m.id} />
                            <button
                              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                              title="Delete"
                            >
                              ✕
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-4 text-base font-bold text-slate-900">
            Open invoices{" "}
            <span className="ml-1 text-sm font-normal text-slate-400">{open.length}</span>
          </div>
          {open.length === 0 ? (
            <p className="px-6 pb-8 text-sm text-slate-400">No open invoices.</p>
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
