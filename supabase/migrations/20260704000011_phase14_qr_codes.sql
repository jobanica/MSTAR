-- ============================================================
-- PrintOS — Phase 14: QR Job Tracking
-- Tables: qr_codes
-- ============================================================

-- ------------------------------------------------------------
-- 32. qr_codes — one QR code per order, generated on order creation
-- ------------------------------------------------------------
create table public.qr_codes (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id        uuid not null references public.orders(id) on delete cascade,
  qr_data         text not null,       -- the URL encoded in the QR
  storage_path    text,                -- Supabase Storage path for QR image
  public_url      text,
  created_at      timestamptz default now(),
  unique(order_id)
);

alter table public.qr_codes enable row level security;

create policy "qr_codes_read_own_org" on public.qr_codes
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "qr_codes_write_admin_sales" on public.qr_codes
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','super_admin')
  );

-- Customer sees the QR for their own orders via portal
create policy "qr_codes_customer_read_own" on public.qr_codes
  for select using (order_id in (select public.user_order_ids()));
