import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/server";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorNote, Field, inputClass } from "@/components/FormField";
import { statusLabel } from "@/lib/format";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invite?: string }>;
}) {
  const { error, invite } = await searchParams;

  // If arriving via an invite link, look up the shop + role so we can
  // tailor the form (no org name needed — they're joining a shop).
  let inviteInfo: { shop_name: string; role: string; email: string | null } | null = null;
  if (invite) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("public_invitation_info", { p_token: invite });
    inviteInfo = Array.isArray(data) ? (data[0] ?? null) : null;
  }
  const inviteValid = !!inviteInfo;

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-teal-700">PrintOS</h1>
          <p className="mt-1 text-sm text-slate-500">
            {inviteValid
              ? `Join ${inviteInfo!.shop_name}`
              : "Set up your print shop in minutes"}
          </p>
        </div>

        <ErrorNote message={error} />

        {invite && !inviteValid ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center text-sm text-amber-800">
            This invitation link is invalid or has expired. Please ask your shop
            admin for a new one.
          </div>
        ) : (
          <form
            action={signUp}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            {invite && <input type="hidden" name="invite" value={invite} />}

            {inviteValid ? (
              <div className="rounded-lg bg-teal-50 px-3 py-2 text-sm text-teal-800">
                You&apos;re joining <b>{inviteInfo!.shop_name}</b> as{" "}
                <b>{statusLabel(inviteInfo!.role)}</b>.
              </div>
            ) : (
              <Field label="Print shop name">
                <input
                  name="org_name"
                  required
                  placeholder="e.g. Davao Prints & Tarps"
                  className={inputClass}
                />
              </Field>
            )}

            <Field label="Your name">
              <input name="full_name" required className={inputClass} />
            </Field>
            <Field label="Email">
              <input
                name="email"
                type="email"
                required
                defaultValue={inviteInfo?.email ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="Password">
              <input
                name="password"
                type="password"
                required
                minLength={8}
                className={inputClass}
              />
            </Field>
            <SubmitButton className="w-full">
              {inviteValid ? "Join shop" : "Create account"}
            </SubmitButton>
          </form>
        )}

        <p className="text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-teal-700">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
