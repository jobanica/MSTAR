import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { decideDiscountRequest } from "@/app/actions/data";
import { PageHeader } from "@/components/PageHeader";
import { ErrorNote } from "@/components/FormField";
import { formatCentavos, formatDateTime, statusLabel } from "@/lib/format";
import type { DiscountRequest } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default async function DiscountsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();
  const canApprove = ["admin", "super_admin"].includes(me?.role ?? "");

  const { data } = await supabase
    .from("discount_requests")
    .select("*, orders(id, order_number, total_centavos), customers(id, full_name)")
    .order("status", { ascending: true })
    .order("created_at", { ascending: false });
  const requests = (data ?? []) as unknown as DiscountRequest[];
  const pending = requests.filter((r) => r.status === "pending");
  const decided = requests.filter((r) => r.status !== "pending");

  function Card({ r }: { r: DiscountRequest }) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-slate-900">
                {formatCentavos(r.amount_centavos)}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>
                {statusLabel(r.status)}
              </span>
              {r.from_customer && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                  FROM CUSTOMER
                </span>
              )}
            </div>
            <div className="mt-1 text-sm text-slate-600">
              {r.customers?.full_name ?? "—"}
              {r.orders ? (
                <>
                  {" · "}
                  <Link href={`/orders/${r.orders.id}`} className="text-teal-700">
                    {r.orders.order_number}
                  </Link>{" "}
                  <span className="text-slate-400">
                    (total {formatCentavos(r.orders.total_centavos)})
                  </span>
                </>
              ) : null}
            </div>
            {r.reason && <p className="mt-1 text-sm text-slate-500">“{r.reason}”</p>}
            <p className="mt-1 text-xs text-slate-400">{formatDateTime(r.created_at)}</p>
          </div>

          {r.status === "pending" && canApprove && (
            <div className="flex shrink-0 gap-2">
              <form action={decideDiscountRequest}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="decision" value="approved" />
                <button className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-600">
                  Approve
                </button>
              </form>
              <form action={decideDiscountRequest}>
                <input type="hidden" name="id" value={r.id} />
                <input type="hidden" name="decision" value="rejected" />
                <button className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
                  Reject
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader title="Discount Requests" breadcrumb={["Discount Requests"]} />

      <div className="max-w-3xl space-y-6">
        <ErrorNote message={error} />
        {!canApprove && (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Only the owner/admin can approve or reject discount requests. You can
            view them here.
          </p>
        )}

        <div>
          <h2 className="mb-3 text-sm font-semibold text-slate-500">
            Pending ({pending.length})
          </h2>
          {pending.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-sm text-slate-400 shadow-sm">
              No pending discount requests.
            </p>
          ) : (
            <div className="space-y-3">
              {pending.map((r) => (
                <Card key={r.id} r={r} />
              ))}
            </div>
          )}
        </div>

        {decided.length > 0 && (
          <div>
            <h2 className="mb-3 text-sm font-semibold text-slate-500">History</h2>
            <div className="space-y-3">
              {decided.map((r) => (
                <Card key={r.id} r={r} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
