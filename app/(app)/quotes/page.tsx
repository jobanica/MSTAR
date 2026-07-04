import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCentavos, formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import type { Quote } from "@/lib/types";

export default async function QuotesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("quotes")
    .select("*, customers(id, full_name, phone)")
    .order("created_at", { ascending: false })
    .limit(100);
  const quotes = (data ?? []) as unknown as Quote[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Quotes</h1>
        <Link
          href="/quotes/new"
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600"
        >
          + New Quote
        </Link>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {quotes.length === 0 ? (
          <p className="px-5 py-8 text-sm text-slate-500">No quotes yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-2">Quote</th>
                <th className="px-5 py-2">Customer</th>
                <th className="px-5 py-2">Job</th>
                <th className="px-5 py-2">Status</th>
                <th className="px-5 py-2">Valid until</th>
                <th className="px-5 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {quotes.map((q) => (
                <tr key={q.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-3 font-medium">
                    <Link href={`/quotes/${q.id}`} className="text-teal-700">
                      {q.quote_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3">{q.customers?.full_name ?? "—"}</td>
                  <td className="px-5 py-3">
                    {q.job_type} × {q.qty}
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={q.status} />
                  </td>
                  <td className="px-5 py-3">{formatDate(q.valid_until)}</td>
                  <td className="px-5 py-3 text-right font-medium">
                    {formatCentavos(q.total_centavos)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
