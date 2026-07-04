-- ============================================================
-- PrintOS — Phase 6: In-App Messaging & Job Chat
-- Tables: messages
-- ============================================================

-- ------------------------------------------------------------
-- 17. messages — per-order chat, supports both staff-customer and
-- internal-only threads
-- ------------------------------------------------------------
create table public.messages (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id        uuid not null references public.orders(id) on delete cascade,
  sent_by         uuid references public.profiles(id),
  sent_by_customer_id uuid references public.customers(id),
  content         text,
  attachment_path text,
  attachment_name text,
  is_internal     boolean not null default false,  -- true = staff-only, hidden from customer
  read_by         uuid[] default '{}',             -- array of user_ids who read it
  created_at      timestamptz default now()
);

alter table public.messages enable row level security;

-- Staff read all messages (including internal) in their org
create policy "messages_staff_read" on public.messages
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

-- Staff send messages in their org
create policy "messages_staff_insert" on public.messages
  for insert with check (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

-- Staff update messages (e.g. read_by receipts)
create policy "messages_staff_update" on public.messages
  for update using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

-- Customer reads non-internal messages on their own orders only
create policy "messages_customer_read" on public.messages
  for select using (
    is_internal = false
    and order_id in (select public.user_order_ids())
  );

-- Customer sends non-internal messages on their own orders only
create policy "messages_customer_insert" on public.messages
  for insert with check (
    is_internal = false
    and sent_by_customer_id in (select public.user_customer_ids())
    and order_id in (select public.user_order_ids())
  );
