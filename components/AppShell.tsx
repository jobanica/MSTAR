"use client";

import { useState } from "react";
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
  { href: "/services", label: "Services", icon: "tag" },
  { href: "/discounts", label: "Discount Requests", icon: "percent" },
  { href: "/invoices", label: "Invoices", icon: "receipt" },
  { href: "/balances", label: "Balances & Collectibles", icon: "wallet" },
  { href: "/deliveries", label: "Deliveries", icon: "truck" },
  { href: "/inventory", label: "Inventory", icon: "stack" },
  { href: "/qr", label: "QR Tracking", icon: "qr" },
  { href: "/feedback", label: "Feedback", icon: "star" },
  { href: "/loyalty", label: "Loyalty", icon: "gift" },
  { href: "/employees", label: "Employees", icon: "badge" },
  { href: "/branches", label: "Branches", icon: "branch" },
  { href: "/users", label: "Users", icon: "users" },
  { href: "/integrations", label: "Integrations", icon: "plug" },
  { href: "/settings", label: "Settings", icon: "gear" },
];

// Nav items hidden from the sidebar for now (the pages still exist and
// work if visited directly). To show one again, delete its href here.
const HIDDEN_HREFS = new Set([
  "/inventory",
  "/qr",
  "/feedback",
  "/loyalty",
]);

const VISIBLE_MANAGE_NAV = MANAGE_NAV.filter((i) => !HIDDEN_HREFS.has(i.href));

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function Brand({
  orgName,
  logoUrl,
  dark,
}: {
  orgName: string;
  logoUrl?: string | null;
  dark?: boolean;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={orgName}
          className={`h-9 w-9 shrink-0 rounded-lg object-contain ${dark ? "bg-white/10 p-0.5" : "border border-slate-200 bg-white p-0.5"}`}
        />
      ) : (
        <span
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg text-lg font-bold ${
            dark ? "bg-teal-400/20 text-teal-200" : "bg-teal-100 text-teal-700"
          }`}
        >
          {orgName.charAt(0).toUpperCase()}
        </span>
      )}
      <span
        className={`truncate text-lg font-bold tracking-tight ${dark ? "text-white" : "text-teal-800"}`}
      >
        {orgName}
      </span>
    </div>
  );
}

export function AppShell({
  orgName,
  logoUrl,
  displayName,
  role,
  children,
}: {
  orgName: string;
  logoUrl?: string | null;
  displayName: string;
  role: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Mobile backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[82vw] flex-col bg-[#0f3b38] text-teal-50 transition-transform duration-200 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:w-64 lg:max-w-none lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-2 px-6 py-5">
          <Brand orgName={orgName} logoUrl={logoUrl} dark />
          <button
            onClick={() => setOpen(false)}
            className="shrink-0 rounded-lg p-1 text-teal-200/70 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav
          className="flex-1 overflow-y-auto px-4 pb-4"
          onClick={(e) => {
            // Close the drawer when a nav link is tapped (mobile).
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          <p className="px-3 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-wider text-teal-300/60">
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
            {VISIBLE_MANAGE_NAV.map((item) => (
              <NavLink key={item.href} {...item} />
            ))}
          </div>

          <p className="px-3 pb-2 pt-6 text-center text-[10px] text-teal-300/40">
            Powered by PrintOS
          </p>
        </nav>

        <div className="flex items-center gap-3 border-t border-white/10 px-5 py-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-teal-400/25 text-sm font-semibold text-teal-100">
            {initials(displayName)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{displayName}</p>
            <p className="truncate text-xs capitalize text-teal-200/70">{role}</p>
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

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar with hamburger */}
        <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-600"
            aria-label="Open menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <Brand orgName={orgName} logoUrl={logoUrl} />
        </div>

        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
