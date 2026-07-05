import { createClient } from "@/lib/supabase/server";
import {
  createInvitation,
  revokeInvitation,
  toggleUserActive,
  updateUserRole,
} from "@/app/actions/data";
import { PageHeader } from "@/components/PageHeader";
import { CopyLink } from "@/components/CopyLink";
import { ErrorNote, inputClass } from "@/components/FormField";
import { formatDate, statusLabel } from "@/lib/format";
import type { Invitation, Profile } from "@/lib/types";

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
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
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

  const [{ data }, { data: inviteData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, user_id, full_name, phone, role, is_active")
      .order("created_at", { ascending: true }),
    supabase
      .from("invitations")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);
  const members = (data ?? []) as Profile[];
  const invites = (inviteData ?? []) as Invitation[];

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "https://mstar-orpin.vercel.app";

  return (
    <>
      <PageHeader title="Users" breadcrumb={["Users"]} />

      <div className="space-y-4">
        <ErrorNote message={error} />

        {isAdmin && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-base font-bold text-slate-900">Invite a user</h2>
            <p className="mb-4 text-xs text-slate-400">
              Pick a role and generate a link. Share it with your teammate — they
              open it, set a password, and join your shop with that role.
            </p>
            <form action={createInvitation} className="flex flex-wrap items-end gap-3">
              <label className="block flex-1 text-sm">
                <span className="mb-1 block font-medium text-slate-700">
                  Email <span className="font-normal text-slate-400">(optional)</span>
                </span>
                <input name="email" type="email" placeholder="teammate@email.com" className={inputClass} />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-slate-700">Role</span>
                <select name="role" defaultValue="sales" className={inputClass}>
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>{statusLabel(r)}</option>
                  ))}
                </select>
              </label>
              <button className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-600">
                Generate invite
              </button>
            </form>

            {invites.length > 0 && (
              <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                <p className="text-sm font-semibold text-slate-700">Pending invites</p>
                {invites.map((inv) => (
                  <div key={inv.id} className="rounded-lg border border-slate-100 bg-slate-50/60 p-3">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                      <span>
                        <b className="text-slate-700">{statusLabel(inv.role)}</b>
                        {inv.email ? ` · ${inv.email}` : ""} · expires {formatDate(inv.expires_at)}
                      </span>
                      <form action={revokeInvitation}>
                        <input type="hidden" name="id" value={inv.id} />
                        <button className="font-medium text-red-600 hover:underline">Revoke</button>
                      </form>
                    </div>
                    <CopyLink url={`${siteUrl}/signup?invite=${inv.token}`} />
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          Team logins and their roles are managed here. HR records (with salary,
          contacts, etc.) live under{" "}
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
