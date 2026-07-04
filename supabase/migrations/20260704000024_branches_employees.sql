-- ============================================================
-- PrintOS — Branches (multi-location) & Employees (HR records)
--
-- Adds two org-scoped tables:
--   branches   — physical shop locations for a multi-branch org
--   employees  — HR employee records (may link to a login profile)
--
-- Also extends seed_organization_defaults() to create a default
-- "Main Branch", and backfills one for existing organizations.
-- ============================================================

-- ------------------------------------------------------------
-- branches
-- ------------------------------------------------------------
create table public.branches (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,           -- e.g. "Main Branch", "Cebu Downtown"
  code            text,                    -- short code e.g. "MAIN", "CEB"
  address         text,
  city            text,
  phone           text,
  is_main         boolean default false,
  is_active       boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.branches enable row level security;

create policy "branches_read_own_org" on public.branches
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "branches_write_admin" on public.branches
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','super_admin')
  );

-- ------------------------------------------------------------
-- employees — HR records (salary etc. is sensitive, so read/write
-- is restricted to admins, not all staff)
-- ------------------------------------------------------------
create table public.employees (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  branch_id       uuid references public.branches(id) on delete set null,
  department_id   uuid references public.departments(id) on delete set null,
  profile_id      uuid references public.profiles(id) on delete set null,  -- optional login link
  employee_code   text,
  full_name       text not null,
  position        text,                    -- job title, e.g. "Machine Operator"
  email           text,
  phone           text,
  address         text,
  employment_type text not null default 'full_time'
                    check (employment_type in ('full_time','part_time','contract','seasonal')),
  status          text not null default 'active'
                    check (status in ('active','on_leave','terminated')),
  hire_date       date,
  salary_centavos int,                     -- monthly salary in centavos
  emergency_contact_name  text,
  emergency_contact_phone text,
  notes           text,
  is_active       boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.employees enable row level security;

create policy "employees_read_admin" on public.employees
  for select using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','super_admin')
  );

create policy "employees_write_admin" on public.employees
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','super_admin')
  );

-- ------------------------------------------------------------
-- Indexes (the earlier auto-index migration already ran, so index
-- these new tables explicitly)
-- ------------------------------------------------------------
create index if not exists branches_organization_id_idx  on public.branches (organization_id);
create index if not exists employees_organization_id_idx on public.employees (organization_id);
create index if not exists employees_branch_id_idx       on public.employees (branch_id);
create index if not exists employees_department_id_idx   on public.employees (department_id);

-- ------------------------------------------------------------
-- updated_at triggers (the earlier trigger migration already ran)
-- ------------------------------------------------------------
create trigger set_updated_at before update on public.branches
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.employees
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Extend org seeding with a default Main Branch (idempotent)
-- ------------------------------------------------------------
create or replace function public.seed_organization_defaults(org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 0. Default main branch
  insert into public.branches (organization_id, name, code, is_main)
  select org_id, 'Main Branch', 'MAIN', true
  where not exists (
    select 1 from public.branches where organization_id = org_id and is_main = true
  );

  -- 1. Default kanban stages
  insert into public.kanban_stages (organization_id, name, slug, sort_order, is_terminal) values
    (org_id, 'New Order',           'new',                0, false),
    (org_id, 'Design / Prepress',   'design',             1, false),
    (org_id, 'For Revision',        'revision',           2, false),
    (org_id, 'Approved',            'approved',           3, false),
    (org_id, 'Sent to Production',  'sent_to_production', 4, false),
    (org_id, 'Printing',            'printing',           5, false),
    (org_id, 'Done',                'done',               6, false),
    (org_id, 'Ready for Pickup',    'ready',              7, false),
    (org_id, 'Completed',           'completed',          8, true)
  on conflict (organization_id, slug) do nothing;

  -- 2. Example department
  insert into public.departments (organization_id, name, color_hex)
  select org_id, 'Tarpaulin', '#f59e0b'
  where not exists (
    select 1 from public.departments
    where organization_id = org_id and name = 'Tarpaulin'
  );

  -- 3. SMS settings (all active by default)
  insert into public.sms_settings (organization_id, event_type, is_active) values
    (org_id, 'order_confirmed',   true),
    (org_id, 'file_ready',        true),
    (org_id, 'revision_ready',    true),
    (org_id, 'ready_for_pickup',  true),
    (org_id, 'out_for_delivery',  true),
    (org_id, 'invoice_generated', true)
  on conflict (organization_id, event_type) do nothing;

  -- 4. Default loyalty settings
  insert into public.loyalty_settings (organization_id) values (org_id)
  on conflict (organization_id) do nothing;

  -- 5. Default brand settings
  insert into public.brand_settings (organization_id) values (org_id)
  on conflict (organization_id) do nothing;

  -- 6. Integration stubs
  insert into public.integration_settings (organization_id, integration) values
    (org_id, 'facebook_messenger'),
    (org_id, 'gcash_payment_link'),
    (org_id, 'maya_payment_link'),
    (org_id, 'google_drive'),
    (org_id, 'canva')
  on conflict (organization_id, integration) do nothing;
end;
$$;

-- ------------------------------------------------------------
-- Backfill a Main Branch for existing organizations
-- ------------------------------------------------------------
insert into public.branches (organization_id, name, code, is_main)
select o.id, 'Main Branch', 'MAIN', true
from public.organizations o
where not exists (
  select 1 from public.branches b where b.organization_id = o.id and b.is_main = true
);
