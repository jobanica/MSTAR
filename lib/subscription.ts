export type OrgSubscription = {
  subscription_status: string | null;
  trial_ends_at: string | null;
};

/** Lifetime = paid forever. Trial = access until trial_ends_at. */
export function hasAccess(org: OrgSubscription | null): boolean {
  if (!org) return false;
  if (org.subscription_status === "lifetime") return true;
  if (org.trial_ends_at && new Date(org.trial_ends_at).getTime() > Date.now()) {
    return true;
  }
  return false;
}

export function trialDaysLeft(trialEndsAt: string | null): number | null {
  if (!trialEndsAt) return null;
  const ms = new Date(trialEndsAt).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}
