import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCentavos, formatDate, formatDateTime } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader } from "@/components/PageHeader";
import { RevenueChart } from "@/components/RevenueChart";
import type { Order } from "@/lib/types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function avatarColor(seed: string) {
  const colors = ["#0f766e", "#7c3aed", "#db2777", "#2563eb", "#d97706", "#059669"];
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % colors.length;
  return colors[h];
}

function Avatar({ name }: { name: string }) {
  const label = name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: avatarColor(name) }}
    >
      {label}
    </span>
  );
}

function Delta({ pct }: { pct: number }) {
  const up = pct >= 0;
  return (
    <span className={`font-semibold ${up ? "text-emerald-600" : "text-red-500"}`}>
      {up ? "↗" : "↘"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

function KpiCard({
  accent,
  label,
  value,
  footer,
}: {
  accent: string;
  label: string;
  value: string;
  footer: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <span className="h-4 w-1 rounded-full" style={{ backgroundColor: accent }} />
        <span className="text-sm text-slate-500">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
        {value}
      </div>
      <div className="mt-1.5 text-xs text-slate-400">{footer}</div>
    </div>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const seriesStart = new Date(now.getFullYear(), now.getMonth() - 8, 1);
  const weekAhead = new Date();
  weekAhead.setDate(weekAhead.getDate() + 7);
  const iso = (d: Date) => d.toISOString();

  const [
    revThisMonth,
    revLastMonth,
    newThisMonth,
    newLastMonth,
    active,
    rush,
    seriesRows,
    paymentsRes,
    recent,
    orgRow,
  ] = await Promise.all([
    supabase.from("orders").select("total_centavos").eq("status", "completed").gte("completed_at", iso(monthStart)),
    supabase.from("orders").select("total_centavos").eq("status", "completed").gte("completed_at", iso(lastMonthStart)).lt("completed_at", iso(monthStart)),
    supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", iso(monthStart)),
    supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", iso(lastMonthStart)).lt("created_at", iso(monthStart)),
    supabase.from("orders").select("id", { count: "exact", head: true }).not("status", "in", "(completed,cancelled)"),
    supabase.from("orders").select("id", { count: "exact", head: true }).eq("rush", true).not("status", "in", "(completed,cancelled)"),
    supabase.from("orders").select("total_centavos, completed_at").eq("status", "completed").gte("completed_at", iso(seriesStart)),
    supabase.from("payments").select("amount_centavos, method, paid_at, customers(full_name)").order("paid_at", { ascending: false }).limit(5),
    supabase.from("orders").select("id, order_number, job_type, rush, status, payment_status, due_date, total_centavos, customers(id, full_name, phone)").order("created_at", { ascending: false }).limit(6),
    supabase.from("organizations").select("slug").maybeSingle(),
  ]);

  const siteSlug = (orgRow.data as { slug: string | null } | null)?.slug ?? null;

  const sum = (rows: { total_centavos: number | null }[] | null) =>
    (rows ?? []).reduce((s, o) => s + (o.total_centavos ?? 0), 0);

  const revenue = sum(revThisMonth.data);
  const revenuePrev = sum(revLastMonth.data);
  const revDelta = revenuePrev > 0 ? ((revenue - revenuePrev) / revenuePrev) * 100 : revenue > 0 ? 100 : 0;

  const newOrders = newThisMonth.count ?? 0;
  const newPrev = newLastMonth.count ?? 0;
  const ordersDelta = newPrev > 0 ? ((newOrders - newPrev) / newPrev) * 100 : newOrders > 0 ? 100 : 0;

  // Build a 9-month revenue series
  const buckets = new Map<string, number>();
  for (let i = 8; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.set(`${d.getFullYear()}-${d.getMonth()}`, 0);
  }
  for (const row of seriesRows.data ?? []) {
    if (!row.completed_at) continue;
    const d = new Date(row.completed_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (buckets.has(key)) buckets.set(key, buckets.get(key)! + (row.total_centavos ?? 0));
  }
  const series = [...buckets.entries()].map(([key, value]) => ({
    label: MONTHS[Number(key.split("-")[1])],
    value,
  }));

  const payments = (paymentsRes.data ?? []) as unknown as {
    amount_centavos: number;
    method: string;
    paid_at: string;
    customers: { full_name: string } | null;
  }[];
  const orders = (recent.data ?? []) as unknown as Order[];

  return (
    <>
      <PageHeader title="Dashboard" action={{ href: "/orders/new", label: "New Order" }} />

      <div className="space-y-6">
        {siteSlug && (
          <a
            href={`/s/${siteSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between gap-4 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-white p-4 shadow-sm transition-colors hover:border-teal-300"
          >
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-100 text-teal-700">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20M12 2a15 15 0 010 20M12 2a15 15 0 000 20" />
                </svg>
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900">Your shop website is live</div>
                <div className="truncate text-xs text-slate-500">
                  Share <span className="font-mono">/s/{siteSlug}</span> so customers can view services and track orders.
                </div>
              </div>
            </div>
            <span className="hidden shrink-0 rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white sm:inline-block">
              Visit site →
            </span>
          </a>
        )}

        {/* KPI row */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            accent="#0f766e"
            label="Revenue (This Month)"
            value={formatCentavos(revenue)}
            footer={<><Delta pct={revDelta} /> vs last month</>}
          />
          <KpiCard
            accent="#2563eb"
            label="New Orders (This Month)"
            value={String(newOrders)}
            footer={<><Delta pct={ordersDelta} /> vs last month</>}
          />
          <KpiCard
            accent="#7c3aed"
            label="Active Orders"
            value={String(active.count ?? 0)}
            footer="Currently in production"
          />
          <KpiCard
            accent="#d97706"
            label="Rush Jobs"
            value={String(rush.count ?? 0)}
            footer="Need attention"
          />
        </div>

        {/* Chart + transactions */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">Revenue Growth</h2>
                <p className="text-xs text-slate-400">Completed orders, last 9 months</p>
              </div>
              <span className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium text-slate-500">
                Monthly
              </span>
            </div>
            <RevenueChart points={series} />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-bold text-slate-900">Transactions</h2>
            {payments.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                No payments recorded yet.
              </p>
            ) : (
              <ul className="space-y-4">
                {payments.map((p, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <Avatar name={p.customers?.full_name ?? "Walk-in"} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {p.customers?.full_name ?? "Walk-in"}
                      </p>
                      <p className="text-xs text-slate-400">
                        {formatDateTime(p.paid_at)}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-teal-700">
                      {formatCentavos(p.amount_centavos)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Recent orders list */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between px-6 py-4">
            <h2 className="text-base font-bold text-slate-900">
              Recent Orders{" "}
              <span className="ml-1 text-sm font-normal text-slate-400">
                {orders.length} shown
              </span>
            </h2>
            <Link href="/orders" className="text-sm font-medium text-teal-700 hover:text-teal-600">
              View all →
            </Link>
          </div>
          {orders.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-slate-400">
              No orders yet.{" "}
              <Link href="/orders/new" className="font-medium text-teal-700">
                Create your first order
              </Link>
              .
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-6 py-3 font-medium">Customer</th>
                    <th className="px-6 py-3 font-medium">Order</th>
                    <th className="px-6 py-3 font-medium">Job</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Payment</th>
                    <th className="px-6 py-3 font-medium">Due</th>
                    <th className="px-6 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={o.customers?.full_name ?? "Walk-in"} />
                          <div>
                            <div className="font-medium text-slate-800">
                              {o.customers?.full_name ?? "Walk-in"}
                            </div>
                            <div className="text-xs text-slate-400">
                              {o.customers?.phone ?? "—"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <Link href={`/orders/${o.id}`} className="font-medium text-teal-700">
                          {o.order_number}
                        </Link>
                      </td>
                      <td className="px-6 py-3 text-slate-600">
                        {o.job_type}
                        {o.rush && (
                          <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                            RUSH
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={o.status} />
                      </td>
                      <td className="px-6 py-3">
                        <StatusBadge status={o.payment_status} />
                      </td>
                      <td className="px-6 py-3 text-slate-500">{formatDate(o.due_date)}</td>
                      <td className="px-6 py-3 text-right font-semibold text-slate-800">
                        {formatCentavos(o.total_centavos)}
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
