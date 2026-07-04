-- ============================================================
-- PrintOS — Phase 3: Order Intake, Quoting & Job Templates
-- Tables: customers, job_templates, quotes, orders, order_items
-- Also: portal-customer helper functions used by later phases
-- ============================================================

-- ------------------------------------------------------------
-- 6. customers — the printing shop's customers
-- (not PrintOS subscribers — those are in profiles)
-- ------------------------------------------------------------
create table public.customers (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name       text not null,
  email           text,
  phone           text,
  address         text,
  city            text,
  notes           text,
  portal_user_id  uuid references auth.users(id),  -- if customer has portal login
  total_spend_centavos  int default 0,
  total_orders    int default 0,
  loyalty_points  int default 0,
  average_rating  numeric(3,2),  -- computed from feedback table
  is_active       boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- ------------------------------------------------------------
-- 7. job_templates — saved reusable job configurations per org
-- ------------------------------------------------------------
create table public.job_templates (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,           -- e.g. "Standard Tarpaulin 4x8"
  job_type        text not null,           -- e.g. "Tarpaulin"
  department_id   uuid references public.departments(id),
  specs           jsonb not null default '{}',
  -- specs example:
  -- { "width": 4, "height": 8, "unit": "ft", "material": "vinyl",
  --   "finishing": "eyelets", "qty": 1 }
  base_price_centavos int,
  is_active       boolean default true,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz default now()
);

-- ------------------------------------------------------------
-- 8. quotes — pre-order quotations, convert to an order on approval
-- ------------------------------------------------------------
create table public.quotes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_number    text not null,           -- e.g. "Q-2024-0001"
  customer_id     uuid not null references public.customers(id),
  template_id     uuid references public.job_templates(id),
  job_type        text not null,
  department_id   uuid references public.departments(id),
  specs           jsonb not null default '{}',
  qty             int not null default 1,
  rush            boolean default false,
  due_date        date,
  notes           text,
  subtotal_centavos   int not null default 0,
  discount_centavos   int default 0,
  total_centavos      int not null default 0,
  status          text not null default 'draft'
                    check (status in ('draft','sent','approved','expired','converted')),
  valid_until     date,
  converted_to_order_id uuid,          -- FK added below, after orders exists
  created_by      uuid references public.profiles(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(organization_id, quote_number)
);

-- ------------------------------------------------------------
-- 9. orders — confirmed jobs, core table of the system
-- (kanban_stage_id FK is added in the Phase 7 migration, once
--  kanban_stages exists)
-- ------------------------------------------------------------
create table public.orders (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_number    text not null,           -- e.g. "ORD-2024-0001"
  customer_id     uuid not null references public.customers(id),
  quote_id        uuid references public.quotes(id),
  template_id     uuid references public.job_templates(id),
  job_type        text not null,
  department_id   uuid references public.departments(id),
  specs           jsonb not null default '{}',
  qty             int not null default 1,
  rush            boolean default false,
  due_date        date,
  notes           text,
  internal_notes  text,                    -- staff-only notes
  delivery_type   text not null default 'pickup'
                    check (delivery_type in ('pickup','delivery')),
  kanban_stage_id uuid,
  assigned_designer_id  uuid references public.profiles(id),
  assigned_operator_id  uuid references public.profiles(id),
  subtotal_centavos     int not null default 0,
  delivery_fee_centavos int default 0,
  discount_centavos     int default 0,
  total_centavos        int not null default 0,
  payment_status  text not null default 'unpaid'
                    check (payment_status in ('unpaid','partial','paid')),
  status          text not null default 'new'
                    check (status in (
                      'new','design','revision','approved',
                      'sent_to_production','printing','done',
                      'ready','completed','cancelled'
                    )),
  completed_at    timestamptz,
  cancelled_at    timestamptz,
  cancelled_reason text,
  reordered_from  uuid references public.orders(id),  -- if this is a reorder
  created_by      uuid references public.profiles(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(organization_id, order_number)
);

-- Now that orders exists, wire up the quote → order conversion FK
alter table public.quotes
  add constraint quotes_converted_to_order_id_fkey
  foreign key (converted_to_order_id) references public.orders(id);

-- ------------------------------------------------------------
-- 10. order_items — line items per order (for itemized invoicing)
-- ------------------------------------------------------------
create table public.order_items (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id        uuid not null references public.orders(id) on delete cascade,
  description     text not null,
  qty             int not null default 1,
  unit_price_centavos int not null,
  total_centavos  int not null,
  created_at      timestamptz default now()
);

-- ------------------------------------------------------------
-- Portal-customer helper functions (security definer, so they can
-- be used inside RLS policies without recursive policy evaluation)
-- ------------------------------------------------------------

-- Customer records linked to the currently logged-in portal user
create or replace function public.user_customer_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.customers where portal_user_id = auth.uid();
$$;

-- Orders belonging to the currently logged-in portal customer
create or replace function public.user_order_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select o.id
  from public.orders o
  join public.customers c on c.id = o.customer_id
  where c.portal_user_id = auth.uid();
$$;

-- ------------------------------------------------------------
-- RLS: customers
-- ------------------------------------------------------------
alter table public.customers enable row level security;

create policy "customers_read_own_org" on public.customers
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "customers_write_sales_admin" on public.customers
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','super_admin')
  );

-- Customer can read their own record via portal
create policy "customer_read_own" on public.customers
  for select using (portal_user_id = auth.uid());

-- ------------------------------------------------------------
-- RLS: job_templates — readable by all org members, writable by
-- admin/sales
-- ------------------------------------------------------------
alter table public.job_templates enable row level security;

create policy "job_templates_read_own_org" on public.job_templates
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "job_templates_write_admin_sales" on public.job_templates
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','super_admin')
  );

-- ------------------------------------------------------------
-- RLS: quotes — staff read, admin/sales write, customer reads their
-- own quotes via portal
-- ------------------------------------------------------------
alter table public.quotes enable row level security;

create policy "quotes_read_own_org" on public.quotes
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "quotes_write_admin_sales" on public.quotes
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','super_admin')
  );

create policy "quotes_customer_read_own" on public.quotes
  for select using (customer_id in (select public.user_customer_ids()));

-- ------------------------------------------------------------
-- RLS: orders — all staff read own org, admin/sales write,
-- customer reads their own orders via portal
-- ------------------------------------------------------------
alter table public.orders enable row level security;

create policy "orders_read_own_org" on public.orders
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "orders_write_admin_sales" on public.orders
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','super_admin')
  );

-- Assigned designer/operator can update their own orders
-- (status changes as work progresses)
create policy "orders_update_assigned_staff" on public.orders
  for update using (
    organization_id = public.user_organization_id()
    and (
      assigned_designer_id in (select id from public.profiles where user_id = auth.uid())
      or assigned_operator_id in (select id from public.profiles where user_id = auth.uid())
    )
  );

create policy "orders_customer_read_own" on public.orders
  for select using (customer_id in (select public.user_customer_ids()));

-- ------------------------------------------------------------
-- RLS: order_items
-- ------------------------------------------------------------
alter table public.order_items enable row level security;

create policy "order_items_read_own_org" on public.order_items
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "order_items_write_admin_sales" on public.order_items
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','super_admin')
  );

create policy "order_items_customer_read_own" on public.order_items
  for select using (order_id in (select public.user_order_ids()));
