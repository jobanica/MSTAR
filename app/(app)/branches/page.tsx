import { createClient } from "@/lib/supabase/server";
import { createBranch, deleteBranch } from "@/app/actions/data";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorNote, Field, inputClass } from "@/components/FormField";
import type { Branch } from "@/lib/types";

export default async function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("branches")
    .select("*")
    .order("is_main", { ascending: false })
    .order("name");
  const branches = (data ?? []) as Branch[];

  return (
    <>
      <PageHeader title="Branches" breadcrumb={["Branches"]} />

      <div className="max-w-4xl space-y-6">
        <ErrorNote message={error} />

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-4 text-base font-bold text-slate-900">
            Locations{" "}
            <span className="ml-1 text-sm font-normal text-slate-400">
              {branches.length}
            </span>
          </div>
          {branches.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-slate-400">No branches yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {branches.map((b) => (
                <li key={b.id} className="flex items-center justify-between px-6 py-4">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
                      ⌂
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-800">{b.name}</span>
                        {b.is_main && (
                          <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-semibold text-teal-800">
                            MAIN
                          </span>
                        )}
                        {b.code && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                            {b.code}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400">
                        {[b.address, b.city].filter(Boolean).join(", ") || "—"}
                        {b.phone ? ` · ${b.phone}` : ""}
                      </div>
                    </div>
                  </div>
                  {!b.is_main && (
                    <form action={deleteBranch}>
                      <input type="hidden" name="id" value={b.id} />
                      <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50">
                        Delete
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-base font-bold text-slate-900">Add branch</h2>
          <form action={createBranch} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Field label="Branch name">
                  <input name="name" required placeholder="e.g. Cebu Downtown" className={inputClass} />
                </Field>
              </div>
              <Field label="Code">
                <input name="code" placeholder="CEB" className={inputClass} />
              </Field>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <Field label="Address">
                  <input name="address" className={inputClass} />
                </Field>
              </div>
              <Field label="City">
                <input name="city" className={inputClass} />
              </Field>
            </div>
            <Field label="Phone">
              <input name="phone" placeholder="09xx xxx xxxx" className={inputClass} />
            </Field>
            <SubmitButton>Add branch</SubmitButton>
          </form>
        </section>
      </div>
    </>
  );
}
