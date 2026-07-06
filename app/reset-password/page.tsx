"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PasswordField } from "@/components/PasswordField";
import { SubmitButton } from "@/components/SubmitButton";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // The recovery link opens this page with a session in the URL, which the
  // browser client picks up and fires PASSWORD_RECOVERY / SIGNED_IN.
  useEffect(() => {
    const supabase = createClient();
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN")) {
        setReady(true);
        setChecked(true);
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
      setChecked(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(formData: FormData) {
    setError(null);
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    // updateUser keeps them signed in, so send them straight into the app.
    setTimeout(() => router.push("/dashboard"), 1500);
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-teal-700">Set a new password</h1>
        </div>

        {done ? (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-center text-sm text-emerald-700">
            Password updated. Redirecting to sign in…
          </p>
        ) : !checked ? (
          <p className="text-center text-sm text-slate-500">Loading…</p>
        ) : !ready ? (
          <div className="space-y-4 text-center">
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              This reset link is invalid or has expired. Please request a new one.
            </p>
            <Link href="/forgot-password" className="text-sm font-medium text-teal-700">
              Request a new link
            </Link>
          </div>
        ) : (
          <form
            action={onSubmit}
            className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            {error && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                New password
              </span>
              <PasswordField name="password" required autoComplete="new-password" />
            </div>
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Confirm password
              </span>
              <PasswordField name="confirm" required autoComplete="new-password" />
            </div>
            <SubmitButton className="w-full">Update password</SubmitButton>
          </form>
        )}

        <p className="text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-teal-700">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
