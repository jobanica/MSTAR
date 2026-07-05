import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Brand";

export const metadata: Metadata = {
  title:
    "PrintOSph — Print Shop Management Software for Filipino Printing Businesses",
  description:
    "Manage orders, track production, route files to operators, and keep customers updated — all in one platform built for printing businesses in the Philippines. ₱2,500/month. Try free for 30 days.",
};

const DARK = "#141d33"; // navy — matches the logo
const DARK_CARD = "#212c49";
const BTN = "bg-orange-500 text-[#16223B] transition-colors hover:bg-orange-400";

function Icon({ path, className = "h-5 w-5" }: { path: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {path.split("||").map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  );
}

const ICONS = {
  check: "M20 6L9 17l-5-5",
  board: "M4 4h4v16H4zM10 4h4v10h-4zM16 4h4v13h-4z",
  route: "M6 3v12a3 3 0 003 3h6||M6 3a2 2 0 100 4 2 2 0 000-4zM18 15a2 2 0 100 4 2 2 0 000-4z",
  users: "M16 11a4 4 0 10-8 0 4 4 0 008 0zM3 21a7 7 0 0118 0",
  bell: "M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 01-3.4 0",
  doc: "M6 2h9l5 5v15H6zM14 2v6h6",
  box: "M21 8l-9-5-9 5 9 5 9-5zM3 8v8l9 5 9-5V8M12 13v8",
  chart: "M3 3v18h18||M7 14v4M12 9v9M17 5v13",
  gift: "M20 12v8H4v-8||M2 8h20v4H2z||M12 8v12",
  qr: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 14v6M17 20h3",
  tag: "M20.6 13.4l-7.2 7.2a2 2 0 01-2.8 0l-7.2-7.2a2 2 0 01-.6-1.4V4a1 1 0 011-1h8a2 2 0 011.4.6l7.2 7.2a2 2 0 010 2.6zM7.5 7.5h.01",
  arrow: "M5 12h14M13 6l6 6-6 6",
};

const PAINS = [
  { q: "“Where’s my order?”", a: "Your customers keep calling and messaging just to check if their job is done. You spend half your day answering the same question." },
  { q: "“Which file is the final one?”", a: "Your designer sent 4 versions via Messenger. Your operator printed the wrong one. Again." },
  { q: "“Who’s working on what?”", a: "Jobs pile up on your production floor with no clear system. Rush orders get missed. Deadlines get broken." },
];

const SOLUTIONS = [
  { icon: ICONS.board, title: "Keep Every Job on Track", body: "See every order at every stage on one board. Know exactly what’s being designed, what’s printing, and what’s ready — without asking anyone." },
  { icon: ICONS.route, title: "Send the Right File to the Right Operator", body: "When your designer finalizes a layout, it goes directly to the right machine operator’s dashboard. Tarpaulin operator sees only tarpaulin jobs. Digital press sees only theirs. No confusion. No misprints." },
  { icon: ICONS.users, title: "Let Your Customers Track Their Own Orders", body: "Your customers get their own portal to track order status, approve layouts, and request revisions — so they stop flooding your Messenger inbox with “kamusta na order ko?”" },
];

const STEPS = [
  { n: "1", title: "Set Up Your Shop", body: "Create your PrintOSph account, add your departments and staff, and invite your team. Your whole operation is ready in under 30 minutes." },
  { n: "2", title: "Take Orders and Assign Jobs", body: "Create orders, generate quotations, and assign jobs to designers and operators. Every staff member sees exactly what they need to work on — nothing more." },
  { n: "3", title: "Deliver and Get Paid", body: "Track jobs through production, send automatic SMS updates to customers, generate invoices, and log payments. Close every job clean." },
];

const FEATURES = [
  { icon: ICONS.board, title: "Kanban Production Board", body: "See every job’s status at a glance — no more “tanong muna sa staff.”" },
  { icon: ICONS.route, title: "File Versioning & Routing", body: "Final files go straight to the right operator — no more misprints." },
  { icon: ICONS.users, title: "Customer Self-Service Portal", body: "Customers approve layouts and track orders themselves." },
  { icon: ICONS.bell, title: "Automatic SMS Updates", body: "Customers notified at every stage — fewer follow-up calls." },
  { icon: ICONS.doc, title: "Quotation & Invoice PDFs", body: "Professional PDFs with your shop’s branding in one click." },
  { icon: ICONS.box, title: "Inventory Tracking", body: "Know when you’re running low before you run out mid-job." },
  { icon: ICONS.chart, title: "Staff Performance Reports", body: "See who’s on time and where your production bottlenecks are." },
  { icon: ICONS.gift, title: "Loyalty Points System", body: "Reward repeat customers and keep them coming back." },
  { icon: ICONS.qr, title: "QR Code Per Job", body: "Scan any job on the floor to pull up its details instantly." },
  { icon: ICONS.tag, title: "White-Label Branding", body: "Your customer portal looks like your business — not PrintOSph." },
];

const PLAN_INCLUDES = [
  "All platform features — nothing locked behind higher tiers",
  "Unlimited orders and customers",
  "Customer self-service portal",
  "SMS notifications via Semaphore",
  "Quotation and invoice PDF generation",
  "Inventory and staff management",
  "White-label branding for your shop",
  "Priority support",
];

const FAQS = [
  { q: "Kailangan ko bang mag-IT o mag-coding para gamitin ito?", a: "Hindi. PrintOSph is built for print shop owners, not developers. If you can use Facebook, you can use PrintOSph. We also guide you through the full setup." },
  { q: "What if I have multiple departments like tarpaulin, digital press, and offset?", a: "PrintOSph is built for exactly that. Add unlimited departments and each operator only sees the jobs for their machine. Add or remove departments anytime — no coding needed." },
  { q: "Can my customers really approve files without calling us?", a: "Yes. When your designer uploads the final layout, your customer gets an SMS with a link to their PrintOSph portal. They can preview the file, approve it, or request a revision — without messaging you." },
  { q: "What happens if I miss a payment?", a: "You get a 3-day grace period before access is restricted. We’ll send reminders well before anything is locked." },
  { q: "Is my data safe?", a: "All your data — files, customer info, orders — is stored securely with enterprise-grade encryption. Each printing business’s data is completely isolated from others." },
  { q: "Can I cancel anytime?", a: "Yes. No lock-in, no cancellation fees. Your data is yours." },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-white text-slate-800">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/10 text-white" style={{ backgroundColor: DARK }}>
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Logo onDark />
          <nav className="flex items-center gap-1">
            <a href="#features" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white md:inline-block">Features</a>
            <a href="#pricing" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white md:inline-block">Pricing</a>
            <a href="#faq" className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white md:inline-block">FAQ</a>
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:text-white">Login</Link>
            <Link href="/signup" className={`rounded-lg px-4 py-2 text-sm font-semibold ${BTN}`}>Start Free Trial</Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden text-white" style={{ backgroundColor: DARK }}>
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 15% 10%, rgba(240,124,52,0.28), transparent 40%), radial-gradient(circle at 90% 90%, rgba(74,120,236,0.18), transparent 45%)" }} aria-hidden />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:py-28">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-orange-300">
                Built for Filipino printing businesses
              </p>
              <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                Run Your Print Shop Without the Chaos
              </h1>
              <p className="mt-5 max-w-xl text-lg text-slate-300">
                PrintOSph is the all-in-one management platform built for printing businesses in the Philippines. Track every job, manage your production floor, and keep your customers updated — all in one place.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href="/signup" className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold shadow-lg transition-transform hover:-translate-y-0.5 ${BTN}`}>
                  Start Your Free Trial <Icon path={ICONS.arrow} className="h-4 w-4" />
                </Link>
                <span className="text-sm text-slate-400">30 days free · No credit card required</span>
              </div>
            </div>

            {/* Product mockup: a mini production board */}
            <div className="relative hidden lg:block">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-2xl backdrop-blur">
                <div className="mb-3 flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
                  <span className="ml-2 text-xs text-slate-400">Production Board</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { name: "Design", tone: "bg-sky-400", jobs: ["ORD-0012 · Tarp", "ORD-0015 · Cards"] },
                    { name: "Printing", tone: "bg-amber-400", jobs: ["ORD-0009 · Flyers"] },
                    { name: "Ready", tone: "bg-emerald-400", jobs: ["ORD-0007 · Mugs", "ORD-0004 · Banner"] },
                  ].map((col) => (
                    <div key={col.name} className="rounded-xl p-2" style={{ backgroundColor: DARK_CARD }}>
                      <div className="mb-2 flex items-center gap-1.5 px-1 text-[11px] font-semibold text-slate-200">
                        <span className={`h-2 w-2 rounded-full ${col.tone}`} />
                        {col.name}
                      </div>
                      <div className="space-y-2">
                        {col.jobs.map((j) => (
                          <div key={j} className="rounded-lg bg-white/90 p-2 text-[11px] font-medium text-slate-700 shadow-sm">
                            {j}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-xl">
                <Icon path={ICONS.bell} className="h-4 w-4 text-orange-500" />
                SMS sent to customer
              </div>
            </div>
          </div>
        </section>

        {/* Pain */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Sound Familiar?</h2>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {PAINS.map((p) => (
              <div key={p.q} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <p className="text-lg font-bold text-slate-900">{p.q}</p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{p.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Solution */}
        <section className="border-y border-slate-100 bg-slate-50">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">One Platform. Every Part of Your Print Business.</h2>
              <p className="mt-4 text-lg text-slate-500">
                From the moment a customer places an order to the moment it’s delivered — PrintOSph manages the entire flow so you don’t have to.
              </p>
            </div>
            <div className="mt-14 space-y-4">
              {SOLUTIONS.map((s, i) => (
                <div key={s.title} className={`flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8 ${i % 2 ? "sm:flex-row-reverse" : ""}`}>
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
                    <Icon path={s.icon} className="h-10 w-10" />
                  </div>
                  <div className="sm:flex-1">
                    <h3 className="text-xl font-bold text-slate-900">{s.title}</h3>
                    <p className="mt-2 text-slate-600">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="scroll-mt-20 text-white" style={{ backgroundColor: DARK }}>
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">Up and Running in 3 Steps</h2>
            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {STEPS.map((s) => (
                <div key={s.n} className="rounded-2xl p-6" style={{ backgroundColor: DARK_CARD }}>
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-500 text-lg font-black text-[#16223B]">{s.n}</span>
                  <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-slate-300">{s.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-10 text-center">
              <a href="#features" className="inline-flex items-center gap-2 rounded-xl border border-orange-400/40 px-6 py-3 text-sm font-semibold text-orange-300 transition-colors hover:bg-orange-400/10">
                See How PrintOSph Works <Icon path={ICONS.arrow} className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 sm:px-6">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Everything Your Print Shop Needs. Nothing It Doesn’t.</h2>
            </div>
            <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-transform hover:-translate-y-1">
                  <span className="grid h-11 w-11 place-items-center rounded-xl bg-orange-50 text-orange-600">
                    <Icon path={f.icon} className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="scroll-mt-20 border-y border-slate-100 bg-slate-50">
          <div className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">One Simple Price. No Surprises.</h2>
            </div>
            <div className="mt-10 overflow-hidden rounded-3xl border border-orange-200 bg-white shadow-xl">
              <div className="px-8 py-10 text-center text-white" style={{ backgroundColor: DARK }}>
                <div className="flex items-end justify-center gap-1">
                  <span className="text-5xl font-extrabold tracking-tight">₱2,500</span>
                  <span className="pb-1.5 text-slate-300">/ month</span>
                </div>
                <p className="mt-2 text-slate-300">Everything included. Unlimited orders. All features. All staff.</p>
              </div>
              <div className="p-8">
                <ul className="space-y-3">
                  {PLAN_INCLUDES.map((f) => (
                    <li key={f} className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-orange-100 text-orange-700">
                        <Icon path={ICONS.check} className="h-3.5 w-3.5" />
                      </span>
                      <span className="text-sm text-slate-700">{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold ${BTN}`}>
                  Start Free — Try PrintOSph for 30 Days
                </Link>
                <p className="mt-3 text-center text-xs text-slate-400">
                  No contracts. Cancel anytime. Setup takes less than 30 minutes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-20">
          <div className="mx-auto w-full max-w-3xl px-4 py-20 sm:px-6">
            <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Your Questions, Answered</h2>
            <div className="mt-12 space-y-3">
              {FAQS.map((f) => (
                <details key={f.q} className="group rounded-2xl border border-slate-200 bg-white p-5 open:shadow-sm">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900">
                    {f.q}
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-500 transition-transform group-open:rotate-45">
                      <Icon path="M12 5v14M5 12h14" className="h-4 w-4" />
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="relative overflow-hidden text-white" style={{ backgroundColor: DARK }}>
          <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 50% 0%, rgba(240,124,52,0.25), transparent 55%)" }} aria-hidden />
          <div className="relative mx-auto w-full max-w-3xl px-4 py-20 text-center sm:px-6">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Your Print Shop Deserves a Better System</h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-slate-300">
              Stop managing jobs through chat threads, spreadsheets, and memory. PrintOSph gives your whole team — designers, operators, sales staff — one place to work from, so nothing falls through the cracks.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/signup" className={`inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold shadow-lg transition-transform hover:-translate-y-0.5 ${BTN}`}>
                Start My Free 30-Day Trial
              </Link>
              <Link href="/signup" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/25 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10">
                Book a Demo Instead <Icon path={ICONS.arrow} className="h-4 w-4" />
              </Link>
            </div>
            <p className="mt-4 text-sm text-slate-400">No credit card. No setup fees. Cancel anytime.</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="text-white" style={{ backgroundColor: DARK }}>
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 border-t border-white/10 px-4 py-10 sm:flex-row sm:px-6">
          <Logo onDark />
          <div className="flex items-center gap-5 text-sm text-slate-300">
            <a href="#features" className="hover:text-white">Features</a>
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#faq" className="hover:text-white">FAQ</a>
            <Link href="/login" className="hover:text-white">Login</Link>
          </div>
          <span className="text-xs text-slate-500">© {new Date().getFullYear()} PrintOSph</span>
        </div>
      </footer>
    </div>
  );
}
