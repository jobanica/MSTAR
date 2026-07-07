"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/dashboard");
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const orgName = String(formData.get("org_name") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const invite = String(formData.get("invite") ?? "").trim();

  // Two signup modes: creating a new shop (needs org name), or joining
  // an existing shop via an invite token.
  const back = invite ? `/signup?invite=${invite}` : "/signup";
  if (!invite && !orgName) {
    redirect(`${back}&error=${encodeURIComponent("Print shop name is required")}`.replace("signup&", "signup?"));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // Stored in user metadata so the org can be provisioned/joined on
    // first login too (if email confirmation is enabled, no session here).
    options: {
      data: invite
        ? { invite_token: invite, full_name: fullName }
        : { org_name: orgName, full_name: fullName },
    },
  });

  if (error) {
    redirect(`${back}${invite ? "&" : "?"}error=${encodeURIComponent(error.message)}`);
  }

  if (data.session) {
    if (invite) {
      const { error: rpcError } = await supabase.rpc("accept_invitation", {
        p_token: invite,
        p_full_name: fullName || null,
      });
      if (rpcError && !rpcError.message.includes("already belongs")) {
        redirect(`${back}&error=${encodeURIComponent(rpcError.message)}`);
      }
    } else {
      const { error: rpcError } = await supabase.rpc("register_organization", {
        org_name: orgName,
        owner_full_name: fullName || null,
      });
      if (rpcError && !rpcError.message.includes("already belongs")) {
        redirect(`/signup?error=${encodeURIComponent(rpcError.message)}`);
      }
    }
    redirect("/dashboard");
  }

  redirect(
    `/login?message=${encodeURIComponent("Check your email to confirm your account, then sign in.")}`,
  );
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();

  const base =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://mstar-orpin.vercel.app";
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${base}/reset-password`,
  });

  // Always report success so we don't reveal which emails have accounts.
  redirect(
    `/forgot-password?message=${encodeURIComponent(
      "If that email has an account, a password reset link is on its way.",
    )}`,
  );
}

export async function changePassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 6) {
    redirect(`/account?error=${encodeURIComponent("Password must be at least 6 characters.")}`);
  }
  if (password !== confirm) {
    redirect(`/account?error=${encodeURIComponent("Passwords do not match.")}`);
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/account?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/account?changed=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
