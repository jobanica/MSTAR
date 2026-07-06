"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/** Payment config comes from the DB (super-admin editable), with env fallback. */
async function getPaymentConfig() {
  let secret = process.env.XENDIT_SECRET_KEY ?? null;
  let amount = Number(process.env.XENDIT_PRICE_AMOUNT ?? 5);
  let currency = process.env.XENDIT_CURRENCY ?? "USD";
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("platform_settings")
      .select("xendit_secret_key, price_amount, currency")
      .eq("id", 1)
      .maybeSingle();
    if (data?.xendit_secret_key) secret = data.xendit_secret_key;
    if (data?.price_amount) amount = data.price_amount;
    if (data?.currency) currency = data.currency;
  } catch {
    /* service role not configured — fall back to env */
  }
  return { secret, amount, currency };
}

/**
 * Create a Xendit invoice for the $5 lifetime plan and send the user to
 * Xendit's hosted checkout. The org is only unlocked when Xendit calls our
 * webhook (see app/api/xendit/webhook), so this just starts the payment.
 */
export async function startLifetimeCheckout() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id, organizations(name, subscription_status)")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!profile) redirect("/login");

  const org = profile.organizations as unknown as {
    name: string;
    subscription_status: string | null;
  } | null;
  if (org?.subscription_status === "lifetime") redirect("/dashboard");

  const { secret, amount, currency } = await getPaymentConfig();
  if (!secret) {
    redirect(
      `/upgrade?error=${encodeURIComponent(
        "Payments are not configured yet. Please contact support.",
      )}`,
    );
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mstar-orpin.vercel.app";

  const res = await fetch("https://api.xendit.co/v2/invoices", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Basic " + Buffer.from(`${secret}:`).toString("base64"),
    },
    body: JSON.stringify({
      external_id: `lifetime_${profile.organization_id}_${Date.now()}`,
      amount,
      currency,
      description: "PrintOS — Lifetime access",
      payer_email: user.email,
      success_redirect_url: `${base}/upgrade?paid=1`,
      failure_redirect_url: `${base}/upgrade?failed=1`,
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    redirect(
      `/upgrade?error=${encodeURIComponent(
        "Could not start checkout: " + detail.slice(0, 140),
      )}`,
    );
  }

  const invoice = (await res.json()) as { invoice_url?: string };
  if (!invoice.invoice_url) {
    redirect(`/upgrade?error=${encodeURIComponent("Checkout URL missing from Xendit.")}`);
  }
  redirect(invoice.invoice_url);
}
