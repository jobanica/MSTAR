-- ============================================================
-- PrintOS — Phase 18: Staff Task Assignment & Notifications
-- Tables: staff_assignments, notifications
-- ============================================================

-- ------------------------------------------------------------
-- 30. staff_assignments — tracks job assignments per order
-- ------------------------------------------------------------
create table public.staff_assignments (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id        uuid not null references public.orders(id) on delete cascade,
  assigned_to     uuid not null references public.profiles(id),
  assigned_by     uuid references public.profiles(id),
  role_context    text,    -- e.g. 'designer', 'operator'
  notes           text,
  is_active       boolean default true,
  assigned_at     timestamptz default now()
);

alter table public.staff_assignments enable row level security;

create policy "staff_assignments_read_own_org" on public.staff_assignments
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "staff_assignments_write_admin_sales" on public.staff_assignments
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','super_admin')
  );

-- ------------------------------------------------------------
-- 31. notifications — in-app notification bell
-- ------------------------------------------------------------
create table public.notifications (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id         uuid not null references auth.users(id),
  order_id        uuid references public.orders(id),
  type            text not null,
  -- types:
  -- 'job_assigned', 'revision_requested', 'file_routed',
  -- 'job_done', 'new_message', 'file_approved',
  -- 'low_stock', 'payment_received', 'subscription_alert'
  title           text not null,
  body            text,
  is_read         boolean default false,
  read_at         timestamptz,
  created_at      timestamptz default now()
);

alter table public.notifications enable row level security;

-- Each user only reads their own notifications
create policy "notifications_read_own" on public.notifications
  for select using (user_id = auth.uid());

-- Users can mark their own notifications read
create policy "notifications_update_own" on public.notifications
  for update using (user_id = auth.uid());

-- Notification creation is done by the backend via the service role,
-- which bypasses RLS — no insert policy needed.
