import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCentavos, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import type { Order } from "@/lib/types";

export default async function OrdersPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, customers(id, full_name, phone), departments(id, name, color_hex)")
    .order("created_at", { ascending: false })
    .limit(100);
  const orders = (data ?? []) as unknown as Order[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Orders</h1>
        <Link
          href="/orders/new"
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600"
        >
          + New Order
        </Link>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {orders.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">No orders yet.</p>
        ) : (
          <table className="w-full text-sm">
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
          </table>
        )}
      </section>
    </div>
  );
}
