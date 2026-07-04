import { createClient } from "@/lib/supabase/server";
import { updateUserRole, toggleUserActive } from "@/app/actions/data";
import { PageHeader } from "@/components/PageHeader";
import { statusLabel } from "@/lib/format";
import type { Profile } from "@/lib/types";

const ASSIGNABLE_ROLES = ["admin", "sales", "designer", "operator"];

function avatarColor(seed: string) {
  const colors = ["#0f766e", "#7c3aed", "#db2777", "#2563eb", "#d97706", "#059669"];
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % colors.length;
  return colors[h];
}

export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("profiles")
    .select("id, user_id, full_name, phone, role, is_active")
    .order("created_at", { ascending: true });
  const members = (data ?? []) as Profile[];

  return (
    <>
      <PageHeader title="Users" breadcrumb={["Users"]} />

      <div className="space-y-4">
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          New teammates join by signing up and are then assigned a role here. HR
          records (with salary, contacts, etc.) live under{" "}
          <span className="font-medium text-slate-700">Employees</span>.
        </p>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-4 text-base font-bold text-slate-900">
            Team members{" "}
            <span className="ml-1 text-sm font-normal text-slate-400">{members.length}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3 font-medium">Member</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const isSelf = m.user_id === user?.id;
                  const name = m.full_name ?? "Unnamed";
                  return (
                    <tr key={m.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className="grid h-9 w-9 place-items-center rounded-full text-xs font-semibold text-white"
                            style={{ backgroundColor: avatarColor(name) }}
                          >
                            {name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
                          </span>
                          <div>
                            <div className="font-medium text-slate-800">
                              {name}
                              {isSelf && (
                                <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-400">{m.phone ?? "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        {m.role === "super_admin" ? (
                          <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-xs font-medium text-teal-800">
                            Super Admin
                          </span>
                        ) : (
                          <form action={updateUserRole} className="flex items-center gap-2">
                            <input type="hidden" name="id" value={m.id} />
                            <select
                              name="role"
                              defaultValue={m.role}
                              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-teal-600"
                            >
                              {ASSIGNABLE_ROLES.map((r) => (
                                <option key={r} value={r}>{statusLabel(r)}</option>
                              ))}
                            </select>
                            <button className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                              Save
                            </button>
                          </form>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            m.is_active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {m.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {!isSelf && (
                          <form action={toggleUserActive}>
                            <input type="hidden" name="id" value={m.id} />
                            <input type="hidden" name="is_active" value={String(!m.is_active)} />
                            <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                              {m.is_active ? "Deactivate" : "Activate"}
                            </button>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
