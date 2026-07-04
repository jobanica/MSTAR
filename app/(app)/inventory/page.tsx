import { createClient } from "@/lib/supabase/server";
import { adjustStock, createMaterial } from "@/app/actions/data";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorNote, Field, inputClass } from "@/components/FormField";
import { formatCentavos } from "@/lib/format";
import type { Material } from "@/lib/types";

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const [{ data: matData }, { data: departments }] = await Promise.all([
    supabase
      .from("materials")
      .select("*, departments(id, name)")
      .eq("is_active", true)
      .order("name"),
    supabase.from("departments").select("id, name").eq("is_active", true).order("sort_order"),
  ]);
  const materials = (matData ?? []) as unknown as Material[];
  const lowCount = materials.filter((m) => m.current_stock <= m.reorder_threshold).length;

  return (
    <>
      <PageHeader title="Inventory" breadcrumb={["Inventory"]} />

      <div className="space-y-6">
        <ErrorNote message={error} />

        {lowCount > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⚠ {lowCount} material{lowCount > 1 ? "s are" : " is"} at or below the reorder
            threshold.
          </div>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-4 text-base font-bold text-slate-900">
            Materials{" "}
            <span className="ml-1 text-sm font-normal text-slate-400">{materials.length}</span>
          </div>
          {materials.length === 0 ? (
            <p className="px-6 pb-8 text-sm text-slate-400">No materials yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-6 py-3 font-medium">Material</th>
                    <th className="px-6 py-3 font-medium">Department</th>
                    <th className="px-6 py-3 text-right font-medium">In stock</th>
                    <th className="px-6 py-3 text-right font-medium">Reorder at</th>
                    <th className="px-6 py-3 text-right font-medium">Unit cost</th>
                    <th className="px-6 py-3 font-medium">Adjust stock</th>
                  </tr>
                </thead>
                <tbody>
                  {materials.map((m) => {
                    const low = m.current_stock <= m.reorder_threshold;
                    return (
                      <tr key={m.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                        <td className="px-6 py-3 font-medium text-slate-800">{m.name}</td>
                        <td className="px-6 py-3 text-slate-500">{m.departments?.name ?? "—"}</td>
                        <td className="px-6 py-3 text-right">
                          <span className={low ? "font-semibold text-red-600" : "text-slate-700"}>
                            {m.current_stock} {m.unit}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right text-slate-500">
                          {m.reorder_threshold} {m.unit}
                        </td>
                        <td className="px-6 py-3 text-right text-slate-500">
                          {formatCentavos(m.cost_per_unit_centavos)}
                        </td>
                        <td className="px-6 py-3">
                          <form action={adjustStock} className="flex items-center gap-1.5">
                            <input type="hidden" name="material_id" value={m.id} />
                            <input
                              name="quantity"
                              type="number"
                              step="0.01"
                              min={0}
                              placeholder="qty"
                              required
                              className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-teal-600"
                            />
                            <select
                              name="transaction_type"
                              className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm outline-none focus:border-teal-600"
                            >
                              <option value="restock">Restock (+)</option>
                              <option value="deduct">Deduct (−)</option>
                            </select>
                            <SubmitButton
                              unstyled
                              spinner={false}
                              className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              Apply
                            </SubmitButton>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">Add material</h2>
          <form action={createMaterial} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name">
                <input name="name" required placeholder="e.g. Tarpaulin Roll (White)" className={inputClass} />
              </Field>
              <Field label="Unit">
                <input name="unit" required placeholder="sqm, roll, ream…" className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Field label="Opening stock">
                <input name="current_stock" type="number" step="0.01" min={0} defaultValue={0} className={inputClass} />
              </Field>
              <Field label="Reorder at">
                <input name="reorder_threshold" type="number" step="0.01" min={0} defaultValue={0} className={inputClass} />
              </Field>
              <Field label="Unit cost (₱)">
                <input name="cost" type="number" step="0.01" min={0} className={inputClass} />
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
            <SubmitButton>Add material</SubmitButton>
          </form>
        </section>
      </div>
    </>
  );
}
