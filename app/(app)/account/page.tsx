import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { changePassword } from "@/app/actions/auth";
import { PageHeader } from "@/components/PageHeader";
import { PasswordField } from "@/components/PasswordField";
import { SubmitButton } from "@/components/SubmitButton";
import { ErrorNote } from "@/components/FormField";
import { statusLabel } from "@/lib/format";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; changed?: string }>;
}) {
  const { error, changed } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <>
      <PageHeader title="My Account" breadcrumb={["Account"]} />

      <div className="max-w-lg space-y-6">
        <ErrorNote message={error} />
        {changed && (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            ✓ Password updated.
          </p>
        )}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold">Profile</h2>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Name</span>
              <span className="font-medium">{profile?.full_name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Email</span>
              <span className="font-medium">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Role</span>
              <span className="font-medium">{statusLabel(profile?.role ?? "—")}</span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold">Change password</h2>
          <p className="mb-4 text-xs text-slate-400">
            Set a new password for your account. Use at least 6 characters.
          </p>
          <form action={changePassword} className="space-y-4">
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                New password
              </span>
              <PasswordField name="password" required autoComplete="new-password" />
            </div>
            <div>
              <span className="mb-1 block text-sm font-medium text-slate-700">
                Confirm new password
              </span>
              <PasswordField name="confirm" required autoComplete="new-password" />
            </div>
            <SubmitButton>Update password</SubmitButton>
          </form>
        </section>
      </div>
    </>
  );
}
