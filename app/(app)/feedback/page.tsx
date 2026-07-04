import { createClient } from "@/lib/supabase/server";
import { reviewFeedback } from "@/app/actions/data";
import { PageHeader } from "@/components/PageHeader";
import { formatDate } from "@/lib/format";
import type { Feedback } from "@/lib/types";

function Stars({ n }: { n: number }) {
  return (
    <span className="text-amber-500" aria-label={`${n} of 5`}>
      {"★".repeat(n)}
      <span className="text-slate-200">{"★".repeat(5 - n)}</span>
    </span>
  );
}

export default async function FeedbackPage() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("feedback")
    .select("*, orders(id, order_number), customers(id, full_name)")
    .order("submitted_at", { ascending: false })
    .limit(200);
  const items = (data ?? []) as unknown as Feedback[];

  const avg =
    items.length > 0
      ? (items.reduce((s, f) => s + f.rating, 0) / items.length).toFixed(2)
      : "—";
  const flagged = items.filter((f) => f.flagged_for_review).length;

  return (
    <>
      <PageHeader title="Feedback" breadcrumb={["Feedback"]} />

      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Average rating</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{avg}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Total reviews</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{items.length}</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-slate-500">Flagged for review</div>
            <div className="mt-1 text-2xl font-bold text-red-600">{flagged}</div>
          </div>
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="px-6 py-4 text-base font-bold text-slate-900">Reviews</div>
          {items.length === 0 ? (
            <p className="px-6 pb-8 text-sm text-slate-400">No feedback yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 border-t border-slate-100">
              {items.map((f) => (
                <li
                  key={f.id}
                  className={`px-6 py-4 ${f.flagged_for_review ? "bg-red-50/40" : ""}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Stars n={f.rating} />
                        <span className="text-sm font-medium text-slate-800">
                          {f.customers?.full_name ?? "Customer"}
                        </span>
                        {f.flagged_for_review && (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                            FLAGGED
                          </span>
                        )}
                      </div>
                      {f.comment && (
                        <p className="mt-1 text-sm text-slate-600">{f.comment}</p>
                      )}
                      <p className="mt-1 text-xs text-slate-400">
                        {f.orders?.order_number ?? ""} · {formatDate(f.submitted_at)}
                      </p>
                    </div>
                    {f.flagged_for_review && (
                      <form action={reviewFeedback}>
                        <input type="hidden" name="id" value={f.id} />
                        <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50">
                          Mark reviewed
                        </button>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
