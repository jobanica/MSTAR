-- ============================================================
-- PrintOS — Phase 1: Foundation & Auth
-- Tables: organizations, departments, profiles
-- Also: shared helper functions used by RLS policies everywhere
-- ============================================================

-- ------------------------------------------------------------
-- Shared trigger function: keep updated_at fresh on every update
-- (attached to tables in 20260704000020_indexes_and_triggers.sql)
-- ------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------
-- 1. organizations — the root tenant table
-- ------------------------------------------------------------
create table public.organizations (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null,
  address             text,
  city                text,
  contact_email       text,
  contact_phone       text,
  owner_user_id       uuid references auth.users(id),
  status              text not null default 'pending'
                        check (status in ('pending','active','suspended','cancelled')),
  subscription_status text not null default 'inactive'
                        check (subscription_status in ('active','past_due','cancelled','inactive')),
  grace_period_ends_at timestamptz,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- ------------------------------------------------------------
-- 3. departments — data-driven departments for operator routing
-- (created before profiles because profiles.department_id references it)
-- ------------------------------------------------------------
create table public.departments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,           -- e.g. "Tarpaulin", "Digital Press"
  color_hex       text default '#6366f1',  -- for calendar color coding
  description     text,
  is_active       boolean default true,
  sort_order      int default 0,
  created_at      timestamptz default now()
);

-- ------------------------------------------------------------
-- 2. profiles — extends Supabase auth.users, one profile per user
-- ------------------------------------------------------------
create table public.profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name       text,
  phone           text,
  role            text not null
                    check (role in (
                      'super_admin',
                      'admin',
                      'sales',
                      'designer',
                      'operator',
                      'customer'
                    )),
  department_id   uuid references public.departments(id), -- for operators only
  avatar_url      text,
  is_active       boolean default true,
  invited_by      uuid references public.profiles(id),
  last_seen_at    timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(user_id)
);

-- ------------------------------------------------------------
-- RLS helper functions
--
-- These are SECURITY DEFINER so they read `profiles` without going
-- through its RLS policies. Referencing profiles directly inside a
-- profiles policy (as a plain subquery) causes infinite recursion in
-- Postgres RLS — these helpers are the standard Supabase fix, and
-- they keep every other table's policies short and consistent.
-- ------------------------------------------------------------
create or replace function public.user_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from public.profiles where user_id = auth.uid() limit 1;
$$;

create or replace function public.user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where user_id = auth.uid() limit 1;
$$;

create or replace function public.user_department_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select department_id from public.profiles where user_id = auth.uid() limit 1;
$$;

-- True for shop staff (everyone except portal customers)
create or replace function public.user_is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.user_role() in ('super_admin','admin','sales','designer','operator'),
    false
  );
$$;

-- ------------------------------------------------------------
-- RLS: organizations
-- ------------------------------------------------------------
alter table public.organizations enable row level security;

-- Org members can read their own org
create policy "org_members_read" on public.organizations
  for select using (id = public.user_organization_id());

-- Only owner can update
create policy "org_owner_update" on public.organizations
  for update using (owner_user_id = auth.uid());

-- Super Admin bypass + org creation are handled via the service role
-- key in the backend (service role skips RLS entirely).

-- ------------------------------------------------------------
-- RLS: profiles
-- ------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_read_own_org" on public.profiles
  for select using (organization_id = public.user_organization_id());

create policy "profiles_update_own" on public.profiles
  for update using (user_id = auth.uid());

-- Admins manage profiles in their own org (invites, deactivation)
create policy "profiles_admin_write" on public.profiles
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','super_admin')
  );

-- ------------------------------------------------------------
-- RLS: departments
-- ------------------------------------------------------------
alter table public.departments enable row level security;

create policy "departments_read_own_org" on public.departments
  for select using (organization_id = public.user_organization_id());

create policy "departments_write_admin" on public.departments
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','super_admin')
  );
