-- ============================================================
-- PrintOS — Phase 25: Editable shop website + portfolio
--
-- Adds owner-editable website content and a portfolio ("sample
-- jobs") gallery for each shop's public site at /s/<slug>.
--   1. site_content  — one row per org: hero + about copy, toggles
--   2. portfolio_items — uploaded sample jobs (image + title)
--   3. site-media public storage bucket + policy
--   4. Public read RPCs so anonymous visitors can render it all
-- ============================================================

-- ------------------------------------------------------------
-- 1. site_content — editable copy for the public site
-- ------------------------------------------------------------
create table if not exists public.site_content (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  hero_headline    text,
  hero_subheadline text,
  about_title      text,
  about_body       text,
  show_services    boolean not null default true,
  show_portfolio   boolean not null default true,
  updated_at       timestamptz default now(),
  unique(organization_id)
);

alter table public.site_content enable row level security;

create policy "site_content_read_own_org" on public.site_content
  for select using (organization_id = public.user_organization_id());

create policy "site_content_write_admin" on public.site_content
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','super_admin')
  );

-- ------------------------------------------------------------
-- 2. portfolio_items — "sample jobs we've done"
-- ------------------------------------------------------------
create table if not exists public.portfolio_items (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations(id) on delete cascade,
  title            text not null,
  category         text,
  description      text,
  image_path       text,
  image_url        text,
  sort_order       int default 0,
  is_published     boolean not null default true,
  created_at       timestamptz default now()
);

create index if not exists portfolio_items_org_idx
  on public.portfolio_items(organization_id, sort_order, created_at);

alter table public.portfolio_items enable row level security;

create policy "portfolio_read_own_org" on public.portfolio_items
  for select using (organization_id = public.user_organization_id());

create policy "portfolio_write_admin" on public.portfolio_items
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','super_admin')
  );

-- ------------------------------------------------------------
-- 3. site-media public storage bucket (portfolio images, etc.)
--    First path segment is the org id, matching the RLS below.
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('site-media', 'site-media', true)
on conflict (id) do nothing;

do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'storage' and table_name = 'objects'
  ) and exists (
    select 1 from pg_roles where rolname = 'authenticated'
  ) then
    execute $p$
      create policy "printos_staff_manage_site_media" on storage.objects
        for all to authenticated
        using (
          bucket_id = 'site-media'
          and (storage.foldername(name))[1] = public.user_organization_id()::text
          and public.user_is_staff()
        )
        with check (
          bucket_id = 'site-media'
          and (storage.foldername(name))[1] = public.user_organization_id()::text
          and public.user_is_staff()
        )
    $p$;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 4. Seed a site_content row for every org (existing + future)
-- ------------------------------------------------------------
insert into public.site_content (organization_id)
select id from public.organizations
on conflict (organization_id) do nothing;

-- Extend seed_organization_defaults so new shops get a row too.
create or replace function public.seed_organization_defaults(org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.kanban_stages (organization_id, name, slug, sort_order, is_terminal) values
    (org_id, 'New Order',           'new',                0, false),
    (org_id, 'Design / Prepress',   'design',             1, false),
    (org_id, 'For Revision',        'revision',           2, false),
    (org_id, 'Approved',            'approved',           3, false),
    (org_id, 'Sent to Production',  'sent_to_production', 4, false),
    (org_id, 'Printing',            'printing',           5, false),
    (org_id, 'Done',                'done',               6, false),
    (org_id, 'Ready for Pickup',    'ready',              7, false),
    (org_id, 'Completed',           'completed',          8, true)
  on conflict (organization_id, slug) do nothing;

  insert into public.departments (organization_id, name, color_hex)
  select org_id, 'Tarpaulin', '#f59e0b'
  where not exists (
    select 1 from public.departments
    where organization_id = org_id and name = 'Tarpaulin'
  );

  insert into public.sms_settings (organization_id, event_type, is_active) values
    (org_id, 'order_confirmed',   true),
    (org_id, 'file_ready',        true),
    (org_id, 'revision_ready',    true),
    (org_id, 'ready_for_pickup',  true),
    (org_id, 'out_for_delivery',  true),
    (org_id, 'invoice_generated', true)
  on conflict (organization_id, event_type) do nothing;

  insert into public.loyalty_settings (organization_id) values (org_id)
  on conflict (organization_id) do nothing;

  insert into public.brand_settings (organization_id) values (org_id)
  on conflict (organization_id) do nothing;

  insert into public.site_content (organization_id) values (org_id)
  on conflict (organization_id) do nothing;

  insert into public.integration_settings (organization_id, integration) values
    (org_id, 'facebook_messenger'),
    (org_id, 'gcash_payment_link'),
    (org_id, 'maya_payment_link'),
    (org_id, 'google_drive'),
    (org_id, 'canva')
  on conflict (organization_id, integration) do nothing;
end;
$$;

-- ------------------------------------------------------------
-- 5. Public read RPCs (rebuild site RPC with content columns)
-- ------------------------------------------------------------
drop function if exists public.public_site_by_slug(text);
create function public.public_site_by_slug(p_slug text)
returns table (
  organization_id  uuid,
  name             text,
  tagline          text,
  logo_url         text,
  primary_color    text,
  secondary_color  text,
  city             text,
  address          text,
  contact_phone    text,
  contact_email    text,
  hero_headline    text,
  hero_subheadline text,
  about_title      text,
  about_body       text,
  show_services    boolean,
  show_portfolio   boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select o.id,
         o.name,
         b.portal_tagline,
         b.logo_url,
         coalesce(b.primary_color, '#0369a1'),
         coalesce(b.secondary_color, '#f1f5f9'),
         o.city,
         o.address,
         o.contact_phone,
         o.contact_email,
         sc.hero_headline,
         sc.hero_subheadline,
         sc.about_title,
         sc.about_body,
         coalesce(sc.show_services, true),
         coalesce(sc.show_portfolio, true)
  from public.organizations o
  left join public.brand_settings b on b.organization_id = o.id
  left join public.site_content  sc on sc.organization_id = o.id
  where o.slug = lower(trim(p_slug))
    and o.status = 'active';
$$;

-- Published portfolio items for a shop's site.
create or replace function public.public_site_portfolio(p_slug text)
returns table (
  title       text,
  category    text,
  description text,
  image_url   text
)
language sql
stable
security definer
set search_path = public
as $$
  select p.title, p.category, p.description, p.image_url
  from public.portfolio_items p
  join public.organizations o on o.id = p.organization_id
  where o.slug = lower(trim(p_slug))
    and o.status = 'active'
    and p.is_published = true
    and p.image_url is not null
  order by p.sort_order, p.created_at desc;
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function public.public_site_by_slug(text)   to anon;
    grant execute on function public.public_site_portfolio(text) to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.public_site_by_slug(text)   to authenticated;
    grant execute on function public.public_site_portfolio(text) to authenticated;
  end if;
end;
$$;
