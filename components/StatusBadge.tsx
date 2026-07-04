import { statusLabel } from "@/lib/format";

const COLORS: Record<string, string> = {
  // order statuses
  new: "bg-slate-100 text-slate-700",
  design: "bg-blue-100 text-blue-700",
  revision: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  sent_to_production: "bg-violet-100 text-violet-700",
  printing: "bg-teal-100 text-teal-800",
  done: "bg-teal-100 text-teal-700",
  ready: "bg-cyan-100 text-cyan-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  // quote statuses
  draft: "bg-slate-100 text-slate-700",
  sent: "bg-blue-100 text-blue-700",
  expired: "bg-red-100 text-red-700",
  converted: "bg-green-100 text-green-700",
  // payment statuses
  unpaid: "bg-red-100 text-red-700",
  partial: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${COLORS[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {statusLabel(status)}
    </span>
  );
}
