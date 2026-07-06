import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  formatCentavos,
  formatDate,
  formatDateTime,
  statusLabel,
} from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import type {
  Customer,
  Order,
  Quote,
  Invoice,
  Payment,
  OrderFile,
} from "@/lib/types";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const customer = data as unknown as Customer;

  // Orders, quotes, and payments are the customer's transaction history.
  const [{ data: ordersData }, { data: quotesData }, { data: paymentsData }] =
    await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .eq("customer_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("quotes")
        .select("*")
        .eq("customer_id", id)
        .order("created_at", { ascending: false }),
      supabase
        .from("payments")
        .select("*")
        .eq("customer_id", id)
        .order("paid_at", { ascending: false }),
    ]);
  const orders = (ordersData ?? []) as Order[];
  const quotes = (quotesData ?? []) as Quote[];
  const payments = (paymentsData ?? []) as Payment[];

  const orderIds = orders.map((o) => o.id);

  // Invoices and files hang off the customer's orders.
  const [{ data: invoicesData }, { data: filesData }] = await Promise.all([
    orderIds.length
      ? supabase
          .from("invoices")
          .select("*, orders(id, order_number)")
          .in("order_id", orderIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Invoice[] }),
    orderIds.length
      ? supabase
          .from("files")
          .select("*")
          .in("order_id", orderIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as OrderFile[] }),
  ]);
  const invoices = (invoicesData ?? []) as Invoice[];
  const files = (filesData ?? []) as OrderFile[];

  const orderNumberById = new Map(orders.map((o) => [o.id, o.order_number]));

  // order-files is a private bucket — mint short-lived signed URLs to view.
  const signedUrls = new Map<string, string>();
  if (files.length > 0) {
    const { data: signed } = await supabase.storage
      .from("order-files")
      .createSignedUrls(files.map((f) => f.storage_path), 3600);
    (signed ?? []).forEach((s, i) => {
      if (s.signedUrl) signedUrls.set(files[i].id, s.signedUrl);
    });
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <Link href="/customers" className="text-sm text-slate-500 hover:text-teal-700">
          ← Customers
        </Link>
        <h1 className="mt-1 text-2xl font-bold">{customer.full_name}</h1>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total spend" value={formatCentavos(customer.total_spend_centavos)} />
        <Stat label="Orders" value={orders.length} />
        <Stat label="Loyalty points" value={customer.loyalty_points} />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Contact details</h2>
        <div className="grid gap-x-8 sm:grid-cols-2">
          <Row label="Phone" value={customer.phone ?? "—"} />
          <Row label="Email" value={customer.email ?? "—"} />
          <Row label="Address" value={customer.address ?? "—"} />
          <Row label="City" value={customer.city ?? "—"} />
          <Row label="Member since" value={formatDate(customer.created_at)} />
          <Row
            label="Status"
            value={customer.is_active ? "Active" : "Inactive"}
          />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-6 py-4 text-sm font-semibold">
          Orders ({orders.length})
        </h2>
        {orders.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">No orders yet.</p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-6 py-2">Order</th>
                <th className="px-6 py-2">Job</th>
                <th className="px-6 py-2">Date</th>
                <th className="px-6 py-2">Status</th>
                <th className="px-6 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium">
                    <Link href={`/orders/${o.id}`} className="text-teal-700 hover:underline">
                      {o.order_number}
                    </Link>
                  </td>
                  <td className="px-6 py-3">{o.job_type}</td>
                  <td className="px-6 py-3">{formatDate(o.created_at)}</td>
                  <td className="px-6 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-6 py-3 text-right">{formatCentavos(o.total_centavos)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-6 py-4 text-sm font-semibold">
          Quotes ({quotes.length})
        </h2>
        {quotes.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">No quotes yet.</p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-6 py-2">Quote</th>
                <th className="px-6 py-2">Date</th>
                <th className="px-6 py-2">Status</th>
                <th className="px-6 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-6 py-3 font-medium">
                    <Link href={`/quotes/${q.id}`} className="text-teal-700 hover:underline">
                      {q.quote_number}
                    </Link>
                  </td>
                  <td className="px-6 py-3">{formatDate(q.created_at)}</td>
                  <td className="px-6 py-3"><StatusBadge status={q.status} /></td>
                  <td className="px-6 py-3 text-right">{formatCentavos(q.total_centavos)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-100 px-6 py-4 text-sm font-semibold">
          Payments ({payments.length})
        </h2>
        {payments.length === 0 ? (
          <p className="px-6 py-6 text-sm text-slate-500">No payments recorded.</p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="px-6 py-2">Date</th>
                <th className="px-6 py-2">Method</th>
                <th className="px-6 py-2">Reference</th>
                <th className="px-6 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-6 py-3">{formatDateTime(p.paid_at)}</td>
                  <td className="px-6 py-3">{statusLabel(p.method)}</td>
                  <td className="px-6 py-3">{p.reference_number ?? "—"}</td>
                  <td className="px-6 py-3 text-right font-medium">{formatCentavos(p.amount_centavos)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
        {invoices.length > 0 && (
          <div className="border-t border-slate-100 px-6 py-3 text-xs text-slate-400">
            {invoices.length} invoice{invoices.length === 1 ? "" : "s"} on record
          </div>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Files ({files.length})</h2>
        {files.length === 0 ? (
          <p className="text-sm text-slate-500">No files uploaded for this customer.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {files.map((f) => {
              const url = signedUrls.get(f.id);
              const isImage = (f.file_type ?? "").startsWith("image/");
              return (
                <li key={f.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  {url && isImage ? (
                    <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={f.file_name}
                        className="h-12 w-12 rounded-lg border border-slate-200 object-cover"
                      />
                    </a>
                  ) : (
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
                      ▤
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-semibold text-slate-600">
                        v{f.version_number}
                      </span>
                      <StatusBadge status={f.status} />
                      <Link
                        href={`/orders/${f.order_id}`}
                        className="text-xs text-teal-700 hover:underline"
                      >
                        {orderNumberById.get(f.order_id) ?? "order"}
                      </Link>
                    </div>
                    <div className="mt-1 truncate text-slate-700">{f.file_name}</div>
                    <div className="text-xs text-slate-400">{formatDateTime(f.created_at)}</div>
                  </div>
                  {url && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                    >
                      View
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
