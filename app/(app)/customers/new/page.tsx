import { createCustomer } from "@/app/actions/data";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorNote, Field, inputClass } from "@/components/FormField";

export default async function NewCustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold">New Customer</h1>
      <ErrorNote message={error} />
      <form
        action={createCustomer}
        className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <Field label="Full name">
          <input name="full_name" required className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Phone">
            <input name="phone" className={inputClass} placeholder="09xx xxx xxxx" />
          </Field>
          <Field label="Email">
            <input name="email" type="email" className={inputClass} />
          </Field>
        </div>
        <Field label="Address">
          <input name="address" className={inputClass} />
        </Field>
        <Field label="City">
          <input name="city" className={inputClass} />
        </Field>
        <Field label="Notes">
          <textarea name="notes" rows={3} className={inputClass} />
        </Field>
        <SubmitButton>Create customer</SubmitButton>
      </form>
    </div>
  );
}
