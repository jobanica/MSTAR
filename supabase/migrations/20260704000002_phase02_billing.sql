-- ============================================================
-- PrintOS — Phase 2: Subscription & Billing (Xendit)
-- Tables: subscriptions, xendit_payment_events
-- ============================================================

-- ------------------------------------------------------------
-- 4. subscriptions — one active subscription per organization
-- ------------------------------------------------------------
create table public.subscriptions (
  id                    uuid primary key default gen_random_uuid(),
  organization_id       uuid not null references public.organizations(id) on delete cascade,
  xendit_invoice_id     text,
  xendit_recurring_id   text,
  status                text not null default 'inactive'
                          check (status in ('active','past_due','cancelled','inactive')),
  amount_centavos       int not null default 250000,  -- ₱2,500 = 250000 centavos
  billing_cycle         text default 'monthly',
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancelled_at          timestamptz,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now(),
  unique(organization_id)
);

alter table public.subscriptions enable row level security;

create policy "subscriptions_read_own_org" on public.subscriptions
  for select using (organization_id = public.user_organization_id());

-- Writes happen only via the service role (Xendit webhook handler /
-- backend billing logic), which bypasses RLS — no write policy needed.

-- ------------------------------------------------------------
-- 5. xendit_payment_events — raw Xendit webhook log (audit trail,
-- never delete rows)
-- ------------------------------------------------------------
create table public.xendit_payment_events (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id),
  event_type      text not null,   -- e.g. 'invoice.paid', 'invoice.expired'
  xendit_id       text not null,   -- Xendit's own ID for the event
  payload         jsonb not null,  -- full raw webhook payload
  processed       boolean default false,
  created_at      timestamptz default now()
);

alter table public.xendit_payment_events enable row level security;

-- Read only by admins of that org; inserts only via service role
-- (backend webhook handler).
create policy "xendit_events_read_admin" on public.xendit_payment_events
  for select using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','super_admin')
  );
