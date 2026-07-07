import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title:
    "PrintOSph — Print Shop Management Software for Filipino Printing Businesses",
  description:
    "Manage orders, track production, route files to operators, and keep customers updated — all in one platform built for printing businesses in the Philippines. ₱2,500/month. Try free for 30 days.",
};

const PAINS = [
  {
    quote: "“Where’s my order?”",
    body: "Your customers keep calling and messaging just to check if their job is done. You spend half your day answering the same question.",
  },
  {
    quote: "“Which file is the final one?”",
    body: "Your designer sent 4 versions via Messenger. Your operator printed the wrong one. Again.",
  },
  {
    quote: "“Who’s working on what?”",
    body: "Jobs pile up on your production floor with no clear system. Rush orders get missed. Deadlines get broken.",
  },
];

const SOLUTIONS = [
  {
    icon: "📋",
    title: "Keep Every Job on Track",
    body: "See every order at every stage on one board. Know exactly what’s being designed, what’s printing, and what’s ready — without asking anyone.",
  },
  {
    icon: "🎯",
    title: "Send the Right File to the Right Operator",
    body: "When your designer finalizes a layout, it goes directly to the right machine operator’s dashboard. Tarpaulin operator sees only tarpaulin jobs. Digital press sees only theirs. No confusion. No misprints.",
  },
  {
    icon: "📱",
    title: "Let Your Customers Track Their Own Orders",
    body: "Your customers get their own portal to track order status, approve layouts, and request revisions — so they stop flooding your Messenger inbox with “kamusta na order ko?”",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Set Up Your Shop",
    body: "Create your PrintOSph account, add your departments and staff, and invite your team. Your whole operation is ready in under 30 minutes.",
  },
  {
    n: "2",
    title: "Take Orders and Assign Jobs",
    body: "Create orders, generate quotations, and assign jobs to designers and operators. Every staff member sees exactly what they need to work on — nothing more.",
  },
  {
    n: "3",
    title: "Deliver and Get Paid",
    body: "Track jobs through production, send automatic SMS updates to customers, generate invoices, and log payments. Close every job clean.",
  },
];

const FEATURES = [
  ["Kanban Production Board", "See every job’s status at a glance — no more “tanong muna sa staff”"],
  ["File Versioning & Routing", "Final files go straight to the right operator — no more misprints"],
  ["Customer Self-Service Portal", "Customers approve layouts and track orders themselves"],
  ["Automatic SMS Updates", "Customers notified at every stage — fewer follow-up calls"],
  ["Quotation & Invoice PDFs", "Professional PDFs with your shop’s branding in one click"],
  ["Inventory Tracking", "Know when you’re running low before you run out mid-job"],
  ["Staff Performance Reports", "See who’s on time and where your production bottlenecks are"],
  ["Loyalty Points System", "Reward repeat customers and keep them coming back"],
  ["QR Code Per Job", "Scan any job on the floor to pull up its details instantly"],
  ["White-Label Branding", "Your customer portal looks like your business — not PrintOSph"],
];

const PLAN = [
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
  {
    q: "Kailangan ko bang mag-IT o mag-coding para gamitin ito?",
    a: "Hindi. PrintOSph is built for print shop owners, not developers. If you can use Facebook, you can use PrintOSph. We also guide you through the full setup.",
  },
  {
    q: "What if I have multiple departments like tarpaulin, digital press, and offset?",
    a: "PrintOSph is built for exactly that. Add unlimited departments and each operator only sees the jobs for their machine. Add or remove departments anytime — no coding needed.",
  },
  {
    q: "Can my customers really approve files without calling us?",
    a: "Yes. When your designer uploads the final layout, your customer gets an SMS with a link to their PrintOSph portal. They can preview the file, approve it, or request a revision — without messaging you.",
  },
  {
    q: "What happens if I miss a payment?",
    a: "You get a 3-day grace period before access is restricted. We’ll send reminders well before anything is locked.",
  },
  {
    q: "Is my data safe?",
    a: "All your data — files, customer info, orders — is stored securely with enterprise-grade encryption. Each printing business’s data is completely isolated from others.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. No lock-in, no cancellation fees. Your data is yours.",
  },
];

