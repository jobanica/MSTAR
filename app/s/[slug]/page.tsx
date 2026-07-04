import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatCentavos } from "@/lib/format";
import { readableOn, withAlpha } from "@/lib/color";
import type {
  SiteInfo,
  SiteService,
  SitePortfolioItem,
  SiteTestimonial,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const NAVY = "#0f1a36";
const NAVY_CARD = "#18244a";

async function loadSite(slug: string) {
  const supabase = await createClient();
  const [
    { data: siteRows },
    { data: serviceRows },
    { data: portfolioRows },
    { data: testimonialRows },
  ] = await Promise.all([
    supabase.rpc("public_site_by_slug", { p_slug: slug }),
    supabase.rpc("public_site_services", { p_slug: slug }),
    supabase.rpc("public_site_portfolio", { p_slug: slug }),
    supabase.rpc("public_site_testimonials", { p_slug: slug }),
  ]);
  return {
    site: (Array.isArray(siteRows) ? siteRows[0] : null) as SiteInfo | null,
    services: (serviceRows ?? []) as SiteService[],
    portfolio: (portfolioRows ?? []) as SitePortfolioItem[],
    testimonials: (testimonialRows ?? []) as SiteTestimonial[],
  };
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
    title: `${site.name} — Printing services`,
    description:
      site.hero_subheadline ?? site.tagline ?? `Printing services by ${site.name}.`,
  };
}

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function Icon({
  path,
  className = "h-5 w-5",
  style,
}: {
  path: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {path.split("||").map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

const ICONS = {
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  phone:
    "M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3 19.5 19.5 0 01-6-6 19.8 19.8 0 01-3-8.6A2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.6a2 2 0 01-.5 2.1L8.1 9.9a16 16 0 006 6l1.5-1.2a2 2 0 012.1-.5c.8.3 1.7.6 2.6.7a2 2 0 011.7 2z",
  mail: "M4 4h16v16H4zM22 6l-10 7L2 6",
  pin: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1116 0zM12 10a2 2 0 100-4 2 2 0 000 4z",
  arrow: "M5 12h14M13 6l6 6-6 6",
  printer: "M6 9V2h12v7||M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2||M6 14h12v8H6z",
  layers: "M12 2l9 5-9 5-9-5zM3 12l9 5 9-5M3 17l9 5 9-5",
  brush: "M9.06 11.9l8.07-8.06a2.85 2.85 0 114.03 4.03l-8.06 8.08||M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 00-3-3.02z",
  sticker: "M15 3H5a2 2 0 00-2 2v14a2 2 0 002 2h10l6-6V5a2 2 0 00-2-2zM15 21v-6h6",
  shirt: "M20.4 5.6L16 4a4 4 0 01-8 0L3.6 5.6a1 1 0 00-.6 1.3l1 3 2-.7V20a1 1 0 001 1h10a1 1 0 001-1V9.2l2 .7 1-3a1 1 0 00-.6-1.3z",
  gift: "M20 12v8H4v-8||M2 8h20v4H2z||M12 8v12||M12 8S9 3 6.5 4.5 8.5 8 12 8zM12 8s3-5 5.5-3.5S15.5 8 12 8z",
  check: "M20 6L9 17l-5-5",
  clock: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  chat: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z",
  truck:
    "M1 6h13v11H1zM14 9h4l3 3v5h-7||M5.5 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM17.5 20a1.5 1.5 0 100-3 1.5 1.5 0 000 3z",
  spark: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M18 6l-2 2M8 16l-2 2",
};

const SERVICE_ICONS = [ICONS.printer, ICONS.layers, ICONS.brush, ICONS.sticker, ICONS.shirt, ICONS.gift];

const DEFAULT_SERVICES: SiteService[] = [
  { name: "Tarpaulin & Large Format", category: "Signage", unit: null, unit_price_centavos: 0, description: "Banners, streamers, and posters that pop." },
  { name: "Business Cards", category: "Office", unit: null, unit_price_centavos: 0, description: "Premium stocks and finishes." },
  { name: "Flyers & Brochures", category: "Marketing", unit: null, unit_price_centavos: 0, description: "Full-color, any quantity." },
  { name: "Stickers & Labels", category: "Custom", unit: null, unit_price_centavos: 0, description: "Die-cut and waterproof options." },
  { name: "Mug & Shirt Printing", category: "Personalized", unit: null, unit_price_centavos: 0, description: "Custom sublimation for any occasion." },
  { name: "Invitations", category: "Events", unit: null, unit_price_centavos: 0, description: "Weddings, birthdays, and more." },
];

function Stars({ n, className = "" }: { n: number; className?: string }) {
  return (
    <span className={`inline-flex ${className}`} aria-label={`${n} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} viewBox="0 0 24 24" className="h-4 w-4" fill={i < n ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5} aria-hidden>
          <path d="M12 3l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 18l-5.8 3 1.1-6.5L2.6 9.8l6.5-.9z" />
        </svg>
      ))}
    </span>
  );
}

export default async function ShopSitePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { site, services, portfolio, testimonials } = await loadSite(slug);
  if (!site) notFound();

  const brand = site.primary_color || "#f26a2e";
  const onBrand = readableOn(brand);
  const trackHref = `/track?shop=${encodeURIComponent(slug)}`;

  const headline = site.hero_headline?.trim() || `The Best Copying & Printing Center`;
  const subheadline =
    site.hero_subheadline?.trim() ||
    site.tagline?.trim() ||
    "From tarpaulins to business cards, we bring your art and design to life. Order, track, and chat with us — no account needed.";

  const serviceList = (services.length > 0 ? services : DEFAULT_SERVICES).slice(0, 6);
  const showPortfolio = site.show_portfolio && portfolio.length > 0;
  const showTestimonials = testimonials.length > 0;
  const showAbout = Boolean(site.about_body?.trim());

  const contacts = [
    site.address || site.city ? { icon: ICONS.pin, label: "Visit us", text: [site.address, site.city].filter(Boolean).join(", ") } : null,
    site.contact_phone ? { icon: ICONS.phone, label: "Call us", text: site.contact_phone } : null,
    site.contact_email ? { icon: ICONS.mail, label: "Email us", text: site.contact_email } : null,
  ].filter(Boolean) as { icon: string; label: string; text: string }[];

  const steps = [
    { icon: ICONS.chat, title: "Send your design", body: "Message us your file or idea and get a quick quote." },
    { icon: ICONS.printer, title: "We print with care", body: "Proofed, printed, and quality-checked by our team." },
    { icon: ICONS.truck, title: "Track & receive", body: "Follow every stage online, then pick up or get it delivered." },
  ];

  const navLinks = [
    { href: "#services", label: "Services" },
    showPortfolio ? { href: "#work", label: "Our work" } : null,
    showTestimonials ? { href: "#reviews", label: "Reviews" } : null,
    contacts.length ? { href: "#contact", label: "Contact" } : null,
  ].filter(Boolean) as { href: string; label: string }[];

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
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/10" style={{ backgroundColor: NAVY }}>
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2.5">
            {site.logo_url ? (
              <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={site.logo_url} alt={site.name} className="h-full w-full object-contain" />
              </span>
            ) : (
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sm font-bold" style={{ backgroundColor: brand, color: onBrand }}>
                {initials(site.name)}
              </span>
            )}
            <span className="truncate text-lg font-bold tracking-tight text-white">{site.name}</span>
          </div>
          <nav className="flex items-center gap-1">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white md:inline-block">
                {l.label}
              </a>
            ))}
            <Link href="/login" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:text-white sm:inline-block">
              Staff login
            </Link>
            <Link href={trackHref} className="rounded-lg px-4 py-2 text-sm font-semibold shadow-sm" style={{ backgroundColor: brand, color: onBrand }}>
              Track order
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden" style={{ backgroundColor: NAVY }}>
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle at 15% 15%, ${withAlpha(brand, 0.35)}, transparent 40%), radial-gradient(circle at 90% 80%, ${withAlpha(brand, 0.22)}, transparent 45%)`,
            }}
            aria-hidden
          />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider" style={{ backgroundColor: withAlpha(brand, 0.15), color: brand }}>
                <Icon path={ICONS.spark} className="h-4 w-4" /> Copying & printing center
              </p>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
                {headline}
              </h1>
              <p className="mt-5 max-w-xl text-lg text-slate-300">{subheadline}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={trackHref} className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-lg transition-transform hover:-translate-y-0.5" style={{ backgroundColor: brand, color: onBrand }}>
                  <Icon path={ICONS.search} className="h-5 w-5" /> Track your order
                </Link>
                {site.contact_phone && (
                  <a href={`tel:${site.contact_phone}`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                    <Icon path={ICONS.phone} className="h-5 w-5" /> Call the shop
                  </a>
                )}
              </div>
            </div>

            {/* Branded visual */}
            <div className="relative hidden lg:block">
              <div className="relative mx-auto aspect-square w-full max-w-md rounded-[2rem] p-8" style={{ background: `linear-gradient(135deg, ${brand}, ${withAlpha(brand, 0.6)})` }}>
                <div className="grid h-full w-full place-items-center rounded-2xl bg-white/10 backdrop-blur">
                  {site.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={site.logo_url} alt={site.name} className="max-h-40 max-w-[70%] object-contain" />
                  ) : (
                    <span className="text-5xl font-black" style={{ color: onBrand }}>{initials(site.name)}</span>
                  )}
                </div>
              </div>
              <div className="absolute -left-4 top-6 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-xl">
                <Icon path={ICONS.check} className="h-4 w-4" style={{ color: brand } as React.CSSProperties} />
                Quality prints
              </div>
              <div className="absolute -right-3 bottom-10 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-xl">
                <span style={{ color: brand }}><Stars n={5} /></span>
                Loved locally
              </div>
              <div className="absolute -bottom-4 left-10 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-xl">
                <Icon path={ICONS.clock} className="h-4 w-4" style={{ color: brand } as React.CSSProperties} />
                Fast turnaround
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        {showAbout && (
          <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div className="relative">
                <div className="aspect-[4/3] overflow-hidden rounded-3xl" style={{ backgroundColor: "var(--brand-soft)" }}>
                  {portfolio[0]?.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={portfolio[0].image_url} alt="" className="h-full w-full object-cover" />
                  ) : site.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={site.logo_url} alt={site.name} className="h-full w-full object-contain p-12" />
                  ) : null}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: brand }}>
                  {site.about_title?.trim() || "About us"}
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  Realizing your art &amp; design into real products
                </h2>
                <p className="mt-4 whitespace-pre-line text-lg leading-relaxed text-slate-600">
                  {site.about_body}
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Services */}
        <section id="services" className="scroll-mt-20 border-y border-slate-100 bg-slate-50">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: brand }}>Our services</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">What we print</h2>
              <p className="mt-3 text-slate-500">Everyday printing to custom jobs — call or message us for a quote.</p>
            </div>
            <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {serviceList.map((svc, i) => (
                <div key={`${svc.name}-${i}`} className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1">
                  <span className="grid h-12 w-12 place-items-center rounded-xl transition-colors" style={{ backgroundColor: "var(--brand-soft)", color: brand }}>
                    <Icon path={SERVICE_ICONS[i % SERVICE_ICONS.length]} className="h-6 w-6" />
                  </span>
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <h3 className="font-semibold text-slate-900">{svc.name}</h3>
                    {svc.unit_price_centavos > 0 && (
                      <span className="shrink-0 rounded-lg px-2 py-0.5 text-sm font-semibold tabular-nums" style={{ backgroundColor: "var(--brand-soft)", color: brand }}>
                        {formatCentavos(svc.unit_price_centavos)}{svc.unit ? `/${svc.unit}` : ""}
                      </span>
                    )}
                  </div>
                  {svc.description && <p className="mt-1.5 text-sm text-slate-500">{svc.description}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works (dark band) */}
        <section className="relative overflow-hidden" style={{ backgroundColor: NAVY }}>
          <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(circle at 80% 20%, ${withAlpha(brand, 0.25)}, transparent 45%)` }} aria-hidden />
          <div className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: brand }}>How it works</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">From idea to printed in 3 steps</h2>
            </div>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {steps.map((s, i) => (
                <div key={s.title} className="rounded-2xl p-6" style={{ backgroundColor: NAVY_CARD }}>
                  <div className="flex items-center gap-3">
                    <span className="grid h-11 w-11 place-items-center rounded-xl" style={{ backgroundColor: brand, color: onBrand }}>
                      <Icon path={s.icon} className="h-5 w-5" />
                    </span>
                    <span className="text-3xl font-black text-white/15">0{i + 1}</span>
                  </div>
                  <h3 className="mt-4 font-semibold text-white">{s.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Portfolio */}
        {showPortfolio && (
          <section id="work" className="scroll-mt-20">
            <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: brand }}>Our latest work</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Projects we&apos;re proud of</h2>
                <p className="mt-3 text-slate-500">A sample of jobs we&apos;ve printed for our customers.</p>
              </div>
              <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                {portfolio.slice(0, 9).map((item, i) => (
                  <figure key={`${item.title}-${i}`} className={`group relative overflow-hidden rounded-2xl bg-slate-100 ${i === 0 ? "col-span-2 row-span-2" : ""}`}>
                    <div className={i === 0 ? "aspect-square lg:aspect-auto lg:h-full" : "aspect-square"}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={item.image_url} alt={item.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    </div>
                    <figcaption className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/70 to-transparent p-4 opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                      {item.category && <span className="text-[11px] font-medium uppercase tracking-wide text-white/70">{item.category}</span>}
                      <p className="font-semibold text-white">{item.title}</p>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Testimonials (dark) */}
        {showTestimonials && (
          <section id="reviews" className="scroll-mt-20" style={{ backgroundColor: NAVY }}>
            <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: brand }}>Client love</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white sm:text-4xl">What our customers say</h2>
              </div>
              <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {testimonials.slice(0, 6).map((t, i) => (
                  <figure key={i} className="flex flex-col rounded-2xl p-6" style={{ backgroundColor: NAVY_CARD }}>
                    <span style={{ color: brand }}><Stars n={t.rating} /></span>
                    <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-slate-200">&ldquo;{t.comment}&rdquo;</blockquote>
                    <figcaption className="mt-4 flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full text-xs font-bold" style={{ backgroundColor: brand, color: onBrand }}>
                        {t.author.slice(0, 2).toUpperCase()}
                      </span>
                      <span className="text-sm font-semibold text-white">{t.author}</span>
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Track CTA */}
        <section className="border-y border-slate-100 bg-slate-50">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 text-center sm:px-6">
            <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Already have an order with us?</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-500">Check its progress and message us in seconds — just your order number and phone, no login needed.</p>
            <Link href={trackHref} className="mt-6 inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-sm transition-transform hover:-translate-y-0.5" style={{ backgroundColor: brand, color: onBrand }}>
              Track your order <Icon path={ICONS.arrow} className="h-4 w-4" />
            </Link>
          </div>
        </section>

        {/* Contact */}
        {contacts.length > 0 && (
          <section id="contact" className="scroll-mt-20">
            <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:py-24">
              <div className="mx-auto max-w-2xl text-center">
                <p className="text-sm font-semibold uppercase tracking-wider" style={{ color: brand }}>Get in touch</p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Visit or reach us</h2>
              </div>
              <div className="mt-12 grid gap-5 sm:grid-cols-3">
                {contacts.map((c, i) => (
                  <div key={i} className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                    <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl" style={{ backgroundColor: "var(--brand-soft)", color: brand }}>
                      <Icon path={c.icon} className="h-6 w-6" />
                    </span>
                    <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">{c.label}</p>
                    <p className="mt-1 text-sm font-medium text-slate-700">{c.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer style={{ backgroundColor: NAVY }}>
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-4 py-10 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2.5">
            {site.logo_url ? (
              <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={site.logo_url} alt={site.name} className="h-full w-full object-contain" />
              </span>
            ) : null}
            <span className="font-bold text-white">{site.name}</span>
          </div>
          <div className="flex items-center gap-5 text-sm text-slate-300">
            <a href="#services" className="hover:text-white">Services</a>
            <Link href={trackHref} className="hover:text-white">Track order</Link>
            <Link href="/login" className="hover:text-white">Staff login</Link>
          </div>
          <span className="text-xs text-slate-500">Powered by PrintOS</span>
        </div>
      </footer>
    </div>
  );
}
