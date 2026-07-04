-- ============================================================
-- PrintOS — Phase 22: Future Integrations (Stubs)
-- Tables: integration_settings
-- ============================================================

-- ------------------------------------------------------------
-- 34. integration_settings — stub config for all future
-- integrations per org (seeded on org creation)
-- ------------------------------------------------------------
create table public.integration_settings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  integration     text not null,
  -- integrations:
  -- 'facebook_messenger', 'gcash_payment_link',
  -- 'maya_payment_link', 'google_drive', 'canva'
  is_enabled      boolean default false,
  config          jsonb default '{}',   -- integration-specific config/tokens
  last_synced_at  timestamptz,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  unique(organization_id, integration)
);

alter table public.integration_settings enable row level security;

-- Config may hold tokens — restrict reads to admins, not all staff
create policy "integration_settings_read_admin" on public.integration_settings
  for select using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','super_admin')
  );

create policy "integration_settings_write_admin" on public.integration_settings
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','super_admin')
  );
