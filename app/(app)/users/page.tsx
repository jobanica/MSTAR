import { createClient } from "@/lib/supabase/server";
import {
  createUserAccount,
  resetUserPassword,
  toggleUserActive,
  updateUserRole,
} from "@/app/actions/data";
import { PageHeader } from "@/components/PageHeader";
import { TempPassword } from "@/components/TempPassword";
import { ErrorNote, inputClass } from "@/components/FormField";
import { statusLabel } from "@/lib/format";
import type { Profile } from "@/lib/types";

const ASSIGNABLE_ROLES = ["admin", "sales", "designer", "operator"];

function avatarColor(seed: string) {
  const colors = ["#0f766e", "#7c3aed", "#db2777", "#2563eb", "#d97706", "#059669"];
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) % colors.length;
  return colors[h];
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; reset?: string }>;
}) {
  const { error, created, reset } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();
  const isAdmin = ["admin", "super_admin"].includes(me?.role ?? "");

  const { data } = await supabase
    .from("profiles")
    .select("id, user_id, full_name, phone, role, is_active")
    .order("created_at", { ascending: true });
  const members = (data ?? []) as Profile[];

  return (
    <>
      <PageHeader title="Users" breadcrumb={["Users"]} />

      <div className="space-y-4">
        <ErrorNote message={error} />
        {created && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            ✓ Login created for <b>{created}</b>. Share the email and the temporary
            password you set — they can sign in right away and change it later.
          </p>
        )}
        {reset && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            ✓ Password updated. Share the new temporary password with the teammate.
          </p>
        )}

        {isAdmin && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-base font-bold text-slate-900">Add a user</h2>
            <p className="mb-4 text-xs text-slate-400">
              Create a login and temporary password for a teammate. They sign in
              with it immediately — no invite link needed. You can change their role
              anytime below.
            </p>
            <form action={createUserAccount} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Full name</span>
                  <input name="full_name" required placeholder="Juan Dela Cruz" className={inputClass} />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Login email</span>
                  <input name="email" type="email" required placeholder="teammate@email.com" className={inputClass} />
                </label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Role</span>
                  <select name="role" defaultValue="operator" className={inputClass}>
                    {ASSIGNABLE_ROLES.map((r) => (
                      <option key={r} value={r}>{statusLabel(r)}</option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-700">Temporary password</span>
                  <TempPassword name="password" />
                </label>
              </div>
              <button className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-600">
                Create login
              </button>
            </form>
          </section>
        )}

        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          Team logins and their roles are managed here. HR records (with salary,
          contacts, etc.) live under{" "}
          <span className="font-medium text-slate-700">Employees</span> — creating an
          employee can also create their login automatically.
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
                    <tr key={m.id} className="border-b border-slate-50 align-top last:border-0 hover:bg-slate-50/70">
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
                      <td className="px-6 py-3">
                        <div className="flex flex-col items-end gap-2">
                          {!isSelf && (
                            <form action={toggleUserActive}>
                              <input type="hidden" name="id" value={m.id} />
                              <input type="hidden" name="is_active" value={String(!m.is_active)} />
                              <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                                {m.is_active ? "Deactivate" : "Activate"}
                              </button>
                            </form>
                          )}
                          {isAdmin && m.role !== "super_admin" && (
                            <details className="text-right">
                              <summary className="cursor-pointer list-none rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                                Reset password
                              </summary>
                              <form action={resetUserPassword} className="mt-2 flex items-center gap-2">
                                <input type="hidden" name="user_id" value={m.user_id} />
                                <TempPassword name="password" />
                                <button className="shrink-0 rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-600">
                                  Save
                                </button>
                              </form>
                            </details>
                          )}
                        </div>
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
