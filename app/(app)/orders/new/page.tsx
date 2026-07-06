import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createOrder } from "@/app/actions/data";
import { SubmitButton } from "@/components/SubmitButton";
import { ServicePicker } from "@/components/ServicePicker";
import { ErrorNote, Field, inputClass } from "@/components/FormField";
import type { Service } from "@/lib/types";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: customers }, { data: departments }, { data: servicesData }] =
    await Promise.all([
      supabase.from("customers").select("id, full_name").eq("is_active", true).order("full_name"),
      supabase.from("departments").select("id, name").eq("is_active", true).order("sort_order"),
      supabase.from("services").select("*").eq("is_active", true).order("name"),
    ]);
  const services = (servicesData ?? []) as Service[];

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">New Order</h1>
        <Link
          href="/orders/quick"
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100"
        >
          ⚡ Quick Order
        </Link>
      </div>
      <ErrorNote message={error} />

      {(customers ?? []).length === 0 ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You need a customer first.{" "}
          <Link href="/customers/new" className="font-medium underline">
            Create one
          </Link>
          .
        </p>
      ) : (
        <form
          action={createOrder}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <Field label="Customer">
            <select name="customer_id" required className={inputClass}>
              {(customers ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.full_name}
                </option>
              ))}
            </select>
          </Field>

          <ServicePicker services={services} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Department">
              <select name="department_id" className={inputClass}>
                <option value="">—</option>
                {(departments ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Due date">
              <input name="due_date" type="date" className={inputClass} />
            </Field>
            <Field label="Fulfillment">
              <select name="delivery_type" className={inputClass}>
                <option value="pickup">Pickup</option>
                <option value="delivery">Delivery</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Delivery fee (₱)">
              <input name="delivery_fee" type="number" step="0.01" min={0} defaultValue={0} className={inputClass} />
            </Field>
            <Field label="Discount (₱)">
              <input name="discount" type="number" step="0.01" min={0} defaultValue={0} className={inputClass} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="rush" /> Rush job
          </label>
          <Field label="Notes">
            <textarea name="notes" rows={3} className={inputClass} />
          </Field>
          <SubmitButton>Create order</SubmitButton>
        </form>
      )}
    </div>
  );
}
