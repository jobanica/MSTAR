import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateEmployee } from "@/app/actions/data";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorNote, Field, inputClass } from "@/components/FormField";
import type { Employee } from "@/lib/types";

export default async function EditEmployeePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: emp }, { data: branches }, { data: departments }] =
    await Promise.all([
      supabase.from("employees").select("*").eq("id", id).maybeSingle(),
      supabase.from("branches").select("id, name").eq("is_active", true).order("name"),
      supabase.from("departments").select("id, name").eq("is_active", true).order("sort_order"),
    ]);
  if (!emp) notFound();
  const e = emp as Employee;

  return (
    <>
      <PageHeader title="Edit Employee" breadcrumb={["Employees", "Edit"]} />

      <div className="max-w-2xl">
        <ErrorNote message={error} />
        <form
          action={updateEmployee}
          className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <input type="hidden" name="id" value={e.id} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Full name">
              <input name="full_name" required defaultValue={e.full_name} className={inputClass} />
            </Field>
            <Field label="Employee code">
              <input name="employee_code" defaultValue={e.employee_code ?? ""} placeholder="EMP-001" className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Position / job title">
              <input name="position" defaultValue={e.position ?? ""} placeholder="e.g. Machine Operator" className={inputClass} />
            </Field>
            <Field label="Employment type">
              <select name="employment_type" defaultValue={e.employment_type} className={inputClass}>
                <option value="full_time">Full time</option>
                <option value="part_time">Part time</option>
                <option value="contract">Contract</option>
                <option value="seasonal">Seasonal</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Branch">
              <select name="branch_id" defaultValue={e.branch_id ?? ""} className={inputClass}>
                <option value="">—</option>
                {(branches ?? []).map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Department">
              <select name="department_id" defaultValue={e.department_id ?? ""} className={inputClass}>
                <option value="">—</option>
                {(departments ?? []).map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Email">
              <input name="email" type="email" defaultValue={e.email ?? ""} className={inputClass} />
            </Field>
            <Field label="Phone">
              <input name="phone" defaultValue={e.phone ?? ""} placeholder="09xx xxx xxxx" className={inputClass} />
            </Field>
          </div>

          <Field label="Address">
            <input name="address" defaultValue={e.address ?? ""} className={inputClass} />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Status">
              <select name="status" defaultValue={e.status} className={inputClass}>
                <option value="active">Active</option>
                <option value="on_leave">On leave</option>
                <option value="terminated">Terminated</option>
              </select>
            </Field>
            <Field label="Hire date">
              <input name="hire_date" type="date" defaultValue={e.hire_date ?? ""} className={inputClass} />
            </Field>
            <Field label="Monthly salary (₱)">
              <input
                name="salary"
                type="number"
                step="0.01"
                min={0}
                defaultValue={e.salary_centavos != null ? (e.salary_centavos / 100).toFixed(2) : ""}
                className={inputClass}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Emergency contact name">
              <input name="emergency_contact_name" defaultValue={e.emergency_contact_name ?? ""} className={inputClass} />
            </Field>
            <Field label="Emergency contact phone">
              <input name="emergency_contact_phone" defaultValue={e.emergency_contact_phone ?? ""} className={inputClass} />
            </Field>
          </div>

          <Field label="Notes">
            <textarea name="notes" rows={3} defaultValue={e.notes ?? ""} className={inputClass} />
          </Field>

          <SubmitButton>Save changes</SubmitButton>
        </form>
      </div>
    </>
  );
}
