-- ============================================================
-- PrintOS — Phase 10: SMS Notifications (Semaphore)
-- Tables: sms_logs, sms_settings
-- ============================================================

-- ------------------------------------------------------------
-- 20. sms_logs — full log of every SMS sent
-- ------------------------------------------------------------
create table public.sms_logs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id        uuid references public.orders(id),
  customer_id     uuid references public.customers(id),
  phone_number    text not null,
  message_content text not null,
  event_type      text not null,
  -- event types:
  -- 'order_confirmed', 'file_ready', 'revision_ready',
  -- 'ready_for_pickup', 'out_for_delivery', 'invoice_generated'
  semaphore_message_id text,
  status          text not null default 'pending'
                    check (status in ('pending','sent','failed','delivered')),
  sent_at         timestamptz,
  error_message   text,
  created_at      timestamptz default now()
);

alter table public.sms_logs enable row level security;

create policy "sms_logs_read_own_org" on public.sms_logs
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

-- Sending (inserts/status updates) is done by the backend via the
-- service role, which bypasses RLS — no write policy needed.

-- ------------------------------------------------------------
-- 21. sms_settings — per-org toggle for which SMS events are active
-- (seeded on org creation with all events set to true)
-- ------------------------------------------------------------
create table public.sms_settings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  event_type      text not null,
  is_active       boolean not null default true,
  updated_at      timestamptz default now(),
  unique(organization_id, event_type)
);

alter table public.sms_settings enable row level security;

create policy "sms_settings_read_own_org" on public.sms_settings
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "sms_settings_write_admin" on public.sms_settings
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','super_admin')
  );
