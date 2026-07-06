import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Xendit invoice webhook. Xendit POSTs here on payment events and includes
 * the configured verification token in the `x-callback-token` header. On a
 * PAID/SETTLED invoice we flip the org to lifetime access.
 *
 * Configure in Xendit dashboard → Settings → Webhooks (Invoices paid):
 *   https://<your-domain>/api/xendit/webhook
 * and set XENDIT_WEBHOOK_TOKEN + SUPABASE_SERVICE_ROLE_KEY in Vercel.
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("x-callback-token");

  // Verification token comes from the DB (super-admin editable), env fallback.
  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const { data: settings } = await admin
    .from("platform_settings")
    .select("xendit_webhook_token")
    .eq("id", 1)
    .maybeSingle();
  const expected = settings?.xendit_webhook_token || process.env.XENDIT_WEBHOOK_TOKEN;

  if (!expected || token !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: { external_id?: string; status?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const status = (body.status ?? "").toUpperCase();
  const externalId = body.external_id ?? "";

  if (status === "PAID" || status === "SETTLED") {
    // external_id format: lifetime_<orgId>_<timestamp>
    const orgId = externalId.split("_")[1];
    if (orgId) {
      await admin
        .from("organizations")
        .update({
          subscription_status: "lifetime",
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", orgId);
    }
  }

  // Always 200 so Xendit doesn't keep retrying for events we ignore.
  return NextResponse.json({ received: true });
}
