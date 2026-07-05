import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteEmployee } from "@/app/actions/data";
import { PageHeader } from "@/components/PageHeader";
import { formatCentavos, formatDate, statusLabel } from "@/lib/format";
import type { Employee } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  on_leave: "bg-amber-100 text-amber-700",
  terminated: "bg-red-100 text-red-700",
};

function avatarColor(seed: string) {
  const colors = ["#0f766e", "#7c3aed", "#db2777", "#2563eb", "#d97706", "#059669"];
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % colors.length;
  return colors[h];
}

function Avatar({ name }: { name: string }) {
  const label = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-semibold text-white"
      style={{ backgroundColor: avatarColor(name) }}
    >
      {label}
    </span>
  );
}

export default async function EmployeesPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("employees")
    .select("*, branches(id, name), departments(id, name)")
    .order("created_at", { ascending: false })
    .limit(200);
  const employees = (data ?? []) as unknown as Employee[];

  return (
    <>
      <PageHeader
        title="Employees"
        breadcrumb={["Employees"]}
        action={{ href: "/employees/new", label: "Add Employee" }}
      />

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="px-6 py-4 text-base font-bold text-slate-900">
          Staff Directory{" "}
          <span className="ml-1 text-sm font-normal text-slate-400">
            {employees.length}
          </span>
        </div>
        {employees.length === 0 ? (
          <p className="px-6 pb-8 text-sm text-slate-400">
            No employees yet.{" "}
            <Link href="/employees/new" className="font-medium text-teal-700">
              Add your first employee
            </Link>
            .
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3 font-medium">Employee</th>
                  <th className="px-6 py-3 font-medium">Position</th>
                  <th className="px-6 py-3 font-medium">Branch</th>
                  <th className="px-6 py-3 font-medium">Department</th>
                  <th className="px-6 py-3 font-medium">Type</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Hired</th>
                  <th className="px-6 py-3 text-right font-medium">Salary</th>
                  <th className="px-6 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((e) => (
                  <tr key={e.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        <Avatar name={e.full_name} />
                        <div>
                          <div className="font-medium text-slate-800">{e.full_name}</div>
                          <div className="text-xs text-slate-400">
                            {e.employee_code ?? e.email ?? "—"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-600">{e.position ?? "—"}</td>
                    <td className="px-6 py-3 text-slate-600">{e.branches?.name ?? "—"}</td>
                    <td className="px-6 py-3 text-slate-600">{e.departments?.name ?? "—"}</td>
                    <td className="px-6 py-3 text-slate-600">{statusLabel(e.employment_type)}</td>
                    <td className="px-6 py-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[e.status] ?? "bg-slate-100 text-slate-600"}`}>
                        {statusLabel(e.status)}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-slate-500">{formatDate(e.hire_date)}</td>
                    <td className="px-6 py-3 text-right text-slate-600">
                      {e.salary_centavos != null ? formatCentavos(e.salary_centavos) : "—"}
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/employees/${e.id}/edit`}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                        >
                          Edit
                        </Link>
                        <form action={deleteEmployee}>
                          <input type="hidden" name="id" value={e.id} />
                          <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50">
                            Delete
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
