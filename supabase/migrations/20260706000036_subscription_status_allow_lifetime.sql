-- ============================================================
-- PrintOS — allow 'trial' and 'lifetime' subscription statuses
--
-- The original check only allowed active/trialing/past_due/
-- cancelled/inactive. The trial + $5 lifetime plan uses 'trial'
-- and 'lifetime', so widen the constraint.
-- ============================================================

alter table public.organizations
  drop constraint if exists organizations_subscription_status_check;

alter table public.organizations
  add constraint organizations_subscription_status_check
  check (subscription_status = any (array[
    'active','trialing','trial','past_due','cancelled','inactive','lifetime'
  ]));
