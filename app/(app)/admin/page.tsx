import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { grantFreeMonths } from "@/app/actions/data";
import { PageHeader } from "@/components/PageHeader";
import { ErrorNote, inputClass } from "@/components/FormField";
import { formatDate } from "@/lib/format";

type Subscriber = {
  id: string;
  name: string;
  status: string;
  subscription_status: string;
  trial_ends_at: string | null;
  created_at: string;
  owner_email: string | null;
  order_count: number;
};

function daysLeft(
  trialEndsAt: string | null,
  now: number,
): { label: string; tone: string } {
  if (!trialEndsAt) return { label: "No free period", tone: "text-slate-400" };
  const ms = new Date(trialEndsAt).getTime() - now;
  const days = Math.ceil(ms / (1000 * 60 * 60 * 24));
  if (days < 0) return { label: `Expired ${-days}d ago`, tone: "text-rose-600" };
  if (days === 0) return { label: "Ends today", tone: "text-amber-600" };
  return { label: `${days} day${days === 1 ? "" : "s"} left`, tone: "text-emerald-600" };
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  // Super-admin only.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (profile?.role !== "super_admin") redirect("/dashboard");

  const { data } = await supabase.rpc("admin_list_subscribers");
  const subscribers = (data ?? []) as Subscriber[];

  // Server component renders once per request, so a single "now" is correct.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const activeFree = subscribers.filter(
    (s) => s.trial_ends_at && new Date(s.trial_ends_at).getTime() > now,
  ).length;

  return (
    <>
      <PageHeader title="Subscribers" breadcrumb={["Subscribers"]} />

      <div className="space-y-6">
        <ErrorNote message={error} />

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-400">Subscribers</div>
            <div className="mt-1 text-2xl font-bold">{subscribers.length}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-400">On free period</div>
            <div className="mt-1 text-2xl font-bold">{activeFree}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-xs uppercase tracking-wide text-slate-400">Expired / none</div>
            <div className="mt-1 text-2xl font-bold">{subscribers.length - activeFree}</div>
          </div>
        </div>

        <section className="space-y-4">
          {subscribers.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-sm text-slate-400 shadow-sm">
              No subscribers yet.
            </p>
          ) : (
            subscribers.map((s) => {
              const d = daysLeft(s.trial_ends_at, now);
              return (
                <div
                  key={s.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-base font-bold text-slate-900">{s.name}</div>
                      <div className="text-xs text-slate-400">
                        {s.owner_email ?? "—"} · {s.order_count} orders · joined{" "}
                        {formatDate(s.created_at)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${d.tone}`}>{d.label}</div>
                      <div className="text-xs text-slate-400">
                        {s.trial_ends_at
                          ? `Free until ${formatDate(s.trial_ends_at)}`
                          : "—"}{" "}
                        · {s.subscription_status}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-slate-100 pt-4">
                    {/* Add months on top of the current free period */}
                    <form action={grantFreeMonths} className="flex items-end gap-2">
                      <input type="hidden" name="org_id" value={s.id} />
                      <input type="hidden" name="mode" value="add" />
                      <label className="block text-sm">
                        <span className="mb-1 block font-medium text-slate-700">
                          Give free months
                        </span>
                        <input
                          name="months"
                          type="number"
                          min={1}
                          max={120}
                          defaultValue={1}
                          className={`${inputClass} w-24`}
                        />
                      </label>
                      <button className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-600">
                        Add
                      </button>
                    </form>

                    {/* Quick presets that ADD months */}
                    <div className="flex items-center gap-1.5">
                      {[3, 6, 12].map((m) => (
                        <form key={m} action={grantFreeMonths}>
                          <input type="hidden" name="org_id" value={s.id} />
                          <input type="hidden" name="mode" value="add" />
                          <input type="hidden" name="months" value={m} />
                          <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                            +{m}mo
                          </button>
                        </form>
                      ))}
                    </div>

                    {/* End the free period now */}
                    <form action={grantFreeMonths} className="ml-auto">
                      <input type="hidden" name="org_id" value={s.id} />
                      <input type="hidden" name="mode" value="set" />
                      <input type="hidden" name="months" value={0} />
                      <button className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">
                        End free period
                      </button>
                    </form>
                  </div>
                </div>
              );
            })
          )}
        </section>
      </div>
    </>
  );
}
