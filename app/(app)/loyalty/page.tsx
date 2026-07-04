import { createClient } from "@/lib/supabase/server";
import { adjustLoyaltyPoints, updateLoyaltySettings } from "@/app/actions/data";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorNote, Field, inputClass } from "@/components/FormField";
import { formatDateTime, statusLabel } from "@/lib/format";
import type { LoyaltySettings, LoyaltyTransaction } from "@/lib/types";

export default async function LoyaltyPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: settingsData }, { data: customers }, { data: txData }] = await Promise.all([
    supabase.from("loyalty_settings").select("*").maybeSingle(),
    supabase.from("customers").select("id, full_name, loyalty_points").eq("is_active", true).order("full_name"),
    supabase
      .from("loyalty_transactions")
      .select("*, customers(id, full_name)")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const settings = settingsData as LoyaltySettings | null;
  const txns = (txData ?? []) as unknown as LoyaltyTransaction[];

  return (
    <>
      <PageHeader title="Loyalty" breadcrumb={["Loyalty"]} />

      <div className="max-w-3xl space-y-6">
        <ErrorNote message={error} />

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">Program rules</h2>
          <form action={updateLoyaltySettings} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Points per ₱1 spent">
                <input name="points_per_peso" type="number" step="0.01" min={0} defaultValue={settings?.points_per_peso ?? 1} className={inputClass} />
              </Field>
              <Field label="₱ value per point redeemed">
                <input name="redeem_rate" type="number" step="0.01" min={0} defaultValue={settings?.redeem_rate ?? 1} className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Reward every N orders">
                <input name="milestone_orders" type="number" min={1} defaultValue={settings?.milestone_orders ?? 10} className={inputClass} />
              </Field>
              <Field label="Milestone reward">
                <input name="milestone_reward_description" defaultValue={settings?.milestone_reward_description ?? ""} placeholder="e.g. Free lamination upgrade" className={inputClass} />
              </Field>
            </div>
            <SubmitButton>Save rules</SubmitButton>
          </form>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">Adjust customer points</h2>
          {(customers ?? []).length === 0 ? (
            <p className="text-sm text-slate-400">No customers yet.</p>
          ) : (
            <form action={adjustLoyaltyPoints} className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <label className="block sm:col-span-2 text-sm">
                <span className="mb-1 block font-medium text-slate-700">Customer</span>
                <select name="customer_id" required className={inputClass}>
                  {(customers ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name} ({c.loyalty_points} pts)
                    </option>
                  ))}
                </select>
              </label>
              <Field label="Type">
                <select name="transaction_type" className={inputClass}>
                  <option value="earned">Earned (+)</option>
                  <option value="redeemed">Redeemed (−)</option>
                  <option value="adjusted">Adjusted (+)</option>
                  <option value="expired">Expired (−)</option>
                </select>
              </Field>
              <Field label="Points">
                <input name="points" type="number" min={0} required className={inputClass} />
              </Field>
              <div className="sm:col-span-4">
                <SubmitButton>Apply adjustment</SubmitButton>
              </div>
            </form>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-4 text-sm font-semibold">Recent activity</div>
          {txns.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-slate-400">No point activity yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-y border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-2 font-medium">Customer</th>
                  <th className="px-6 py-2 font-medium">Type</th>
                  <th className="px-6 py-2 text-right font-medium">Points</th>
                  <th className="px-6 py-2 text-right font-medium">Balance</th>
                  <th className="px-6 py-2 font-medium">When</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-6 py-2 text-slate-700">{t.customers?.full_name ?? "—"}</td>
                    <td className="px-6 py-2 text-slate-500">{statusLabel(t.transaction_type)}</td>
                    <td className={`px-6 py-2 text-right font-medium ${t.points >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {t.points >= 0 ? "+" : ""}
                      {t.points}
                    </td>
                    <td className="px-6 py-2 text-right text-slate-600">{t.balance_after}</td>
                    <td className="px-6 py-2 text-slate-400">{formatDateTime(t.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
