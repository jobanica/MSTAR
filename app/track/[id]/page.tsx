import { createClient } from "@/lib/supabase/server";
import { formatDate, statusLabel } from "@/lib/format";

const STEPS = [
  { slug: "new", label: "Order received" },
  { slug: "design", label: "In design" },
  { slug: "revision", label: "Revision" },
  { slug: "approved", label: "Approved" },
  { slug: "sent_to_production", label: "Sent to production" },
  { slug: "printing", label: "Printing" },
  { slug: "done", label: "Done" },
  { slug: "ready", label: "Ready for pickup" },
  { slug: "completed", label: "Completed" },
];

export default async function TrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data } = await supabase.rpc("public_order_track", { p_order_id: id });
  const order = Array.isArray(data) ? data[0] : null;

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
        <div className="max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-bold text-slate-900">Order not found</h1>
          <p className="mt-2 text-sm text-slate-500">
            This tracking link is invalid or the order is no longer available.
          </p>
        </div>
      </div>
    );
  }

  const currentIndex = STEPS.findIndex((s) => s.slug === order.status);
  const cancelled = order.status === "cancelled";

  return (
    <div className="flex min-h-screen items-start justify-center bg-slate-50 p-6">
      <div className="mt-8 w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="text-lg font-bold text-teal-700">{order.shop_name}</div>
          <p className="text-sm text-slate-500">Order tracking</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">Order</div>
              <div className="text-lg font-bold text-slate-900">{order.order_number}</div>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                cancelled
                  ? "bg-red-100 text-red-700"
                  : order.status === "completed"
                    ? "bg-green-100 text-green-700"
                    : "bg-teal-100 text-teal-800"
              }`}
            >
              {statusLabel(order.status)}
            </span>
          </div>
          <div className="mt-2 text-sm text-slate-500">
            {order.job_type}
            {order.due_date ? ` · Due ${formatDate(order.due_date)}` : ""}
          </div>
        </div>

        {!cancelled && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <ol className="space-y-3">
              {STEPS.map((step, i) => {
                const done = i < currentIndex;
                const active = i === currentIndex;
                return (
                  <li key={step.slug} className="flex items-center gap-3">
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ${
                        done
                          ? "bg-teal-600 text-white"
                          : active
                            ? "bg-teal-100 text-teal-800 ring-2 ring-teal-500"
                            : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span
                      className={`text-sm ${
                        active
                          ? "font-semibold text-slate-900"
                          : done
                            ? "text-slate-500"
                            : "text-slate-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        <p className="text-center text-xs text-slate-400">Powered by PrintOS</p>
      </div>
    </div>
  );
}
