-- ============================================================
-- PrintOS — Phase 27: Platform billing (shop subscriptions)
--
-- Shops pay a monthly platform fee: a base plan plus a per-branch
-- add-on. Pricing lives in the app (lib/billing.ts); this table
-- records the monthly invoices and their payment status.
-- ============================================================

create table if not exists public.subscription_invoices (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  period_start        date not null,
  period_end          date not null,
  base_centavos       int not null default 250000,   -- ₱2,500 base plan
  additional_branches int not null default 0,
  per_branch_centavos int not null default 50000,    -- ₱500 / extra branch
  total_centavos      int not null,
  status              text not null default 'unpaid'
                        check (status in ('unpaid','paid','void')),
  method              text,
  reference           text,
  paid_at             timestamptz,
  created_at          timestamptz default now(),
  unique(organization_id, period_start)
);

create index if not exists subscription_invoices_org_idx
  on public.subscription_invoices(organization_id, period_start desc);

alter table public.subscription_invoices enable row level security;

create policy "subscription_invoices_read_own_org" on public.subscription_invoices
  for select using (organization_id = public.user_organization_id());

create policy "subscription_invoices_write_admin" on public.subscription_invoices
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','super_admin')
  );
