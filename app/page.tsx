import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const FEATURES = [
  { icon: "🗂️", title: "Orders & Production Board", desc: "Track every job from quote to pickup with a drag-and-drop kanban board." },
  { icon: "🧾", title: "Quotes & Invoices", desc: "Send quotations, convert them to orders, and generate invoices and receipts." },
  { icon: "👥", title: "Customers & History", desc: "Keep every customer's orders, files, and payment history in one place." },
  { icon: "📲", title: "Claim Stubs & QR Tracking", desc: "Print a claim stub with a QR code so customers can track their order status." },
  { icon: "💰", title: "Balances & Collectibles", desc: "See exactly who owes what and record payments as they come in." },
  { icon: "🏷️", title: "White-label", desc: "Your shop name, logo, and colors — across the app, portal, and documents." },
];

export default async function LandingPage() {
  // Signed-in shop owners skip the marketing page.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Nav */}
      <header className="sticky top-0 z-10 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <span className="text-lg font-bold text-teal-700">PrintOS</span>
          <nav className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:text-teal-700"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
            >
              Sign up free
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 py-16 text-center sm:py-24">
        <span className="inline-block rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          Built for printing shops
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
          The operating system for your{" "}
          <span className="text-teal-700">print shop</span>
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-500">
          Manage orders, quotes, customers, payments, and production — all in one
          place. Set up your shop in minutes.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="w-full rounded-xl bg-teal-700 px-6 py-3 text-center text-sm font-semibold text-white hover:bg-teal-600 sm:w-auto"
          >
            Create your shop free →
          </Link>
          <Link
            href="/login"
            className="w-full rounded-xl border border-slate-300 px-6 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            Sign in
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-400">
          No credit card required · Free to get started
        </p>
      </section>

      {/* Features */}
      <section className="border-t border-slate-100 bg-slate-50/60 py-16">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-2xl font-bold">Everything your shop runs on</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="text-2xl">{f.icon}</div>
                <h3 className="mt-3 text-base font-bold">{f.title}</h3>
                <p className="mt-1 text-sm text-slate-500">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sign-up CTA */}
      <section className="mx-auto max-w-6xl px-5 py-16 text-center">
        <div className="rounded-3xl bg-teal-700 px-6 py-14 text-white">
          <h2 className="text-2xl font-bold sm:text-3xl">Ready to run your shop better?</h2>
          <p className="mx-auto mt-3 max-w-md text-teal-50">
            Create your account and start managing orders today.
          </p>
          <Link
            href="/signup"
            className="mt-7 inline-block rounded-xl bg-white px-6 py-3 text-sm font-semibold text-teal-700 hover:bg-teal-50"
          >
            Sign up free →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 text-sm text-slate-400 sm:flex-row">
          <span>© {new Date().getFullYear()} PrintOS</span>
          <div className="flex items-center gap-4">
            <Link href="/track" className="hover:text-teal-700">
              Track an order
            </Link>
            <Link href="/login" className="hover:text-teal-700">
              Sign in
            </Link>
            <Link href="/signup" className="hover:text-teal-700">
              Sign up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
