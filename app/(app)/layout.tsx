import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "◫" },
  { href: "/kanban", label: "Production Board", icon: "▤" },
  { href: "/orders", label: "Orders", icon: "▣" },
  { href: "/quotes", label: "Quotes", icon: "◳" },
  { href: "/customers", label: "Customers", icon: "◉" },
  { href: "/settings", label: "Settings", icon: "⚙" },
];

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
    <div className="flex min-h-screen flex-1">
      <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <div className="text-lg font-bold text-indigo-600">PrintOS</div>
          <div className="mt-0.5 truncate text-xs text-slate-500">{orgName}</div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
            >
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-4">
          <div className="truncate text-sm font-medium">
            {profile.full_name ?? user.email}
          </div>
          <div className="text-xs capitalize text-slate-500">{profile.role}</div>
          <form action={signOut} className="mt-3">
            <button className="text-xs font-medium text-slate-500 hover:text-red-600">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="flex-1 overflow-x-auto p-8">{children}</main>
    </div>
  );
}
