import { createClient } from "@/lib/supabase/server";
import { createEmployee } from "@/app/actions/data";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { EmployeeLoginFields } from "@/components/EmployeeLoginFields";
import { ErrorNote, Field, inputClass } from "@/components/FormField";

export default async function NewEmployeePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: branches }, { data: departments }] = await Promise.all([
    supabase.from("branches").select("id, name").eq("is_active", true).order("name"),
    supabase.from("departments").select("id, name").eq("is_active", true).order("sort_order"),
  ]);

  return (
    <>
      <PageHeader title="Add Employee" breadcrumb={["Employees", "New"]} />

      <div className="max-w-2xl">
        <ErrorNote message={error} />
        <form
          action={createEmployee}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <input name="full_name" required className={inputClass} />
            </Field>
            <Field label="Employee code">
              <input name="employee_code" placeholder="EMP-001" className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Position / job title">
              <input name="position" placeholder="e.g. Machine Operator" className={inputClass} />
            </Field>
            <Field label="Employment type">
              <select name="employment_type" defaultValue="full_time" className={inputClass}>
                <option value="full_time">Full time</option>
                <option value="part_time">Part time</option>
                <option value="contract">Contract</option>
                <option value="seasonal">Seasonal</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Branch">
              <select name="branch_id" className={inputClass}>
                <option value="">—</option>
                {(branches ?? []).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Department">
              <select name="department_id" className={inputClass}>
                <option value="">—</option>
                {(departments ?? []).map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email">
              <input name="email" type="email" className={inputClass} />
            </Field>
            <Field label="Phone">
              <input name="phone" placeholder="09xx xxx xxxx" className={inputClass} />
            </Field>
          </div>

          <Field label="Address">
            <input name="address" className={inputClass} />
          </Field>

          <EmployeeLoginFields />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Status">
              <select name="status" defaultValue="active" className={inputClass}>
                <option value="active">Active</option>
                <option value="on_leave">On leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </Field>
            <Field label="Hire date">
              <input name="hire_date" type="date" className={inputClass} />
            </Field>
            <Field label="Monthly salary (₱)">
              <input name="salary" type="number" step="0.01" min={0} className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Emergency contact name">
              <input name="emergency_contact_name" className={inputClass} />
            </Field>
            <Field label="Emergency contact phone">
              <input name="emergency_contact_phone" className={inputClass} />
            </Field>
          </div>

          <Field label="Notes">
            <textarea name="notes" rows={3} className={inputClass} />
          </Field>

          <SubmitButton>Add employee</SubmitButton>
        </form>
      </div>
    </>
  );
}
