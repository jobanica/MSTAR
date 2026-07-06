-- ============================================================
-- PrintOS — Manual balances (opening / legacy collectibles)
-- Table: manual_balances
--
-- For balances a shop already carries for existing customers
-- that were never tracked through orders/invoices. These roll up
-- into the Balances & Collectibles totals alongside open invoices.
-- ============================================================

create table public.manual_balances (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id     uuid not null references public.customers(id) on delete cascade,
  description     text,
  amount_centavos      int not null default 0,   -- original balance owed
  amount_paid_centavos int not null default 0,   -- collected so far
  due_date        date,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create index manual_balances_customer_idx on public.manual_balances(customer_id);
create index manual_balances_org_idx on public.manual_balances(organization_id);

alter table public.manual_balances enable row level security;

create policy "manual_balances_read_own_org" on public.manual_balances
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "manual_balances_write_admin_sales" on public.manual_balances
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','super_admin')
  );
