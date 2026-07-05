import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { convertQuoteToOrder, updateQuoteStatus } from "@/app/actions/data";
import { formatCentavos, formatDate, QUOTE_STATUSES, statusLabel } from "@/lib/format";
import { StatusBadge } from "@/components/StatusBadge";
import { ErrorNote, inputClass } from "@/components/FormField";
import { SubmitButton } from "@/components/SubmitButton";
import { readQuoteItems } from "@/lib/quote";
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
  const items = readQuoteItems((data as { specs?: unknown }).specs);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/quotes" className="text-sm text-slate-500 hover:text-teal-700">
            ← Quotes
          </Link>
          <h1 className="mt-1 text-2xl font-bold">{quote.quote_number}</h1>
        </div>
        <div className="flex items-center gap-3">
          <a
            href={`/quotes/${quote.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            ⬇ PDF
          </a>
          <StatusBadge status={quote.status} />
        </div>
      </div>

      <ErrorNote message={error} />

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Row label="Customer" value={quote.customers?.full_name ?? "—"} />
        <Row label="Rush" value={quote.rush ? "Yes" : "No"} />
        <Row label="Due date" value={formatDate(quote.due_date)} />
        <Row label="Valid until" value={formatDate(quote.valid_until)} />

        {items.length > 0 ? (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <span>Item</span>
              <span>Amount</span>
            </div>
            <ul className="divide-y divide-slate-50">
              {items.map((it, i) => (
                <li key={i} className="flex items-start justify-between gap-3 py-2 text-sm">
                  <div>
                    <span className="font-medium text-slate-800">{it.name}</span>
                    <span className="ml-2 text-xs text-slate-400">
                      {it.qty} × {formatCentavos(it.unit_price_centavos)}
                    </span>
                  </div>
                  <span className="font-medium tabular-nums">
                    {formatCentavos(it.qty * it.unit_price_centavos)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <Row label="Job type" value={`${quote.job_type} × ${quote.qty}`} />
        )}

        <div className="mt-2 border-t border-slate-100 pt-2">
          <Row label="Subtotal" value={formatCentavos(quote.subtotal_centavos)} />
          <Row label="Discount" value={`- ${formatCentavos(quote.discount_centavos)}`} />
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
            <SubmitButton
              unstyled
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Update
            </SubmitButton>
          </form>

          <form action={convertQuoteToOrder}>
            <input type="hidden" name="id" value={quote.id} />
            <SubmitButton
              unstyled
              pendingLabel="Converting…"
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-600"
            >
              Convert to Order →
            </SubmitButton>
          </form>
        </section>
      ) : (
        quote.converted_to_order_id && (
          <p className="text-sm text-slate-600">
            Converted to order —{" "}
            <Link
              href={`/orders/${quote.converted_to_order_id}`}
              className="font-medium text-teal-700"
            >
              view order
            </Link>
          </p>
        )
      )}
    </div>
  );
}
