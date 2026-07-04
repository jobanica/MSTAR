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

// ---------------------------------------------------------------
// Branches (multi-location)
// ---------------------------------------------------------------
export async function createBranch(formData: FormData) {
  const { supabase, profile } = await getContext();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(`/branches?error=${encodeURIComponent("Branch name is required")}`);

  const { error } = await supabase.from("branches").insert({
    organization_id: profile.organization_id,
    name,
    code: String(formData.get("code") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
  });

  if (error) redirect(`/branches?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/branches");
  redirect("/branches");
}

export async function deleteBranch(formData: FormData) {
  const { supabase, profile } = await getContext();
  const id = String(formData.get("id"));

  // Never delete the main branch — it anchors the org.
  const { data: branch } = await supabase
    .from("branches")
    .select("is_main")
    .eq("id", id)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();
  if (branch?.is_main) {
    redirect(`/branches?error=${encodeURIComponent("The main branch cannot be deleted.")}`);
  }

  await supabase
    .from("branches")
    .delete()
    .eq("id", id)
    .eq("organization_id", profile.organization_id);

  revalidatePath("/branches");
  redirect("/branches");
}

// ---------------------------------------------------------------
// Employees (HR records)
// ---------------------------------------------------------------
export async function createEmployee(formData: FormData) {
  const { supabase, profile } = await getContext();
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) redirect(`/employees/new?error=${encodeURIComponent("Full name is required")}`);

  const { error } = await supabase.from("employees").insert({
    organization_id: profile.organization_id,
    full_name: fullName,
    employee_code: String(formData.get("employee_code") ?? "").trim() || null,
    position: String(formData.get("position") ?? "").trim() || null,
    branch_id: String(formData.get("branch_id") ?? "") || null,
    department_id: String(formData.get("department_id") ?? "") || null,
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    employment_type: String(formData.get("employment_type") ?? "full_time"),
    status: String(formData.get("status") ?? "active"),
    hire_date: String(formData.get("hire_date") ?? "") || null,
    salary_centavos: formData.get("salary")
      ? parsePesosToCentavos(formData.get("salary"))
      : null,
    emergency_contact_name:
      String(formData.get("emergency_contact_name") ?? "").trim() || null,
    emergency_contact_phone:
      String(formData.get("emergency_contact_phone") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  });

  if (error) redirect(`/employees/new?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/employees");
  redirect("/employees");
}

export async function deleteEmployee(formData: FormData) {
  const { supabase, profile } = await getContext();

  await supabase
    .from("employees")
    .delete()
    .eq("id", String(formData.get("id")))
    .eq("organization_id", profile.organization_id);

  revalidatePath("/employees");
  redirect("/employees");
}

// ---------------------------------------------------------------
// Invoicing & Payments
// ---------------------------------------------------------------
export async function generateInvoice(formData: FormData) {
  const { supabase, profile } = await getContext();
  const orderId = String(formData.get("order_id"));
  if (!orderId) redirect(`/invoices?error=${encodeURIComponent("Pick an order")}`);

  // One invoice per order (DB enforces unique(order_id)).
  const { data: existing } = await supabase
    .from("invoices")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existing) redirect(`/invoices/${existing.id}`);

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("organization_id", profile.organization_id)
    .single();
  if (!order) redirect(`/invoices?error=${encodeURIComponent("Order not found")}`);

  const invoiceNumber = await nextNumber(supabase, "invoices", "INV", profile.organization_id);

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      organization_id: profile.organization_id,
      order_id: order.id,
      invoice_number: invoiceNumber,
      subtotal_centavos: order.subtotal_centavos,
      delivery_fee_centavos: order.delivery_fee_centavos,
      discount_centavos: order.discount_centavos,
      total_centavos: order.total_centavos,
      payment_status: order.payment_status,
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error || !invoice) {
    redirect(`/invoices?error=${encodeURIComponent(error?.message ?? "generate failed")}`);
  }
  revalidatePath("/invoices");
  redirect(`/invoices/${invoice.id}`);
}

