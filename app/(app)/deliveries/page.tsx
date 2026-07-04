import { createClient } from "@/lib/supabase/server";
import { upsertDelivery } from "@/app/actions/data";
import { PageHeader } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { SubmitButton } from "@/components/SubmitButton";
import { Field, inputClass } from "@/components/FormField";
import { formatCentavos } from "@/lib/format";
import type { Delivery } from "@/lib/types";

const STATUSES = ["pending", "out_for_delivery", "delivered", "failed"];

export default async function DeliveriesPage() {
  const supabase = await createClient();

  const [{ data: delData }, { data: orderData }] = await Promise.all([
    supabase
      .from("deliveries")
      .select("*, orders(id, order_number, customers(id, full_name, phone))")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("orders")
      .select("id, order_number, customers(full_name)")
      .eq("delivery_type", "delivery")
      .not("status", "in", "(completed,cancelled)")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const deliveries = (delData ?? []) as unknown as Delivery[];
  const withDelivery = new Set(deliveries.map((d) => d.order_id));
  const needsDelivery = (orderData ?? []).filter((o) => !withDelivery.has(o.id)) as unknown as {
    id: string;
    order_number: string;
    customers?: { full_name: string } | null;
  }[];

  return (
    <>
      <PageHeader title="Deliveries" breadcrumb={["Deliveries"]} />

      <div className="space-y-6">
        {needsDelivery.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-base font-bold text-slate-900">Schedule a delivery</h2>
            <form action={upsertDelivery} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block sm:col-span-2 text-sm">
                <span className="mb-1 block font-medium text-slate-700">Order</span>
                <select name="order_id" required className={inputClass}>
                  {needsDelivery.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} — {o.customers?.full_name ?? "Walk-in"}
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Delivery address">
                <input name="delivery_address" className={inputClass} />
              </Field>
              <Field label="City">
                <input name="city" className={inputClass} />
              </Field>
              <Field label="Rider name">
                <input name="rider_name" className={inputClass} />
              </Field>
              <Field label="Delivery fee (₱)">
                <input name="fee" type="number" step="0.01" min={0} className={inputClass} />
              </Field>
              <input type="hidden" name="status" value="pending" />
              <div className="sm:col-span-2">
                <SubmitButton>Schedule delivery</SubmitButton>
              </div>
            </form>
          </section>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-4 text-base font-bold text-slate-900">
            Deliveries{" "}
            <span className="ml-1 text-sm font-normal text-slate-400">{deliveries.length}</span>
          </div>
          {deliveries.length === 0 ? (
            <p className="px-6 pb-8 text-sm text-slate-400">No deliveries scheduled yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {deliveries.map((d) => (
                <li key={d.id} className="px-6 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">
                          {d.orders?.order_number ?? "—"}
                        </span>
                        <StatusBadge status={d.status} />
                      </div>
                      <div className="mt-0.5 text-xs text-slate-400">
                        {d.orders?.customers?.full_name ?? "—"}
                        {" · "}
                        {[d.delivery_address, d.city].filter(Boolean).join(", ") || "no address"}
                        {d.rider_name ? ` · Rider: ${d.rider_name}` : ""}
                        {d.fee_centavos ? ` · ${formatCentavos(d.fee_centavos)}` : ""}
                      </div>
                    </div>
                    <form action={upsertDelivery} className="flex items-center gap-2">
                      <input type="hidden" name="order_id" value={d.order_id} />
                      <input type="hidden" name="delivery_address" value={d.delivery_address ?? ""} />
                      <input type="hidden" name="city" value={d.city ?? ""} />
                      <input type="hidden" name="rider_name" value={d.rider_name ?? ""} />
                      <select
                        name="status"
                        defaultValue={d.status}
                        className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-teal-600"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                      <SubmitButton
                        unstyled
                        spinner={false}
                        className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Update
                      </SubmitButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
