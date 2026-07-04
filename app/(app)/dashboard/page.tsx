import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCentavos, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import type { Order } from "@/lib/types";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const weekAhead = new Date();
  weekAhead.setDate(weekAhead.getDate() + 7);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [active, dueSoon, rush, completedThisMonth, recent] =
    await Promise.all([
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .not("status", "in", "(completed,cancelled)"),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .not("status", "in", "(completed,cancelled)")
        .lte("due_date", weekAhead.toISOString().slice(0, 10)),
      supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("rush", true)
        .not("status", "in", "(completed,cancelled)"),
      supabase
        .from("orders")
        .select("total_centavos")
        .eq("status", "completed")
        .gte("completed_at", monthStart.toISOString()),
      supabase
        .from("orders")
        .select(
          "id, order_number, job_type, status, payment_status, due_date, total_centavos, customers(id, full_name, phone)",
        )
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const revenue = (completedThisMonth.data ?? []).reduce(
    (sum, o) => sum + (o.total_centavos ?? 0),
    0,
  );
  const orders = (recent.data ?? []) as unknown as Order[];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <Link
          href="/orders/new"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
        >
          + New Order
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Active orders" value={active.count ?? 0} />
        <Stat label="Due within 7 days" value={dueSoon.count ?? 0} />
        <Stat label="Rush jobs" value={rush.count ?? 0} />
        <Stat label="Completed revenue (month)" value={formatCentavos(revenue)} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-3 text-sm font-semibold">
          Recent orders
        </div>
        {orders.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">
            No orders yet.{" "}
            <Link href="/orders/new" className="text-indigo-600">
              Create your first order
            </Link>
            .
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2">Order</th>
                <th className="px-5 py-2">Customer</th>
                <th className="px-5 py-2">Job</th>
                <th className="px-5 py-2">Status</th>
                <th className="px-5 py-2">Payment</th>
                <th className="px-5 py-2">Due</th>
                <th className="px-5 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium">
                    <Link href={`/orders/${o.id}`} className="text-indigo-600">
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{o.customers?.full_name ?? "—"}</td>
                  <td className="px-5 py-3">
                    {o.job_type}
                    {o.rush && (
                      <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                        RUSH
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={o.payment_status} />
                  </td>
                  <td className="px-5 py-3">{formatDate(o.due_date)}</td>
                  <td className="px-5 py-3 text-right font-medium">
                    {formatCentavos(o.total_centavos)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
