-- ============================================================
-- PrintOS — Quote line items (multiple jobs per quote)
--
-- Mirrors order_items. A quote's subtotal is the sum of its items;
-- the quotes header row keeps a summary job_type for lists.
-- ============================================================

create table public.quote_items (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  quote_id            uuid not null references public.quotes(id) on delete cascade,
  description         text not null,
  qty                 int not null default 1,
  unit_price_centavos int not null default 0,
  total_centavos      int not null default 0,
  created_at          timestamptz default now()
);

create index if not exists quote_items_quote_id_idx on public.quote_items (quote_id);
create index if not exists quote_items_organization_id_idx on public.quote_items (organization_id);

alter table public.quote_items enable row level security;

create policy "quote_items_read_own_org" on public.quote_items
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "quote_items_write_admin_sales" on public.quote_items
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','super_admin')
  );

-- Customer can read line items for their own quotes (portal)
create policy "quote_items_customer_read_own" on public.quote_items
  for select using (
    quote_id in (
      select id from public.quotes
      where customer_id in (select public.user_customer_ids())
    )
  );
