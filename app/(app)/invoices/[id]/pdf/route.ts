import { createClient } from "@/lib/supabase/server";
import { buildDocument, type DocLine } from "@/lib/pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, orders(id, order_number, job_type, qty, customers(full_name, phone, email))")
    .eq("id", id)
    .maybeSingle();
  if (!invoice) return new Response("Not found", { status: 404 });

  const order = invoice.orders as unknown as {
    id: string;
    order_number: string;
    job_type: string;
    qty: number;
    customers?: { full_name: string; phone: string | null; email: string | null } | null;
  } | null;

  const [{ data: org }, { data: brand }, { data: items }] = await Promise.all([
    supabase.from("organizations").select("name, contact_phone, contact_email").maybeSingle(),
    supabase.from("brand_settings").select("invoice_footer").maybeSingle(),
    order
      ? supabase.from("order_items").select("description, qty, unit_price_centavos, total_centavos").eq("order_id", order.id)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const lines: DocLine[] =
    (items ?? []).length > 0
      ? (items as { description: string; qty: number; unit_price_centavos: number; total_centavos: number }[]).map((it) => ({
          description: it.description,
          qty: it.qty,
          unit_centavos: it.unit_price_centavos,
          total_centavos: it.total_centavos,
        }))
      : [
          {
            description: order ? `${order.job_type}` : "Order",
            qty: order?.qty ?? 1,
            unit_centavos: order?.qty ? Math.round(invoice.subtotal_centavos / order.qty) : invoice.subtotal_centavos,
            total_centavos: invoice.subtotal_centavos,
          },
        ];

  const pdf = await buildDocument({
    docLabel: "INVOICE",
    number: invoice.invoice_number,
    shopName: org?.name ?? "PrintOS",
    shopContact: [org?.contact_phone, org?.contact_email].filter(Boolean).join("  ·  ") || null,
    customerName: order?.customers?.full_name ?? "Customer",
    customerContact: [order?.customers?.phone, order?.customers?.email].filter(Boolean).join("  ·  ") || null,
    date: new Date(invoice.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }),
    dueDate: invoice.due_date
      ? new Date(invoice.due_date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
      : null,
    lines,
    subtotal_centavos: invoice.subtotal_centavos,
    deliveryFee_centavos: invoice.delivery_fee_centavos,
    discount_centavos: invoice.discount_centavos,
    total_centavos: invoice.total_centavos,
    amountPaid_centavos: invoice.amount_paid_centavos,
    footer: brand?.invoice_footer ?? null,
  });

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoice_number}.pdf"`,
    },
  });
}
