import { createClient } from "@/lib/supabase/server";
import { createService, toggleService } from "@/app/actions/data";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorNote, Field, inputClass } from "@/components/FormField";
import { formatCentavos } from "@/lib/format";
import type { Service } from "@/lib/types";

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("services")
    .select("*")
    .order("category", { nullsFirst: false })
    .order("name");
  const services = (data ?? []) as Service[];

  return (
    <>
      <PageHeader title="Services" breadcrumb={["Services"]} />

      <div className="max-w-4xl space-y-6">
        <ErrorNote message={error} />
        <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
          Your price list. Add a service here and its price fills in
          automatically when you pick it while creating a quote or an order.
        </p>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-4 text-base font-bold text-slate-900">
            Service list{" "}
            <span className="ml-1 text-sm font-normal text-slate-400">{services.length}</span>
          </div>
          {services.length === 0 ? (
            <p className="px-6 pb-8 text-sm text-slate-400">No services yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="px-6 py-3 font-medium">Service</th>
                    <th className="px-6 py-3 font-medium">Category</th>
                    <th className="px-6 py-3 font-medium">Unit</th>
                    <th className="px-6 py-3 text-right font-medium">Price</th>
                    <th className="px-6 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((s) => (
                    <tr key={s.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/70">
                      <td className="px-6 py-3">
                        <div className={`font-medium ${s.is_active ? "text-slate-800" : "text-slate-400 line-through"}`}>
                          {s.name}
                        </div>
                        {s.description && (
                          <div className="text-xs text-slate-400">{s.description}</div>
                        )}
                      </td>
                      <td className="px-6 py-3 text-slate-500">{s.category ?? "—"}</td>
                      <td className="px-6 py-3 text-slate-500">{s.unit ?? "—"}</td>
                      <td className="px-6 py-3 text-right font-semibold text-slate-800">
                        {formatCentavos(s.unit_price_centavos)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <form action={toggleService}>
                          <input type="hidden" name="id" value={s.id} />
                          <input type="hidden" name="is_active" value={String(!s.is_active)} />
                          <SubmitButton
                            unstyled
                            spinner={false}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                          >
                            {s.is_active ? "Deactivate" : "Activate"}
                          </SubmitButton>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">Add service</h2>
          <form action={createService} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Service name">
                <input name="name" required placeholder="e.g. Tarpaulin 4x8 (eyelets)" className={inputClass} />
              </Field>
              <Field label="Category">
                <input name="category" placeholder="e.g. Large Format" className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Price (₱)">
                <input name="price" type="number" step="0.01" min={0} required className={inputClass} />
              </Field>
              <Field label="Unit">
                <input name="unit" placeholder="per pc, per sqft…" className={inputClass} />
              </Field>
            </div>
            <Field label="Description">
              <input name="description" className={inputClass} />
            </Field>
            <SubmitButton>Add service</SubmitButton>
          </form>
        </section>
      </div>
    </>
  );
}
