import Link from "next/link";
import { signUp } from "@/app/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorNote, Field, inputClass } from "@/components/FormField";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-indigo-600">PrintOS</h1>
          <p className="mt-1 text-sm text-slate-500">
            Set up your print shop in minutes
          </p>
        </div>

        <ErrorNote message={error} />

        <form
          action={signUp}
          className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
        >
          <Field label="Print shop name">
            <input
              name="org_name"
              required
              placeholder="e.g. Davao Prints & Tarps"
              className={inputClass}
            />
          </Field>
          <Field label="Your name">
            <input name="full_name" required className={inputClass} />
          </Field>
          <Field label="Email">
            <input name="email" type="email" required className={inputClass} />
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
          <SubmitButton className="w-full">Create account</SubmitButton>
        </form>

        <p className="text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-indigo-600">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
