-- ============================================================
-- PrintOS — Phase 9: Delivery & Pickup Management
-- Tables: deliveries
-- ============================================================

-- ------------------------------------------------------------
-- 19. deliveries — delivery details for orders marked "For Delivery"
-- ------------------------------------------------------------
create table public.deliveries (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id        uuid not null references public.orders(id) on delete cascade,
  delivery_address text,
  city            text,
  rider_name      text,
  tracking_number text,
  notes           text,
  fee_centavos    int default 0,
  dispatched_at   timestamptz,
  delivered_at    timestamptz,
  status          text not null default 'pending'
                    check (status in (
                      'pending','out_for_delivery','delivered','failed'
                    )),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.deliveries enable row level security;

create policy "deliveries_read_own_org" on public.deliveries
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "deliveries_write_admin_sales" on public.deliveries
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','super_admin')
  );

-- Customer tracks deliveries of their own orders via portal
create policy "deliveries_customer_read_own" on public.deliveries
  for select using (order_id in (select public.user_order_ids()));
