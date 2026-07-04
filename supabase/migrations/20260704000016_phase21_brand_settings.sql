-- ============================================================
-- PrintOS — Phase 21: White-Label Customization
-- Tables: brand_settings
-- ============================================================

-- ------------------------------------------------------------
-- 33. brand_settings — one record per org; controls how their
-- portal and PDFs look (seeded on org creation)
-- ------------------------------------------------------------
create table public.brand_settings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  logo_path       text,              -- Supabase Storage path
  logo_url        text,              -- public URL
  primary_color   text default '#6366f1',   -- hex color
  secondary_color text default '#f1f5f9',
  sms_sender_name text,              -- max 11 chars (Semaphore limit)
  portal_tagline  text,
  invoice_footer  text,              -- e.g. "Thank you for your business!"
  updated_at      timestamptz default now(),
  unique(organization_id)
);

alter table public.brand_settings enable row level security;

-- All org users (staff and portal customers) see branding
create policy "brand_settings_read_own_org" on public.brand_settings
  for select using (organization_id = public.user_organization_id());

create policy "brand_settings_write_admin" on public.brand_settings
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','super_admin')
  );
