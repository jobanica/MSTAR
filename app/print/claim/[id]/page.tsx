import QRCode from "qrcode";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime } from "@/lib/format";
import { PrintButton } from "@/components/PrintButton";
import type { Order } from "@/lib/types";

export const metadata = { title: "Claim Stub" };

export default async function ClaimStubPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Staff-only — this route lives outside the app shell so the printout
  // is clean, so we guard auth here ourselves.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data } = await supabase
    .from("orders")
    .select("*, customers(id, full_name, phone), organizations(name, contact_phone)")
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const order = data as unknown as Order & {
    organizations?: { name: string; contact_phone: string | null } | null;
  };

  const shopName = order.organizations?.name ?? "PrintOS";
  const shopPhone = order.organizations?.contact_phone ?? null;

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const trackingUrl = `${base}/track/${order.id}`;
  const qr = await QRCode.toString(trackingUrl, { type: "svg", margin: 1, width: 200 });

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      {/* Receipt-sized stub — ~58mm thermal width. */}
      <div className="stub mx-auto bg-white px-4 py-5 text-center text-slate-900 shadow-sm print:shadow-none">
        <div className="text-base font-bold uppercase tracking-wide">{shopName}</div>
        {shopPhone && <div className="text-[11px] text-slate-500">{shopPhone}</div>}

        <div className="my-2 border-t border-dashed border-slate-400" />

        <div className="text-sm font-semibold">CLAIM STUB</div>

        <div className="mt-2 text-left text-[12px] leading-5">
          <div className="flex justify-between">
            <span className="text-slate-500">Order</span>
            <span className="font-bold">{order.order_number}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Customer</span>
            <span className="font-medium">{order.customers?.full_name ?? "Walk-in"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Job</span>
            <span className="font-medium">
              {order.job_type} × {order.qty}
            </span>
          </div>
          {order.due_date && (
            <div className="flex justify-between">
              <span className="text-slate-500">Pickup</span>
              <span className="font-medium">{formatDate(order.due_date)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-slate-500">Date</span>
            <span className="font-medium">{formatDateTime(order.created_at)}</span>
          </div>
        </div>

        <div className="my-2 border-t border-dashed border-slate-400" />

        <div
          className="mx-auto h-40 w-40"
          dangerouslySetInnerHTML={{ __html: qr }}
        />
        <div className="mt-1 text-[12px] font-semibold">Scan to track your order</div>
        <div className="mt-0.5 break-all text-[9px] text-slate-400">{trackingUrl}</div>

        <div className="my-2 border-t border-dashed border-slate-400" />
        <div className="text-[10px] text-slate-500">
          Please present this stub when claiming your order.
        </div>
      </div>

      <PrintButton />

      <style>{`
        .stub { width: 58mm; }
        @media print {
          @page { size: 58mm auto; margin: 0; }
          html, body { background: #fff; }
          .no-print { display: none !important; }
          .stub { width: 58mm; box-shadow: none; }
        }
      `}</style>
    </div>
  );
}
