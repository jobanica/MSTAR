import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  createDiscountRequest,
  postMessage,
  setFileStatus,
  updateOrderStatus,
  uploadOrderFile,
} from "@/app/actions/data";
import {
  formatCentavos,
  formatDate,
  formatDateTime,
  ORDER_STATUSES,
  statusLabel,
} from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorNote, inputClass } from "@/components/FormField";
import { SubmitButton } from "@/components/SubmitButton";
import type { Message, Order, OrderFile } from "@/lib/types";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const { error, saved } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select("*, customers(id, full_name, phone), departments(id, name, color_hex)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const order = data as unknown as Order;

  const [{ data: messagesData }, { data: filesData }] = await Promise.all([
    supabase
      .from("messages")
      .select("*, profiles(id, full_name)")
      .eq("order_id", id)
      .order("created_at", { ascending: true })
      .limit(100),
    supabase
      .from("files")
      .select("*")
      .eq("order_id", id)
      .order("version_number", { ascending: false }),
  ]);
  const messages = (messagesData ?? []) as unknown as Message[];
  const files = (filesData ?? []) as unknown as OrderFile[];

  // order-files is a private bucket — mint short-lived signed URLs so
  // staff can open each version. Images can preview; others download.
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
      <div className="flex items-center justify-between">
        <div>
          <Link href="/orders" className="text-sm text-slate-500 hover:text-teal-700">
            ← Orders
          </Link>
          <h1 className="mt-1 text-2xl font-bold">
            {order.order_number}
            {order.rush && (
              <span className="ml-3 rounded bg-red-100 px-2 py-0.5 align-middle text-xs font-semibold text-red-700">
                RUSH
              </span>
            )}
          </h1>
        </div>
        <form action={updateOrderStatus} className="flex items-center gap-2">
          <input type="hidden" name="id" value={order.id} />
          <select name="status" defaultValue={order.status} className={inputClass}>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </select>
          <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">
            Update
          </button>
          {saved && (
            <span className="flex items-center gap-1 whitespace-nowrap text-sm font-medium text-emerald-600">
              ✓ Update saved
            </span>
          )}
        </form>
      </div>

      <ErrorNote message={error} />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Details</h2>
          <Row label="Status" value={<StatusBadge status={order.status} />} />
          <Row label="Customer" value={order.customers?.full_name ?? "—"} />
          <Row label="Phone" value={order.customers?.phone ?? "—"} />
          <Row label="Job type" value={`${order.job_type} × ${order.qty}`} />
          <Row label="Department" value={order.departments?.name ?? "—"} />
          <Row label="Fulfillment" value={statusLabel(order.delivery_type)} />
          <Row label="Due date" value={formatDate(order.due_date)} />
          {order.notes && (
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              {order.notes}
            </p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Billing</h2>
          <Row label="Subtotal" value={formatCentavos(order.subtotal_centavos)} />
          <Row label="Delivery fee" value={formatCentavos(order.delivery_fee_centavos)} />
          <Row label="Discount" value={`- ${formatCentavos(order.discount_centavos)}`} />
          <div className="mt-2 border-t border-slate-100 pt-2">
            <Row label="Total" value={formatCentavos(order.total_centavos)} />
            <Row
              label="Payment"
              value={<StatusBadge status={order.payment_status} />}
            />
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Request a discount</h2>
        <p className="mb-3 text-xs text-slate-400">
          Log a customer&apos;s discount ask — the owner approves it under
          Discount Requests, and approval applies it to this order.
        </p>
        <form action={createDiscountRequest} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="order_id" value={order.id} />
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Amount (₱)</span>
            <input name="amount" type="number" step="0.01" min={0} required className={`${inputClass} w-32`} />
          </label>
          <label className="block flex-1 text-sm">
            <span className="mb-1 block font-medium text-slate-700">Reason</span>
            <input name="reason" placeholder="e.g. Loyal customer, bulk order" className={inputClass} />
          </label>
          <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">
            Submit request
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Files</h2>
        {files.length === 0 ? (
          <p className="text-sm text-slate-500">No files uploaded yet.</p>
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
                    </div>
                    <div className="mt-1 truncate text-slate-700">{f.file_name}</div>
                    <div className="text-xs text-slate-400">{formatDateTime(f.created_at)}</div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {url && (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        View
                      </a>
                    )}
                    {f.status !== "approved" && (
                      <form action={setFileStatus}>
                        <input type="hidden" name="order_id" value={order.id} />
                        <input type="hidden" name="file_id" value={f.id} />
                        <input type="hidden" name="status" value="approved" />
                        <button className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500">
                          Approve
                        </button>
                      </form>
                    )}
                    {f.status !== "for_review" && (
                      <form action={setFileStatus}>
                        <input type="hidden" name="order_id" value={order.id} />
                        <input type="hidden" name="file_id" value={f.id} />
                        <input type="hidden" name="status" value="for_review" />
                        <button className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-semibold text-amber-700 hover:bg-amber-50">
                          For Revision
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <form action={uploadOrderFile} className="mt-4 flex items-center gap-3">
          <input type="hidden" name="order_id" value={order.id} />
          <input type="file" name="file" required className="text-sm" />
          <SubmitButton>Upload version</SubmitButton>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold">Job chat</h2>
        <div className="space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-slate-500">No messages yet.</p>
          )}
          {messages.map((m) => (
            <div
              key={m.id}
              className={`rounded-lg p-3 text-sm ${
                m.is_internal
                  ? "border border-amber-200 bg-amber-50"
                  : "bg-slate-50"
              }`}
            >
              <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                <span className="font-medium text-slate-700">
                  {m.profiles?.full_name ?? "Customer"}
                </span>
                {m.is_internal && (
                  <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    INTERNAL
                  </span>
                )}
                <span>{formatDateTime(m.created_at)}</span>
              </div>
              {m.content}
            </div>
          ))}
        </div>
        <form action={postMessage} className="mt-4 space-y-2">
          <input type="hidden" name="order_id" value={order.id} />
          <textarea
            name="content"
            rows={2}
            required
            placeholder="Write a message…"
            className={inputClass}
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" name="is_internal" /> Internal note (hidden
              from customer)
            </label>
            <SubmitButton>Send</SubmitButton>
          </div>
        </form>
      </section>
    </div>
  );
}