function Logo() {
  return (
    <span className="text-lg font-extrabold tracking-tight text-teal-700">
      PrintOS<span className="text-slate-900">ph</span>
    </span>
  );
}

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-20 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Logo />
          <nav className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:text-teal-700">
              Sign in
            </Link>
            <Link href="/signup" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600">
              Start Free Trial
            </Link>
          </nav>
        </div>
      </header>

      {/* Section 1 — Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-teal-50/70 to-white" />
        <div className="relative mx-auto max-w-4xl px-5 py-20 text-center sm:py-28">
          <span className="inline-block rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-semibold text-teal-700">
            🇵🇭 Built for Filipino printing businesses
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold tracking-tight sm:text-6xl">
            Run Your Print Shop{" "}
            <span className="text-teal-700">Without the Chaos</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-500">
            PrintOSph is the all-in-one management platform built for printing
            businesses in the Philippines. Track every job, manage your production
            floor, and keep your customers updated — all in one place.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="w-full rounded-xl bg-teal-700 px-7 py-3.5 text-center text-sm font-semibold text-white shadow-sm hover:bg-teal-600 sm:w-auto">
              Start Your Free Trial
            </Link>
            <Link href="#how" className="w-full rounded-xl border border-slate-300 px-7 py-3.5 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto">
              See how it works
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-400">No credit card required.</p>
        </div>
      </section>

      {/* Section 2 — Pain */}
      <section className="bg-slate-50/70 py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-3xl font-bold">Sound Familiar?</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PAINS.map((p) => (
              <div key={p.quote} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <p className="text-lg font-bold text-slate-900">{p.quote}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3 — Solution */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold">
              One Platform. Every Part of Your Print Business.
            </h2>
            <p className="mt-4 text-slate-500">
              From the moment a customer places an order to the moment it&apos;s
              delivered — PrintOSph manages the entire flow so you don&apos;t have to.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {SOLUTIONS.map((s) => (
              <div key={s.title} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
                <div className="text-3xl">{s.icon}</div>
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-500">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 4 — How it works */}
      <section id="how" className="scroll-mt-20 bg-teal-700 py-20 text-white">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-3xl font-bold">Up and Running in 3 Steps</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <div key={s.n} className="rounded-2xl bg-white/10 p-7 ring-1 ring-white/15">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-white text-lg font-bold text-teal-700">
                  {s.n}
                </div>
                <h3 className="mt-4 text-lg font-bold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-teal-50/90">{s.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/signup" className="inline-block rounded-xl bg-white px-6 py-3 text-sm font-semibold text-teal-700 hover:bg-teal-50">
              See How PrintOSph Works →
            </Link>
          </div>
        </div>
      </section>

      {/* Section 5 — Features */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="mx-auto max-w-2xl text-center text-3xl font-bold">
            Everything Your Print Shop Needs. Nothing It Doesn&apos;t.
          </h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2">
            {FEATURES.map(([title, desc]) => (
              <div key={title} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                  ✓
                </span>
                <div>
                  <div className="font-semibold text-slate-900">{title}</div>
                  <div className="mt-0.5 text-sm text-slate-500">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6 — Pricing */}
      <section className="bg-slate-50/70 py-20">
        <div className="mx-auto max-w-lg px-5 text-center">
          <h2 className="text-3xl font-bold">One Simple Price. No Surprises.</h2>
          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="text-5xl font-extrabold tracking-tight">
              ₱2,500
              <span className="ml-1 text-lg font-normal text-slate-400">/ month</span>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Everything included. Unlimited orders. All features. All staff.
            </p>
            <ul className="mt-7 space-y-3 text-left">
              {PLAN.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm text-slate-700">
                  <span className="mt-0.5 text-teal-600">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link href="/signup" className="mt-8 block rounded-xl bg-teal-700 px-6 py-3.5 text-sm font-semibold text-white hover:bg-teal-600">
              Start Free — Try PrintOSph
            </Link>
            <p className="mt-3 text-xs text-slate-400">
              No contracts. Cancel anytime. Setup takes less than 30 minutes.
            </p>
          </div>
        </div>
      </section>

      {/* Section 7 — FAQ */}
      <section className="py-20">
        <div className="mx-auto max-w-3xl px-5">
          <h2 className="text-center text-3xl font-bold">Your Questions, Answered</h2>
          <div className="mt-10 space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-slate-900">
                  {f.q}
                  <span className="text-slate-400 transition-transform group-open:rotate-45">＋</span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Section 8 — Final CTA */}
      <section className="bg-slate-900 py-20 text-white">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <h2 className="text-3xl font-bold sm:text-4xl">
            Your Print Shop Deserves a Better System
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-slate-300">
            Stop managing jobs through chat threads, spreadsheets, and memory.
            PrintOSph gives your whole team — designers, operators, sales staff —
            one place to work from, so nothing falls through the cracks.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="w-full rounded-xl bg-teal-500 px-7 py-3.5 text-center text-sm font-semibold text-white hover:bg-teal-400 sm:w-auto">
              Start My Free Trial
            </Link>
            <a href="mailto:john2caal@gmail.com?subject=PrintOSph%20Demo%20Request" className="w-full rounded-xl border border-white/25 px-7 py-3.5 text-center text-sm font-semibold text-white hover:bg-white/10 sm:w-auto">
              Book a Demo Instead →
            </a>
          </div>
          <p className="mt-4 text-xs text-slate-400">
            No credit card. No setup fees. Cancel anytime.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-slate-400 sm:flex-row">
          <Logo />
          <div className="flex items-center gap-4">
            <Link href="/track" className="hover:text-teal-700">Track an order</Link>
            <Link href="/login" className="hover:text-teal-700">Sign in</Link>
            <Link href="/signup" className="hover:text-teal-700">Start Free Trial</Link>
          </div>
          <span>© {new Date().getFullYear()} PrintOSph</span>
        </div>
      </footer>
    </div>
  );
}
