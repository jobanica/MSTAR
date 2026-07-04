import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createOrder } from "@/app/actions/data";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorNote, Field, inputClass } from "@/components/FormField";

export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: customers }, { data: departments }] = await Promise.all([
    supabase.from("customers").select("id, full_name").eq("is_active", true).order("full_name"),
    supabase.from("departments").select("id, name").eq("is_active", true).order("sort_order"),
  ]);

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">New Order</h1>
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
          <div className="grid grid-cols-2 gap-4">
            <Field label="Job type">
              <input name="job_type" required placeholder="e.g. Tarpaulin 4x8" className={inputClass} />
            </Field>
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
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Field label="Quantity">
              <input name="qty" type="number" min={1} defaultValue={1} className={inputClass} />
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
          <div className="grid grid-cols-3 gap-4">
            <Field label="Subtotal (₱)">
              <input name="subtotal" type="number" step="0.01" min={0} required className={inputClass} />
            </Field>
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
