-- ============================================================
-- PrintOS — Phase 17: Loyalty & Repeat Customer Perks
-- Tables: loyalty_settings, loyalty_transactions
-- ============================================================

-- ------------------------------------------------------------
-- 28. loyalty_settings — points configuration per org
-- (Admin sets the rules; seeded on org creation)
-- ------------------------------------------------------------
create table public.loyalty_settings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  points_per_peso numeric(6,2) default 1,    -- ₱1 spent = 1 point
  redeem_rate     numeric(6,2) default 1,    -- 1 point = ₱1 discount
  milestone_orders int default 10,           -- every Nth order gets a reward
  milestone_reward_description text,         -- e.g. "Free lamination upgrade"
  is_active       boolean default true,
  updated_at      timestamptz default now(),
  unique(organization_id)
);

alter table public.loyalty_settings enable row level security;

create policy "loyalty_settings_read_own_org" on public.loyalty_settings
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "loyalty_settings_write_admin" on public.loyalty_settings
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','super_admin')
  );

-- ------------------------------------------------------------
-- 29. loyalty_transactions — points earned/redeemed per customer
-- ------------------------------------------------------------
create table public.loyalty_transactions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id     uuid not null references public.customers(id),
  order_id        uuid references public.orders(id),
  transaction_type text not null
                    check (transaction_type in ('earned','redeemed','adjusted','expired')),
  points          int not null,           -- positive = earned, negative = redeemed
  balance_after   int not null,
  notes           text,
  performed_by    uuid references public.profiles(id),
  created_at      timestamptz default now()
);

alter table public.loyalty_transactions enable row level security;

create policy "loyalty_transactions_read_own_org" on public.loyalty_transactions
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "loyalty_transactions_write_admin_sales" on public.loyalty_transactions
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','super_admin')
  );

-- Customer sees their own points history via portal
create policy "loyalty_transactions_customer_read_own" on public.loyalty_transactions
  for select using (customer_id in (select public.user_customer_ids()));
