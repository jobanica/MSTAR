import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCentavos } from "@/lib/format";
import { inputClass } from "@/components/FormField";
import type { Customer } from "@/lib/types";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = (q ?? "").trim();
  const supabase = await createClient();

  let query = supabase.from("customers").select("*");
  if (term) {
    // Search across name, phone, and email.
    const like = `%${term}%`;
    query = query.or(`full_name.ilike.${like},phone.ilike.${like},email.ilike.${like}`);
  }
  const { data } = await query.order("created_at", { ascending: false }).limit(100);
  const customers = (data ?? []) as Customer[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Customers</h1>
        <Link
          href="/customers/new"
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600"
        >
          + New Customer
        </Link>
      </div>

      <form method="get" className="flex items-center gap-2">
        <input
          type="search"
          name="q"
          defaultValue={term}
          placeholder="Search by name, phone, or email…"
          className={`${inputClass} max-w-md`}
        />
        <button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          Search
        </button>
        {term && (
          <Link href="/customers" className="text-sm text-slate-500 hover:text-teal-700">
            Clear
          </Link>
        )}
      </form>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {customers.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">
            {term ? `No customers match “${term}”.` : "No customers yet."}
          </p>
        ) : (
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2">Name</th>
                <th className="px-5 py-2">Phone</th>
                <th className="px-5 py-2">Email</th>
                <th className="px-5 py-2">City</th>
                <th className="px-5 py-2 text-right">Orders</th>
                <th className="px-5 py-2 text-right">Total spend</th>
                <th className="px-5 py-2 text-right">Points</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium">
                    <Link href={`/customers/${c.id}`} className="text-teal-700 hover:underline">
                      {c.full_name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{c.phone ?? "—"}</td>
                  <td className="px-5 py-3">{c.email ?? "—"}</td>
                  <td className="px-5 py-3">{c.city ?? "—"}</td>
                  <td className="px-5 py-3 text-right">{c.total_orders}</td>
                  <td className="px-5 py-3 text-right">
                    {formatCentavos(c.total_spend_centavos)}
                  </td>
                  <td className="px-5 py-3 text-right">{c.loyalty_points}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </section>
    </div>
  );
}
