-- ============================================================
-- PrintOS — Super-admin subscriber management
--
-- Platform owner (role = super_admin) can list every subscriber
-- organization and grant free months (extends trial_ends_at).
-- These are SECURITY DEFINER so they cross org boundaries, but each
-- one hard-checks that the caller is a super_admin.
-- ============================================================

-- Ensure the subscription columns exist (present on live; this keeps the
-- repo migrations self-consistent for fresh databases).
alter table public.organizations
  add column if not exists trial_ends_at timestamptz,
  add column if not exists subscription_status text default 'inactive',
  add column if not exists status text default 'pending';

-- List all subscriber orgs with subscription info + basic usage counts.
create or replace function public.admin_list_subscribers()
returns table (
  id                  uuid,
  name                text,
  status              text,
  subscription_status text,
  trial_ends_at       timestamptz,
  created_at          timestamptz,
  owner_email         text,
  order_count         bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.name, o.status, o.subscription_status,
         o.trial_ends_at, o.created_at,
         u.email as owner_email,
         (select count(*) from public.orders od where od.organization_id = o.id) as order_count
  from public.organizations o
  left join auth.users u on u.id = o.owner_user_id
  where public.user_role() = 'super_admin'
  order by o.created_at;
$$;

-- Give a subscriber N free months. Extends from the later of "now" or the
-- current trial end, so repeated grants stack. Marks them active/trial.
create or replace function public.admin_grant_free_months(p_org uuid, p_months int)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  new_end timestamptz;
begin
  if public.user_role() <> 'super_admin' then
    raise exception 'not authorized';
  end if;
  if p_months is null or p_months < 0 or p_months > 120 then
    raise exception 'invalid months';
  end if;

  update public.organizations
     set trial_ends_at = greatest(coalesce(trial_ends_at, now()), now())
                         + make_interval(months => p_months),
         subscription_status = 'trial',
         status = 'active',
         updated_at = now()
   where id = p_org
  returning trial_ends_at into new_end;

  return new_end;
end;
$$;

-- Set a subscriber's free period to exactly N months from today (or 0 to end
-- the free period immediately).
create or replace function public.admin_set_free_months(p_org uuid, p_months int)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  new_end timestamptz;
begin
  if public.user_role() <> 'super_admin' then
    raise exception 'not authorized';
  end if;
  if p_months is null or p_months < 0 or p_months > 120 then
    raise exception 'invalid months';
  end if;

  update public.organizations
     set trial_ends_at = case when p_months = 0 then now()
                              else now() + make_interval(months => p_months) end,
         subscription_status = case when p_months = 0 then 'inactive' else 'trial' end,
         status = case when p_months = 0 then 'suspended' else 'active' end,
         updated_at = now()
   where id = p_org
  returning trial_ends_at into new_end;

  return new_end;
end;
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.admin_list_subscribers() to authenticated;
    grant execute on function public.admin_grant_free_months(uuid, int) to authenticated;
    grant execute on function public.admin_set_free_months(uuid, int) to authenticated;
  end if;
end;
$$;
