import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { convertQuoteToOrder, updateQuoteStatus } from "@/app/actions/data";
import { formatCentavos, formatDate, QUOTE_STATUSES, statusLabel } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorNote, inputClass } from "@/components/FormField";
import type { Quote } from "@/lib/types";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

export default async function QuoteDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const { error } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("quotes")
    .select("*, customers(id, full_name, phone)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const quote = data as unknown as Quote;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/quotes" className="text-sm text-slate-500 hover:text-indigo-600">
            ← Quotes
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{quote.quote_number}</h1>
        </div>
        <StatusBadge status={quote.status} />
      </div>

      <ErrorNote message={error} />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Row label="Customer" value={quote.customers?.full_name ?? "—"} />
        <Row label="Job type" value={`${quote.job_type} × ${quote.qty}`} />
        <Row label="Rush" value={quote.rush ? "Yes" : "No"} />
        <Row label="Due date" value={formatDate(quote.due_date)} />
        <Row label="Valid until" value={formatDate(quote.valid_until)} />
        <Row label="Subtotal" value={formatCentavos(quote.subtotal_centavos)} />
        <Row label="Discount" value={`- ${formatCentavos(quote.discount_centavos)}`} />
        <div className="mt-2 border-t border-slate-100 pt-2">
          <Row label="Total" value={formatCentavos(quote.total_centavos)} />
        </div>
        {quote.notes && (
          <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
            {quote.notes}
          </p>
        )}
      </section>

      {quote.status !== "converted" ? (
        <section className="flex items-end justify-between gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <form action={updateQuoteStatus} className="flex items-end gap-2">
            <input type="hidden" name="id" value={quote.id} />
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Status</span>
              <select name="status" defaultValue={quote.status} className={inputClass}>
                {QUOTE_STATUSES.filter((s) => s !== "converted").map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
            </label>
            <button className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50">
              Update
            </button>
          </form>

          <form action={convertQuoteToOrder}>
            <input type="hidden" name="id" value={quote.id} />
            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500">
              Convert to Order →
            </button>
          </form>
        </section>
      ) : (
        quote.converted_to_order_id && (
          <p className="text-sm text-slate-600">
            Converted to order —{" "}
            <Link
              href={`/orders/${quote.converted_to_order_id}`}
              className="font-medium text-indigo-600"
            >
              view order
            </Link>
          </p>
        )
      )}
    </div>
  );
}
