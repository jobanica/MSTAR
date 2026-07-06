import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";
import { hasAccess } from "@/lib/subscription";

// White-label the browser tab title with the signed-in shop's name.
export async function generateMetadata(): Promise<Metadata> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data: profile } = await supabase
    .from("profiles")
    .select("organizations(name)")
    .eq("user_id", user.id)
    .maybeSingle();

  const orgName =
    (profile?.organizations as unknown as { name: string } | null)?.name ?? null;
  if (!orgName) return {};

  return { title: { default: orgName, template: `%s · ${orgName}` } };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, organization_id, organizations(name)")
    .eq("user_id", user.id)
    .maybeSingle();

  // Signed up with email confirmation on — profile wasn't provisioned
  // yet. Provision now from the metadata captured at signup (either
  // creating a new shop, or joining one via an invite token).
  if (!profile && (user.user_metadata?.org_name || user.user_metadata?.invite_token)) {
    if (user.user_metadata?.invite_token) {
      await supabase.rpc("accept_invitation", {
        p_token: user.user_metadata.invite_token,
        p_full_name: user.user_metadata.full_name ?? null,
      });
    } else {
      await supabase.rpc("register_organization", {
        org_name: user.user_metadata.org_name,
        owner_full_name: user.user_metadata.full_name ?? null,
      });
    }
    ({ data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role, organization_id, organizations(name)")
      .eq("user_id", user.id)
      .maybeSingle());
  }

  if (!profile) redirect("/login?error=No%20profile%20found%20for%20this%20account");

  // Paywall: once the 7-day trial ends and the shop hasn't paid for lifetime
  // access, send them to the upgrade page. Super admins are never gated.
  if (profile.role !== "super_admin") {
    const { data: org } = await supabase
      .from("organizations")
      .select("subscription_status, trial_ends_at")
      .eq("id", profile.organization_id)
      .maybeSingle();
    if (!hasAccess(org)) redirect("/upgrade");
  }

  const orgName =
    (profile.organizations as unknown as { name: string } | null)?.name ??
    "PrintOS";

  const { data: brand } = await supabase
    .from("brand_settings")
    .select("logo_url")
    .eq("organization_id", profile.organization_id)
    .maybeSingle();

  return (
    <AppShell
      orgName={orgName}
      logoUrl={brand?.logo_url ?? null}
      displayName={profile.full_name ?? user.email ?? "User"}
      role={profile.role}
    >
      {children}
    </AppShell>
  );
}
