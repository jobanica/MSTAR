import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions/auth";
import { startLifetimeCheckout } from "@/app/actions/billing";
import { SubmitButton } from "@/components/SubmitButton";
import { trialDaysLeft } from "@/lib/subscription";

export const metadata = { title: "Upgrade" };

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; failed?: string; error?: string }>;
}) {
  const { paid, failed, error } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("organizations(name, subscription_status, trial_ends_at)")
    .eq("user_id", user.id)
    .maybeSingle();
  const org = profile?.organizations as unknown as {
    name: string;
    subscription_status: string | null;
    trial_ends_at: string | null;
  } | null;

  const isLifetime = org?.subscription_status === "lifetime";
  const days = trialDaysLeft(org?.trial_ends_at ?? null);
  const onTrial = !isLifetime && days !== null && days > 0;

  const price = process.env.XENDIT_PRICE_AMOUNT ?? "5";
  const currency = process.env.XENDIT_CURRENCY ?? "USD";

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-teal-700">
            {org?.name ?? "PrintOS"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Subscription</p>
        </div>

        {paid && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-sm text-emerald-700">
            Payment received! Confirming with our provider… this can take a few
            seconds. Refresh, then head to your dashboard.
          </p>
        )}
        {failed && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-700">
            Payment was not completed. You can try again below.
          </p>
        )}
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-center text-sm text-red-700">
            {error}
          </p>
        )}

        {isLifetime ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <div className="text-3xl">🎉</div>
            <h2 className="mt-3 text-lg font-bold">You have lifetime access</h2>
            <p className="mt-1 text-sm text-slate-500">Thanks for your support!</p>
            <Link
              href="/dashboard"
              className="mt-6 inline-block rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-600"
            >
              Go to dashboard →
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div
              className={`rounded-lg px-3 py-2 text-center text-sm font-medium ${
                onTrial
                  ? "bg-teal-50 text-teal-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {onTrial
                ? `Free trial — ${days} day${days === 1 ? "" : "s"} left`
                : "Your free trial has ended"}
            </div>

            <div className="mt-6 text-center">
              <div className="text-4xl font-bold text-slate-900">
                ${price}
                <span className="ml-1 text-base font-normal text-slate-400">
                  {currency}
                </span>
              </div>
              <div className="mt-1 text-sm font-semibold text-teal-700">
                Lifetime access
              </div>
              <p className="mt-2 text-xs text-slate-400">
                One-time payment. No monthly fees, ever.
              </p>
            </div>

            <ul className="mt-6 space-y-2 text-sm text-slate-600">
              {[
                "Unlimited orders, quotes & invoices",
                "Production board & customer tracking",
                "Claim stubs, QR codes & balances",
                "All future updates included",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2">
                  <span className="text-emerald-600">✓</span> {f}
                </li>
              ))}
            </ul>

            <form action={startLifetimeCheckout} className="mt-6">
              <SubmitButton className="w-full">
                Pay ${price} — Get lifetime access
              </SubmitButton>
            </form>
            {onTrial && (
              <Link
                href="/dashboard"
                className="mt-3 block text-center text-sm font-medium text-slate-500 hover:text-teal-700"
              >
                Continue trial →
              </Link>
            )}
          </div>
        )}

        <form action={signOut} className="text-center">
          <button className="text-sm text-slate-400 hover:text-teal-700">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
