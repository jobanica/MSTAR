import Link from "next/link";
import { createQuickOrder } from "@/app/actions/data";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorNote, Field, inputClass } from "@/components/FormField";

export default async function QuickOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <Link href="/orders" className="text-sm text-slate-500 hover:text-teal-700">
          ← Orders
        </Link>
        <h1 className="mt-1 text-2xl font-bold">⚡ Quick Order</h1>
        <p className="mt-1 text-sm text-slate-500">
          For fast walk-in jobs like a photocopy — no customer details needed.
        </p>
      </div>

      <ErrorNote message={error} />

      <form
        action={createQuickOrder}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <Field label="Job">
          <input
            name="job_type"
            defaultValue="Photocopy"
            required
            placeholder="e.g. Photocopy, Print A4"
            className={inputClass}
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Quantity">
            <input name="qty" type="number" min={1} defaultValue={1} className={inputClass} />
          </Field>
          <Field label="Amount (₱)">
            <input name="amount" type="number" step="0.01" min={0} required className={inputClass} />
          </Field>
        </div>

        <Field label="Note (optional)">
          <input name="notes" placeholder="Anything to remember" className={inputClass} />
        </Field>

        <div className="space-y-2 rounded-lg bg-slate-50 p-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="done" defaultChecked /> Mark as done now
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="paid" defaultChecked /> Paid
          </label>
        </div>

        <SubmitButton>Create quick order</SubmitButton>
      </form>
    </div>
  );
}
