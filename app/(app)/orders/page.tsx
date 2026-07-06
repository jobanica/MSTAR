import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCentavos, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import type { Order } from "@/lib/types";

const DONE = "(completed,cancelled)";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const view = filter === "completed" || filter === "pending" ? filter : "all";
  const supabase = await createClient();

  // Counts for the filter tabs.
  const [{ count: total }, { count: pending }, { count: completed }] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase.from("orders").select("id", { count: "exact", head: true }).not("status", "in", DONE),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "completed"),
  ]);

  let query = supabase
    .from("orders")
    .select("*, customers(id, full_name, phone), departments(id, name, color_hex)");
  if (view === "pending") query = query.not("status", "in", DONE);
  else if (view === "completed") query = query.eq("status", "completed");

  const { data } = await query.order("created_at", { ascending: false }).limit(100);
  const orders = (data ?? []) as unknown as Order[];

  const tabs = [
    { key: "all", label: "All", count: total ?? 0 },
    { key: "pending", label: "Pending", count: pending ?? 0 },
    { key: "completed", label: "Completed", count: completed ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/orders/quick"
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100"
          >
            ⚡ Quick Order
          </Link>
          <Link
            href="/orders/new"
            className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600"
          >
            + New Order
          </Link>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const activeTab = t.key === view;
          const href = t.key === "all" ? "/orders" : `/orders?filter=${t.key}`;
          return (
            <Link
              key={t.key}
              href={href}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab
                  ? "bg-teal-700 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                  activeTab ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                }`}
              >
                {t.count}
              </span>
            </Link>
          );
        })}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {orders.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">
            {view === "pending"
              ? "No pending orders — you're all caught up. 🎉"
              : "No orders yet."}
          </p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2">Order</th>
                <th className="px-5 py-2">Customer</th>
                <th className="px-5 py-2">Job</th>
                <th className="px-5 py-2">Department</th>
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
                    <Link href={`/orders/${o.id}`} className="text-teal-700">
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{o.customers?.full_name ?? "—"}</td>
                  <td className="px-5 py-3">
                    {o.job_type} × {o.qty}
                    {o.rush && (
                      <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                        RUSH
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">{o.departments?.name ?? "—"}</td>
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
          </table></div>
        )}
      </section>
    </div>
  );
}
