import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/AppShell";

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

  // Signed up with email confirmation on — org wasn't provisioned yet.
  if (!profile && user.user_metadata?.org_name) {
    await supabase.rpc("register_organization", {
      org_name: user.user_metadata.org_name,
      owner_full_name: user.user_metadata.full_name ?? null,
    });
    ({ data: profile } = await supabase
      .from("profiles")
      .select("id, full_name, role, organization_id, organizations(name)")
      .eq("user_id", user.id)
      .maybeSingle());
  }

  if (!profile) redirect("/login?error=No%20profile%20found%20for%20this%20account");

  const orgName =
    (profile.organizations as unknown as { name: string } | null)?.name ??
    "PrintOS";

  return (
    <AppShell
      orgName={orgName}
      displayName={profile.full_name ?? user.email ?? "User"}
      role={profile.role}
    >
      {children}
    </AppShell>
  );
}
