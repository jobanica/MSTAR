-- ============================================================
-- PrintOS — Phase 16: Invoicing & Payments
-- Tables: invoices, payments
-- ============================================================

-- ------------------------------------------------------------
-- 25. invoices — generated invoices per order
-- ------------------------------------------------------------
create table public.invoices (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id        uuid not null references public.orders(id) on delete cascade,
  invoice_number  text not null,           -- e.g. "INV-2024-0001"
  subtotal_centavos   int not null default 0,
  delivery_fee_centavos int default 0,
  discount_centavos   int default 0,
  total_centavos      int not null default 0,
  amount_paid_centavos int default 0,
  payment_status  text not null default 'unpaid'
                    check (payment_status in ('unpaid','partial','paid')),
  storage_path    text,                    -- PDF path in Supabase Storage
  public_url      text,
  due_date        date,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(order_id),
  unique(organization_id, invoice_number)
);

alter table public.invoices enable row level security;

create policy "invoices_read_own_org" on public.invoices
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "invoices_write_admin_sales" on public.invoices
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','super_admin')
  );

-- Customer views invoices for their own orders via portal
create policy "invoices_customer_read_own" on public.invoices
  for select using (order_id in (select public.user_order_ids()));

-- ------------------------------------------------------------
-- 26. payments — manual payment log per invoice
-- ------------------------------------------------------------
create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invoice_id      uuid not null references public.invoices(id) on delete cascade,
  customer_id     uuid not null references public.customers(id),
  amount_centavos int not null,
  method          text not null
                    check (method in ('cash','gcash','bank_transfer','maya','other')),
  reference_number text,
  notes           text,
  paid_at         timestamptz not null default now(),
  recorded_by     uuid references public.profiles(id),
  created_at      timestamptz default now()
);

alter table public.payments enable row level security;

create policy "payments_read_own_org" on public.payments
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "payments_write_admin_sales" on public.payments
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','super_admin')
  );

-- Customer sees their own payment history via portal
create policy "payments_customer_read_own" on public.payments
  for select using (customer_id in (select public.user_customer_ids()));