export async function recordPayment(formData: FormData) {
  const { supabase, profile } = await getContext();
  const invoiceId = String(formData.get("invoice_id"));

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, order_id, total_centavos, orders(customer_id)")
    .eq("id", invoiceId)
    .eq("organization_id", profile.organization_id)
    .single();
  if (!invoice) redirect("/invoices");

  const customerId = (invoice.orders as unknown as { customer_id: string } | null)?.customer_id;
  const amount = parsePesosToCentavos(formData.get("amount"));
  if (amount <= 0) redirect(`/invoices/${invoiceId}?error=${encodeURIComponent("Enter an amount")}`);

  const { error } = await supabase.from("payments").insert({
    organization_id: profile.organization_id,
    invoice_id: invoiceId,
    customer_id: customerId,
    amount_centavos: amount,
    method: String(formData.get("method") ?? "cash"),
    reference_number: String(formData.get("reference_number") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    recorded_by: profile.id,
  });
  if (error) redirect(`/invoices/${invoiceId}?error=${encodeURIComponent(error.message)}`);

  // Recompute paid total + status from all payments on this invoice.
  const { data: paid } = await supabase
    .from("payments")
    .select("amount_centavos")
    .eq("invoice_id", invoiceId);
  const totalPaid = (paid ?? []).reduce((s, p) => s + (p.amount_centavos ?? 0), 0);
  const status =
    totalPaid >= invoice.total_centavos ? "paid" : totalPaid > 0 ? "partial" : "unpaid";

  await supabase
    .from("invoices")
    .update({ amount_paid_centavos: totalPaid, payment_status: status })
    .eq("id", invoiceId);
  await supabase
    .from("orders")
    .update({ payment_status: status })
    .eq("id", invoice.order_id);

  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
  redirect(`/invoices/${invoiceId}`);
}

// ---------------------------------------------------------------
// Inventory
// ---------------------------------------------------------------
export async function createMaterial(formData: FormData) {
  const { supabase, profile } = await getContext();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(`/inventory?error=${encodeURIComponent("Material name is required")}`);

  const initial = parseFloat(String(formData.get("current_stock") ?? "0")) || 0;

  const { data: material, error } = await supabase
    .from("materials")
    .insert({
      organization_id: profile.organization_id,
      name,
      unit: String(formData.get("unit") ?? "").trim() || "pcs",
      current_stock: 0,
      reorder_threshold: parseFloat(String(formData.get("reorder_threshold") ?? "0")) || 0,
      cost_per_unit_centavos: formData.get("cost")
        ? parsePesosToCentavos(formData.get("cost"))
        : 0,
      department_id: String(formData.get("department_id") ?? "") || null,
    })
    .select("id")
    .single();
  if (error || !material) {
    redirect(`/inventory?error=${encodeURIComponent(error?.message ?? "create failed")}`);
  }

  // Seed opening stock via a transaction so the ledger stays the source
  // of truth (the DB trigger applies it to current_stock).
  if (initial > 0) {
    await supabase.from("inventory_transactions").insert({
      organization_id: profile.organization_id,
      material_id: material.id,
      transaction_type: "initial",
      quantity: initial,
      notes: "Opening stock",
      performed_by: profile.id,
    });
  }

  revalidatePath("/inventory");
  redirect("/inventory");
}

export async function adjustStock(formData: FormData) {
  const { supabase, profile } = await getContext();
  const materialId = String(formData.get("material_id"));
  const type = String(formData.get("transaction_type") ?? "restock");
  const magnitude = Math.abs(parseFloat(String(formData.get("quantity") ?? "0")) || 0);
  if (magnitude === 0) redirect(`/inventory?error=${encodeURIComponent("Enter a quantity")}`);

  // deduct reduces stock; restock/adjustment/initial add. "adjustment"
  // honours the sign the user picked via the direction field.
  const sign =
    type === "deduct" ? -1 : formData.get("direction") === "down" ? -1 : 1;

  await supabase.from("inventory_transactions").insert({
    organization_id: profile.organization_id,
    material_id: materialId,
    transaction_type: type,
    quantity: sign * magnitude,
    notes: String(formData.get("notes") ?? "").trim() || null,
    performed_by: profile.id,
  });

  revalidatePath("/inventory");
  redirect("/inventory");
}

// ---------------------------------------------------------------
// Users / team management
// ---------------------------------------------------------------
export async function updateUserRole(formData: FormData) {
  const { supabase, profile } = await getContext();
  if (!["admin", "super_admin"].includes(profile.role)) return;

  await supabase
    .from("profiles")
    .update({ role: String(formData.get("role")) })
    .eq("id", String(formData.get("id")))
    .eq("organization_id", profile.organization_id);

  revalidatePath("/users");
  redirect("/users");
}

export async function toggleUserActive(formData: FormData) {
  const { supabase, profile } = await getContext();
  if (!["admin", "super_admin"].includes(profile.role)) return;

  await supabase
    .from("profiles")
    .update({ is_active: formData.get("is_active") === "true" })
    .eq("id", String(formData.get("id")))
    .eq("organization_id", profile.organization_id);

  revalidatePath("/users");
  redirect("/users");
}

// ---------------------------------------------------------------
// Deliveries
// ---------------------------------------------------------------
export async function upsertDelivery(formData: FormData) {
  const { supabase, profile } = await getContext();
  const orderId = String(formData.get("order_id"));
  const status = String(formData.get("status") ?? "pending");

  const payload = {
    organization_id: profile.organization_id,
    order_id: orderId,
    delivery_address: String(formData.get("delivery_address") ?? "").trim() || null,
    city: String(formData.get("city") ?? "").trim() || null,
    rider_name: String(formData.get("rider_name") ?? "").trim() || null,
    tracking_number: String(formData.get("tracking_number") ?? "").trim() || null,
    fee_centavos: formData.get("fee") ? parsePesosToCentavos(formData.get("fee")) : 0,
    status,
    dispatched_at: status === "out_for_delivery" ? new Date().toISOString() : null,
    delivered_at: status === "delivered" ? new Date().toISOString() : null,
  };

  const { data: existing } = await supabase
    .from("deliveries")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();

  if (existing) {
    await supabase.from("deliveries").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("deliveries").insert(payload);
  }

  revalidatePath("/deliveries");
  redirect("/deliveries");
}

// ---------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------
export async function reviewFeedback(formData: FormData) {
  const { supabase, profile } = await getContext();

  await supabase
    .from("feedback")
    .update({
      flagged_for_review: false,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", String(formData.get("id")))
    .eq("organization_id", profile.organization_id);

  revalidatePath("/feedback");
  redirect("/feedback");
}

// ---------------------------------------------------------------
// Loyalty
// ---------------------------------------------------------------
export async function updateLoyaltySettings(formData: FormData) {
  const { supabase, profile } = await getContext();

  await supabase
    .from("loyalty_settings")
    .update({
      points_per_peso: parseFloat(String(formData.get("points_per_peso") ?? "1")) || 1,
      redeem_rate: parseFloat(String(formData.get("redeem_rate") ?? "1")) || 1,
      milestone_orders: parseInt(String(formData.get("milestone_orders") ?? "10"), 10) || 10,
      milestone_reward_description:
        String(formData.get("milestone_reward_description") ?? "").trim() || null,
    })
    .eq("organization_id", profile.organization_id);

  revalidatePath("/loyalty");
  redirect("/loyalty");
}

export async function adjustLoyaltyPoints(formData: FormData) {
  const { supabase, profile } = await getContext();
  const customerId = String(formData.get("customer_id"));
  const type = String(formData.get("transaction_type") ?? "earned");
  const magnitude = Math.abs(parseInt(String(formData.get("points") ?? "0"), 10) || 0);
  if (magnitude === 0) redirect(`/loyalty?error=${encodeURIComponent("Enter points")}`);

  const { data: customer } = await supabase
    .from("customers")
    .select("loyalty_points")
    .eq("id", customerId)
    .eq("organization_id", profile.organization_id)
    .single();
  if (!customer) redirect("/loyalty");

  const signed = type === "redeemed" || type === "expired" ? -magnitude : magnitude;
  const balanceAfter = Math.max((customer.loyalty_points ?? 0) + signed, 0);

  await supabase.from("loyalty_transactions").insert({
    organization_id: profile.organization_id,
    customer_id: customerId,
    transaction_type: type,
    points: signed,
    balance_after: balanceAfter,
    notes: String(formData.get("notes") ?? "").trim() || null,
    performed_by: profile.id,
  });
  await supabase
    .from("customers")
    .update({ loyalty_points: balanceAfter })
    .eq("id", customerId);

  revalidatePath("/loyalty");
  redirect("/loyalty");
}

// ---------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------
export async function toggleIntegration(formData: FormData) {
  const { supabase, profile } = await getContext();

  await supabase
    .from("integration_settings")
    .update({ is_enabled: formData.get("is_enabled") === "true" })
    .eq("id", String(formData.get("id")))
    .eq("organization_id", profile.organization_id);

  revalidatePath("/integrations");
  redirect("/integrations");
}

// ---------------------------------------------------------------
// QR job tracking
// ---------------------------------------------------------------
export async function generateQr(formData: FormData) {
  const { supabase, profile } = await getContext();
  const orderId = String(formData.get("order_id"));

  const { data: existing } = await supabase
    .from("qr_codes")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();
  if (existing) {
    revalidatePath("/qr");
    redirect("/qr");
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const trackingUrl = `${base}/track/${orderId}`;

  await supabase.from("qr_codes").insert({
    organization_id: profile.organization_id,
    order_id: orderId,
    qr_data: trackingUrl,
    public_url: trackingUrl,
  });

  revalidatePath("/qr");
  redirect("/qr");
}
