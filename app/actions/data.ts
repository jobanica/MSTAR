"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parsePesosToCentavos, ORDER_STATUSES } from "@/lib/format";

async function getContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, organization_id, role, full_name")
    .eq("user_id", user.id)
    .single();
  if (!profile) redirect("/login");

  return { supabase, user, profile };
}

/** Next sequential document number for this org and year, e.g. Q-2026-0007. */
async function nextNumber(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "quotes" | "orders" | "invoices",
  prefix: string,
  organizationId: string,
) {
  const year = new Date().getFullYear();
  const { count } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId)
    .gte("created_at", `${year}-01-01`);
  return `${prefix}-${year}-${String((count ?? 0) + 1).padStart(4, "0")}`;
}

// ---------------------------------------------------------------
// Customers
// ---------------------------------------------------------------
export async function createCustomer(formData: FormData) {
  const { supabase, profile } = await getContext();

  const { error } = await supabase.from("customers").insert({
    organization_id: profile.organization_id,
    full_name: String(formData.get("full_name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });

  if (error) redirect(`/customers/new?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/customers");
  redirect("/customers");
}

// ---------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------
export async function createQuote(formData: FormData) {
  const { supabase, profile } = await getContext();

  const subtotal = parsePesosToCentavos(formData.get("subtotal"));
  const discount = parsePesosToCentavos(formData.get("discount"));
  const quoteNumber = await nextNumber(supabase, "quotes", "Q", profile.organization_id);

  const { data, error } = await supabase
    .from("quotes")
    .insert({
      organization_id: profile.organization_id,
      quote_number: quoteNumber,
      customer_id: String(formData.get("customer_id")),
      job_type: String(formData.get("job_type") ?? "").trim(),
      department_id: String(formData.get("department_id") ?? "") || null,
      qty: parseInt(String(formData.get("qty") ?? "1"), 10) || 1,
      rush: formData.get("rush") === "on",
      due_date: String(formData.get("due_date") ?? "") || null,
      valid_until: String(formData.get("valid_until") ?? "") || null,
      notes: String(formData.get("notes") ?? "").trim() || null,
      subtotal_centavos: subtotal,
      discount_centavos: discount,
      total_centavos: Math.max(subtotal - discount, 0),
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/quotes/new?error=${encodeURIComponent(error?.message ?? "insert failed")}`);
  }
  revalidatePath("/quotes");
  redirect(`/quotes/${data.id}`);
}

export async function updateQuoteStatus(formData: FormData) {
  const { supabase, profile } = await getContext();
  const id = String(formData.get("id"));

  await supabase
    .from("quotes")
    .update({ status: String(formData.get("status")) })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  revalidatePath(`/quotes/${id}`);
  revalidatePath("/quotes");
}

export async function convertQuoteToOrder(formData: FormData) {
  const { supabase, profile } = await getContext();
  const quoteId = String(formData.get("id"));

  const { data: quote } = await supabase
    .from("quotes")
    .select("*")
    .eq("id", quoteId)
    .eq("organization_id", profile.organization_id)
    .single();
  if (!quote) redirect("/quotes");
  if (quote.converted_to_order_id) redirect(`/orders/${quote.converted_to_order_id}`);

  const { data: stage } = await supabase
    .from("kanban_stages")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("slug", "new")
    .maybeSingle();

  const orderNumber = await nextNumber(supabase, "orders", "ORD", profile.organization_id);

  const { data: order, error } = await supabase
    .from("orders")
    .insert({
      organization_id: profile.organization_id,
      order_number: orderNumber,
      customer_id: quote.customer_id,
      quote_id: quote.id,
      template_id: quote.template_id,
      job_type: quote.job_type,
      department_id: quote.department_id,
      specs: quote.specs,
      qty: quote.qty,
      rush: quote.rush,
      due_date: quote.due_date,
      notes: quote.notes,
      kanban_stage_id: stage?.id ?? null,
      subtotal_centavos: quote.subtotal_centavos,
      discount_centavos: quote.discount_centavos,
      total_centavos: quote.total_centavos,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !order) {
    redirect(`/quotes/${quoteId}?error=${encodeURIComponent(error?.message ?? "convert failed")}`);
  }

  await supabase
    .from("quotes")
    .update({ status: "converted", converted_to_order_id: order.id })
    .eq("id", quoteId);

  revalidatePath("/quotes");
  revalidatePath("/orders");
  redirect(`/orders/${order.id}`);
}

// ---------------------------------------------------------------
// Orders
// ---------------------------------------------------------------
export async function createOrder(formData: FormData) {
  const { supabase, profile } = await getContext();

  const subtotal = parsePesosToCentavos(formData.get("subtotal"));
  const deliveryFee = parsePesosToCentavos(formData.get("delivery_fee"));
  const discount = parsePesosToCentavos(formData.get("discount"));

  const { data: stage } = await supabase
    .from("kanban_stages")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("slug", "new")
    .maybeSingle();

  const orderNumber = await nextNumber(supabase, "orders", "ORD", profile.organization_id);

  const { data, error } = await supabase
    .from("orders")
    .insert({
      organization_id: profile.organization_id,
      order_number: orderNumber,
      customer_id: String(formData.get("customer_id")),
      job_type: String(formData.get("job_type") ?? "").trim(),
      department_id: String(formData.get("department_id") ?? "") || null,
      qty: parseInt(String(formData.get("qty") ?? "1"), 10) || 1,
      rush: formData.get("rush") === "on",
      due_date: String(formData.get("due_date") ?? "") || null,
      delivery_type: formData.get("delivery_type") === "delivery" ? "delivery" : "pickup",
      notes: String(formData.get("notes") ?? "").trim() || null,
      kanban_stage_id: stage?.id ?? null,
      subtotal_centavos: subtotal,
      delivery_fee_centavos: deliveryFee,
      discount_centavos: discount,
      total_centavos: Math.max(subtotal + deliveryFee - discount, 0),
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    redirect(`/orders/new?error=${encodeURIComponent(error?.message ?? "insert failed")}`);
  }
  revalidatePath("/orders");
  revalidatePath("/kanban");
  redirect(`/orders/${data.id}`);
}

/** Update order status and keep the kanban stage in sync (slugs match statuses). */
export async function updateOrderStatus(formData: FormData) {
  const { supabase, profile } = await getContext();
  const id = String(formData.get("id"));
  const status = String(formData.get("status"));
  if (!(ORDER_STATUSES as readonly string[]).includes(status)) return;

  const { data: stage } = await supabase
    .from("kanban_stages")
    .select("id")
    .eq("organization_id", profile.organization_id)
    .eq("slug", status)
    .maybeSingle();

  await supabase
    .from("orders")
    .update({
      status,
      ...(stage ? { kanban_stage_id: stage.id } : {}),
      ...(status === "completed" ? { completed_at: new Date().toISOString() } : {}),
      ...(status === "cancelled" ? { cancelled_at: new Date().toISOString() } : {}),
    })
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  revalidatePath(`/orders/${id}`);
  revalidatePath("/orders");
  revalidatePath("/kanban");
}

/** Move an order to a kanban stage (drag & drop). Syncs status when the slug matches one. */
export async function moveOrderToStage(orderId: string, stageId: string) {
  const { supabase, profile } = await getContext();

  const { data: stage } = await supabase
    .from("kanban_stages")
    .select("id, slug")
    .eq("id", stageId)
    .eq("organization_id", profile.organization_id)
    .single();
  if (!stage) return;

  const statusUpdate = (ORDER_STATUSES as readonly string[]).includes(stage.slug)
    ? {
        status: stage.slug,
        ...(stage.slug === "completed" ? { completed_at: new Date().toISOString() } : {}),
      }
    : {};

  await supabase
    .from("orders")
    .update({ kanban_stage_id: stage.id, ...statusUpdate })
    .eq("id", orderId)
    .eq("organization_id", profile.organization_id);

  revalidatePath("/kanban");
  revalidatePath("/orders");
}

// ---------------------------------------------------------------
// Order chat & files
// ---------------------------------------------------------------
export async function postMessage(formData: FormData) {
  const { supabase, profile } = await getContext();
  const orderId = String(formData.get("order_id"));
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;

  await supabase.from("messages").insert({
    organization_id: profile.organization_id,
    order_id: orderId,
    sent_by: profile.id,
    content,
    is_internal: formData.get("is_internal") === "on",
  });

  revalidatePath(`/orders/${orderId}`);
}

export async function uploadOrderFile(formData: FormData) {
  const { supabase, profile } = await getContext();
  const orderId = String(formData.get("order_id"));
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return;

  const { data: latest } = await supabase
    .from("files")
    .select("version_number")
    .eq("order_id", orderId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = (latest?.version_number ?? 0) + 1;

  // Storage convention: first folder segment is the organization id
  // (enforced by the storage RLS policy).
  const path = `${profile.organization_id}/${orderId}/v${version}-${file.name}`;
  const { error: uploadError } = await supabase.storage
    .from("order-files")
    .upload(path, file);
  if (uploadError) {
    redirect(`/orders/${orderId}?error=${encodeURIComponent(uploadError.message)}`);
  }

  await supabase.from("files").insert({
    organization_id: profile.organization_id,
    order_id: orderId,
    version_number: version,
    file_name: file.name,
    file_type: file.type || null,
    file_size_bytes: file.size,
    storage_path: path,
    status: "for_review",
    uploaded_by: profile.id,
  });

  revalidatePath(`/orders/${orderId}`);
}

// ---------------------------------------------------------------
// Settings
// ---------------------------------------------------------------
export async function updateOrganization(formData: FormData) {
  const { supabase, profile } = await getContext();

  await supabase
    .from("organizations")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      address: String(formData.get("address") ?? "").trim() || null,
      city: String(formData.get("city") ?? "").trim() || null,
      contact_email: String(formData.get("contact_email") ?? "").trim() || null,
      contact_phone: String(formData.get("contact_phone") ?? "").trim() || null,
    })
    .eq("id", profile.organization_id);

  revalidatePath("/settings");
}

export async function createDepartment(formData: FormData) {
  const { supabase, profile } = await getContext();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;

  await supabase.from("departments").insert({
    organization_id: profile.organization_id,
    name,
    color_hex: String(formData.get("color_hex") ?? "#6366f1"),
  });

  revalidatePath("/settings");
}

export async function toggleDepartment(formData: FormData) {
  const { supabase, profile } = await getContext();

  await supabase
    .from("departments")
    .update({ is_active: formData.get("is_active") === "true" })
    .eq("id", String(formData.get("id")))
    .eq("organization_id", profile.organization_id);

  revalidatePath("/settings");
}

export async function updateBrandSettings(formData: FormData) {
  const { supabase, profile } = await getContext();

  await supabase
    .from("brand_settings")
    .update({
      primary_color: String(formData.get("primary_color") ?? "#6366f1"),
      secondary_color: String(formData.get("secondary_color") ?? "#f1f5f9"),
      sms_sender_name:
        String(formData.get("sms_sender_name") ?? "").trim().slice(0, 11) || null,
      portal_tagline: String(formData.get("portal_tagline") ?? "").trim() || null,
      invoice_footer: String(formData.get("invoice_footer") ?? "").trim() || null,
    })
    .eq("organization_id", profile.organization_id);

  revalidatePath("/settings");
}

export async function toggleSmsSetting(formData: FormData) {
  const { supabase, profile } = await getContext();

  await supabase
    .from("sms_settings")
    .update({ is_active: formData.get("is_active") === "true" })
    .eq("id", String(formData.get("id")))
    .eq("organization_id", profile.organization_id);

  revalidatePath("/settings");
}
