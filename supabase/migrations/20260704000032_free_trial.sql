-- ============================================================
-- PrintOS — Phase 28: 30-day free trial
--
-- New shops start on a 30-day trial. Adds trial_ends_at and a
-- 'trialing' subscription status, sets it on signup, and backfills
-- existing non-paying shops.
-- ============================================================

alter table public.organizations add column if not exists trial_ends_at timestamptz;

-- Allow 'trialing' as a subscription status.
alter table public.organizations
  drop constraint if exists organizations_subscription_status_check;
alter table public.organizations
  add constraint organizations_subscription_status_check
  check (subscription_status in ('active','trialing','past_due','cancelled','inactive'));

-- Re-declare register_organization (from phase 24) so new shops start
-- their 30-day trial immediately.
create or replace function public.register_organization(
  org_name text,
  owner_full_name text default null,
  owner_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if org_name is null or length(trim(org_name)) = 0 then
    raise exception 'organization name is required';
  end if;

  if exists (select 1 from public.profiles where user_id = auth.uid()) then
    raise exception 'user already belongs to an organization';
  end if;

  insert into public.organizations
    (name, slug, owner_user_id, status, subscription_status, trial_ends_at)
  values
    (trim(org_name), public.generate_org_slug(trim(org_name)), auth.uid(),
     'active', 'trialing', now() + interval '30 days')
  returning id into new_org_id;

  insert into public.profiles (user_id, organization_id, full_name, phone, role)
  values (auth.uid(), new_org_id, owner_full_name, owner_phone, 'admin');

  perform public.seed_organization_defaults(new_org_id);

  return new_org_id;
end;
$$;

revoke execute on function public.register_organization(text, text, text) from public;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.register_organization(text, text, text) to authenticated;
  end if;
end;
$$;

-- Give existing shops that haven't subscribed a fresh 30-day trial.
update public.organizations
set subscription_status = 'trialing',
    trial_ends_at = now() + interval '30 days'
where subscription_status <> 'active'
  and trial_ends_at is null;
