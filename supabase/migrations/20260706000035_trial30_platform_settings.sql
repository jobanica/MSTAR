-- ============================================================
-- PrintOS — 30-day trial, platform flag, and payment settings
--
-- Fixes the trial to 30 days, adds an is_platform flag so the
-- super-admin's HQ org is hidden from the subscriber list, and adds
-- a single-row platform_settings table for Xendit payment config
-- editable by the super admin.
-- ============================================================

-- 30-day trial on signup.
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
    (name, owner_user_id, status, subscription_status, trial_ends_at)
  values
    (trim(org_name), auth.uid(), 'active', 'trial', now() + interval '30 days')
  returning id into new_org_id;

  insert into public.profiles (user_id, organization_id, full_name, phone, role)
  values (auth.uid(), new_org_id, owner_full_name, owner_phone, 'admin');

  perform public.seed_organization_defaults(new_org_id);

  return new_org_id;
end;
$$;

revoke execute on function public.register_organization(text, text, text) from public;

-- Platform (HQ) orgs are hidden from the subscriber list.
alter table public.organizations
  add column if not exists is_platform boolean not null default false;

-- Reset-trial defaults to 30 days now.
create or replace function public.admin_reset_trial(p_org uuid, p_days int default 30)
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
  if p_days is null or p_days < 0 or p_days > 3650 then
    raise exception 'invalid days';
  end if;
  update public.organizations
     set trial_ends_at = now() + make_interval(days => p_days),
         subscription_status = 'trial',
         status = 'active',
         updated_at = now()
   where id = p_org
  returning trial_ends_at into new_end;
  return new_end;
end;
$$;

-- Hide platform orgs from the subscriber listing.
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
    and coalesce(o.is_platform, false) = false
  order by o.created_at;
$$;

-- ------------------------------------------------------------
-- platform_settings — single row, super-admin editable payment config
-- ------------------------------------------------------------
create table if not exists public.platform_settings (
  id                  int primary key default 1,
  xendit_secret_key   text,
  xendit_webhook_token text,
  price_amount        int not null default 5,
  currency            text not null default 'USD',
  updated_at          timestamptz default now(),
  constraint platform_settings_singleton check (id = 1)
);

insert into public.platform_settings (id) values (1)
  on conflict (id) do nothing;

alter table public.platform_settings enable row level security;

create policy "platform_settings_super_admin" on public.platform_settings
  for all using (public.user_role() = 'super_admin');
