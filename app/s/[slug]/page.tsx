import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCentavos } from "@/lib/format";
import { readableOn, withAlpha } from "@/lib/color";
import type { SiteInfo, SiteService } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadSite(slug: string) {
  const supabase = await createClient();
  const [{ data: siteRows }, { data: serviceRows }] = await Promise.all([
    supabase.rpc("public_site_by_slug", { p_slug: slug }),
    supabase.rpc("public_site_services", { p_slug: slug }),
  ]);
  const site = (Array.isArray(siteRows) ? siteRows[0] : null) as SiteInfo | null;
  const services = (serviceRows ?? []) as SiteService[];
  return { site, services };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { site } = await loadSite(slug);
  if (!site) return { title: "Shop not found" };
  return {
    title: site.name,
    description:
      site.tagline ?? `Order printing and track your jobs with ${site.name}.`,
  };
}

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// Inline SVG icons (no emoji, per the design system).
function Icon({ path, className = "h-5 w-5" }: { path: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={path} />
    </svg>
  );
}

const ICONS = {
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  chat: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  truck:
    "M1 6h13v11H1zM14 9h4l3 3v5h-7M5.5 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17.5 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  pin: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1116 0zM12 10a2 2 0 100-4 2 2 0 000 4z",
  phone:
    "M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3-8.6A2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.6a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.5-1.2a2 2 0 012.1-.5c.8.3 1.7.6 2.6.7a2 2 0 011.7 2z",
  mail: "M4 4h16v16H4zM22 6l-10 7L2 6",
  arrow: "M5 12h14M13 6l6 6-6 6",
};

export default async function ShopSitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { site, services } = await loadSite(slug);
  if (!site) notFound();

  const brand = site.primary_color || "#0369a1";
  const onBrand = readableOn(brand);
  const trackHref = `/track?shop=${encodeURIComponent(slug)}`;

  const contacts = [
    site.address || site.city
      ? { icon: ICONS.pin, text: [site.address, site.city].filter(Boolean).join(", ") }
      : null,
    site.contact_phone ? { icon: ICONS.phone, text: site.contact_phone } : null,
    site.contact_email ? { icon: ICONS.mail, text: site.contact_email } : null,
  ].filter(Boolean) as { icon: string; text: string }[];

  const steps = [
    {
      icon: ICONS.search,
      title: "Look up your order",
      body: "Enter your order number and the phone number on file to see live status.",
    },
    {
      icon: ICONS.chat,
      title: "Chat with the shop",
      body: "Ask for updates or request revisions right from the tracking page — no login needed.",
    },
    {
      icon: ICONS.truck,
      title: "Get it when it's ready",
      body: "Follow every stage from design to printing until it's ready for pickup or delivery.",
    },
  ];

  return (
    <div
      className="flex min-h-dvh flex-col bg-white text-slate-800"
      style={
        {
          "--brand": brand,
          "--on-brand": onBrand,
          "--brand-soft": withAlpha(brand, 0.1),
        } as React.CSSProperties
      }
    >
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {site.logo_url ? (
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-slate-200 bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={site.logo_url} alt={site.name} className="h-full w-full object-contain" />
              </span>
            ) : (
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold"
                style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand)" }}
              >
                {initials(site.name)}
              </span>
            )}
            <span className="truncate text-lg font-bold tracking-tight text-slate-900">
              {site.name}
            </span>
          </div>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href={trackHref}
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 sm:inline-block"
            >
              Track order
            </Link>
            <Link
              href="/login"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              Staff login
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section
          className="relative overflow-hidden"
          style={{ backgroundColor: "var(--brand)", color: "var(--on-brand)" }}
        >
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.5), transparent 45%), radial-gradient(circle at 85% 30%, rgba(255,255,255,0.25), transparent 40%)",
            }}
            aria-hidden
          />
          <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
            <div className="max-w-2xl">
              <p
                className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider"
                style={{ backgroundColor: withAlpha(onBrand, 0.15) }}
              >
                Printing services
              </p>
              <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
                {site.name}
              </h1>
              <p className="mt-4 text-lg opacity-90 sm:text-xl">
                {site.tagline ??
                  "Quality printing, done right. Track your order and talk to us anytime — no account needed."}
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={trackHref}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-sm transition-transform hover:-translate-y-0.5"
                >
                  <Icon path={ICONS.search} className="h-5 w-5" />
                  Track your order
                </Link>
                {contacts.find((c) => c.icon === ICONS.phone) && (
                  <a
                    href={`tel:${site.contact_phone}`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border px-5 py-3 text-sm font-semibold transition-colors"
                    style={{ borderColor: withAlpha(onBrand, 0.4), color: "var(--on-brand)" }}
                  >
                    <Icon path={ICONS.phone} className="h-5 w-5" />
                    Call the shop
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* How tracking works */}
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Already have an order with us?
            </h2>
            <p className="mt-3 text-slate-500">
              Check its progress and message the shop in seconds.
            </p>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-3">
            {steps.map((s) => (
              <div
                key={s.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <span
                  className="grid h-11 w-11 place-items-center rounded-xl"
                  style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand)" }}
                >
                  <Icon path={s.icon} className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Link
              href={trackHref}
              className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-sm transition-transform hover:-translate-y-0.5"
              style={{ backgroundColor: "var(--brand)", color: "var(--on-brand)" }}
            >
              Track your order
              <Icon path={ICONS.arrow} className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Services catalog */}
        {services.length > 0 && (
          <section className="border-t border-slate-100 bg-slate-50">
            <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
              <div className="mx-auto max-w-2xl text-center">
                <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                  What we print
                </h2>
                <p className="mt-3 text-slate-500">
                  A few of the services we offer. Call or message us for a quote.
                </p>
              </div>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {services.map((svc, i) => (
                  <div
                    key={`${svc.name}-${i}`}
                    className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {svc.category && (
                          <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                            {svc.category}
                          </span>
                        )}
                        <h3 className="font-semibold text-slate-900">{svc.name}</h3>
                      </div>
                      {svc.unit_price_centavos > 0 && (
                        <span
                          className="shrink-0 rounded-lg px-2.5 py-1 text-sm font-semibold tabular-nums"
                          style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand)" }}
                        >
                          {formatCentavos(svc.unit_price_centavos)}
                          {svc.unit ? ` / ${svc.unit}` : ""}
                        </span>
                      )}
                    </div>
                    {svc.description && (
                      <p className="mt-2 text-sm text-slate-500">{svc.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Contact */}
        {contacts.length > 0 && (
          <section className="border-t border-slate-100">
            <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Visit or reach us</h2>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {contacts.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                      style={{ backgroundColor: "var(--brand-soft)", color: "var(--brand)" }}
                    >
                      <Icon path={c.icon} className="h-5 w-5" />
                    </span>
                    <span className="text-sm text-slate-700">{c.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:px-6">
          <span className="font-semibold text-slate-700">{site.name}</span>
          <div className="flex items-center gap-4">
            <Link href={trackHref} className="hover:text-slate-700">
              Track order
            </Link>
            <Link href="/login" className="hover:text-slate-700">
              Staff login
            </Link>
          </div>
          <span className="text-xs text-slate-400">Powered by PrintOS</span>
        </div>
      </footer>
    </div>
  );
}
