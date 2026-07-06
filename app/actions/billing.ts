"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const secret = process.env.XENDIT_SECRET_KEY;
  if (!secret) {
    redirect(
      `/upgrade?error=${encodeURIComponent(
        "Payments are not configured yet. Please contact support.",
      )}`,
    );
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mstar-orpin.vercel.app";
  const amount = Number(process.env.XENDIT_PRICE_AMOUNT ?? 5);
  const currency = process.env.XENDIT_CURRENCY ?? "USD";

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
