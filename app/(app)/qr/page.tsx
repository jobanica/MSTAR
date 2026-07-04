import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/server";
import { generateQr } from "@/app/actions/data";
import { PageHeader } from "@/components/PageHeader";
import { inputClass } from "@/components/FormField";
import { SubmitButton } from "@/components/SubmitButton";
import type { QrCode } from "@/lib/types";

async function qrSvg(data: string) {
  return QRCode.toString(data, { type: "svg", margin: 1, width: 160 });
}

export default async function QrPage() {
  const supabase = await createClient();

  const [{ data: qrData }, { data: orderData }] = await Promise.all([
    supabase
      .from("qr_codes")
      .select("*, orders(id, order_number, job_type)")
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("orders")
      .select("id, order_number, customers(full_name)")
      .not("status", "in", "(completed,cancelled)")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const codes = (qrData ?? []) as unknown as (QrCode & {
    orders?: { order_number: string; job_type: string } | null;
  })[];
  const coded = new Set(codes.map((c) => c.order_id));
  const uncoded = (orderData ?? []).filter((o) => !coded.has(o.id)) as unknown as {
    id: string;
    order_number: string;
    customers?: { full_name: string } | null;
  }[];

  const svgs = await Promise.all(codes.map((c) => qrSvg(c.qr_data)));

  return (
    <>
      <PageHeader title="QR Tracking" breadcrumb={["QR Tracking"]} />

      <div className="space-y-6">
        {uncoded.length > 0 && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-base font-bold text-slate-900">Generate tracking QR</h2>
            <form action={generateQr} className="flex flex-wrap items-end gap-3">
              <label className="block flex-1 text-sm">
                <span className="mb-1 block font-medium text-slate-700">Order</span>
                <select name="order_id" required className={inputClass}>
                  {uncoded.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.order_number} — {o.customers?.full_name ?? "Walk-in"}
                    </option>
                  ))}
                </select>
              </label>
              <SubmitButton
                unstyled
                pendingLabel="Generating…"
                className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-600"
              >
                Generate QR
              </SubmitButton>
            </form>
            <p className="mt-2 text-xs text-slate-400">
              Each QR links to a public status page customers can scan — no login
              needed.
            </p>
          </section>
        )}

        {codes.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white px-6 py-8 text-sm text-slate-400 shadow-sm">
            No QR codes yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {codes.map((c, i) => (
              <div
                key={c.id}
                className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-5 text-center shadow-sm"
              >
                <div
                  className="h-36 w-36"
                  // qrcode returns a self-contained SVG string
                  dangerouslySetInnerHTML={{ __html: svgs[i] }}
                />
                <div className="mt-3 text-sm font-semibold text-slate-800">
                  {c.orders?.order_number ?? "Order"}
                </div>
                <div className="text-xs text-slate-400">{c.orders?.job_type ?? ""}</div>
                <a
                  href={c.public_url ?? c.qr_data}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 text-xs font-medium text-teal-700 hover:text-teal-600"
                >
                  Open tracking page →
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
