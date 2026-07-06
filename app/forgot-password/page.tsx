import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorNote, Field, inputClass } from "@/components/FormField";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-teal-700">Reset password</h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <ErrorNote message={error} />
        {message && (
          <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {message}
          </p>
        )}

        <form
          action={requestPasswordReset}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <Field label="Email">
            <input name="email" type="email" required className={inputClass} />
          </Field>
          <SubmitButton className="w-full">Send reset link</SubmitButton>
        </form>

        <p className="text-center text-sm text-slate-500">
          <Link href="/login" className="font-medium text-teal-700">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
