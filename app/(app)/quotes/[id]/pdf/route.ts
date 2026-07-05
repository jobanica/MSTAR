import { createClient } from "@/lib/supabase/server";
import { buildDocument } from "@/lib/pdf";
import { readQuoteItems } from "@/lib/quote";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: quote } = await supabase
    .from("quotes")
    .select("*, customers(full_name, phone, email)")
    .eq("id", id)
    .maybeSingle();
  if (!quote) return new Response("Not found", { status: 404 });

  const customer = quote.customers as unknown as {
    full_name: string;
    phone: string | null;
    email: string | null;
  } | null;

  const [{ data: org }, { data: brand }] = await Promise.all([
    supabase.from("organizations").select("name, contact_phone, contact_email").maybeSingle(),
    supabase.from("brand_settings").select("invoice_footer").maybeSingle(),
  ]);

  const items = readQuoteItems(quote.specs);
  const unit = quote.qty ? Math.round(quote.subtotal_centavos / quote.qty) : quote.subtotal_centavos;

  const lines =
    items.length > 0
      ? items.map((it) => ({
          description: it.name,
          qty: it.qty,
          unit_centavos: it.unit_price_centavos,
          total_centavos: it.qty * it.unit_price_centavos,
        }))
      : [
          {
            description: `${quote.job_type}${quote.rush ? " (RUSH)" : ""}`,
            qty: quote.qty,
            unit_centavos: unit,
            total_centavos: quote.subtotal_centavos,
          },
        ];

  const pdf = await buildDocument({
    docLabel: "QUOTATION",
    number: quote.quote_number,
    shopName: org?.name ?? "PrintOS",
    shopContact: [org?.contact_phone, org?.contact_email].filter(Boolean).join("  ·  ") || null,
    customerName: customer?.full_name ?? "Customer",
    customerContact: [customer?.phone, customer?.email].filter(Boolean).join("  ·  ") || null,
    date: new Date(quote.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" }),
    dueDate: quote.valid_until
      ? "Valid until " + new Date(quote.valid_until).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
      : null,
    lines,
    subtotal_centavos: quote.subtotal_centavos,
    discount_centavos: quote.discount_centavos,
    total_centavos: quote.total_centavos,
    footer: brand?.invoice_footer ?? null,
  });

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quote.quote_number}.pdf"`,
    },
  });
}
