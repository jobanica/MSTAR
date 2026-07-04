import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { NavLink } from "@/components/NavLink";

const MAIN_NAV = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/kanban", label: "Production Board", icon: "board" },
  { href: "/customers", label: "Customers", icon: "users" },
];

const MANAGE_NAV = [
  { href: "/orders", label: "Orders", icon: "box" },
  { href: "/quotes", label: "Quotes", icon: "doc" },
  { href: "/employees", label: "Employees", icon: "badge" },
  { href: "/branches", label: "Branches", icon: "branch" },
  { href: "/settings", label: "Settings", icon: "gear" },
];

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
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
  const displayName = profile.full_name ?? user.email ?? "User";

  return (
    <div className="flex min-h-screen flex-1 bg-slate-50">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-[#0f3b38] text-teal-50">
        <div className="flex items-center gap-2.5 px-6 py-6">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-teal-400/20 text-lg font-bold text-teal-200">
            ◔
          </span>
          <span className="text-xl font-bold tracking-tight">PrintOS</span>
        </div>

        <nav className="flex-1 overflow-y-auto px-4">
          <p className="px-3 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-teal-300/60">
            Main Menu
          </p>
          <div className="space-y-1">
            {MAIN_NAV.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>

          <p className="px-3 pb-2 pt-6 text-[11px] font-semibold uppercase tracking-wider text-teal-300/60">
            Management
          </p>
          <div className="space-y-1">
            {MANAGE_NAV.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>

          <div className="mt-6 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="text-xs text-teal-200/70">Current shop</p>
            <p className="mt-0.5 truncate text-sm font-semibold text-white">
              {orgName}
            </p>
            <Link
              href="/settings"
              className="mt-3 block rounded-lg bg-teal-400/15 py-2 text-center text-xs font-semibold text-teal-100 transition-colors hover:bg-teal-400/25"
            >
              Manage settings
            </Link>
          </div>
        </nav>

        <div className="mt-2 flex items-center gap-3 border-t border-white/10 px-5 py-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-400/25 text-sm font-semibold text-teal-100">
            {initials(displayName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{displayName}</p>
            <p className="truncate text-xs capitalize text-teal-200/70">
              {profile.role}
            </p>
          </div>
          <form action={signOut}>
            <button
              title="Sign out"
              className="rounded-lg p-1.5 text-teal-200/70 transition-colors hover:bg-white/10 hover:text-white"
            >
              ⏻
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-auto p-8">{children}</main>
    </div>
  );
}
