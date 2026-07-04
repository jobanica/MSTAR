-- ============================================================
-- PrintOS — Phase 24: Per-shop public websites
--
-- Every organization automatically gets a public landing page at
-- /s/<slug>. This migration:
--   1. Adds a unique, URL-safe `slug` to organizations
--   2. Backfills slugs for existing orgs and generates one on signup
--   3. Exposes SECURITY DEFINER read RPCs (org branding + active
--      services) so anonymous visitors can render a shop's site
--      without any RLS-exposed table access.
-- ============================================================

-- ------------------------------------------------------------
-- 1. slug column + helpers
-- ------------------------------------------------------------
alter table public.organizations add column if not exists slug text;

-- Turn a shop name into a URL-safe slug ("Ace Print Co." -> "ace-print-co").
create or replace function public.slugify(p text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(p, '')), '[^a-z0-9]+', '-', 'g'));
$$;

-- Produce a slug that is unique across organizations, suffixing -2, -3…
-- on collision. `p_exclude` lets a row keep/refresh its own slug.
create or replace function public.generate_org_slug(p_name text, p_exclude uuid default null)
returns text
language plpgsql
as $$
declare
  base      text;
  candidate text;
  n         int := 1;
begin
  base := public.slugify(p_name);
  if base is null or base = '' then
    base := 'shop';
  end if;
  candidate := base;
  while exists (
    select 1 from public.organizations
    where slug = candidate
      and (p_exclude is null or id <> p_exclude)
  ) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  return candidate;
end;
$$;

-- ------------------------------------------------------------
-- 2. Backfill existing orgs + enforce uniqueness
-- ------------------------------------------------------------
do $$
declare
  r record;
begin
  for r in select id, name from public.organizations where slug is null or slug = '' loop
    update public.organizations
    set slug = public.generate_org_slug(r.name, r.id)
    where id = r.id;
  end loop;
end;
$$;

create unique index if not exists organizations_slug_key on public.organizations(slug);

-- ------------------------------------------------------------
-- 3. Set the slug automatically when a shop is registered
--    (re-declares register_organization from migration 21, now
--     also filling in the slug).
-- ------------------------------------------------------------
create or replace function public.register_organization(
  org_name text,
  owner_full_name text default null,
  owner_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if org_name is null or length(trim(org_name)) = 0 then
    raise exception 'organization name is required';
  end if;

  if exists (select 1 from public.profiles where user_id = auth.uid()) then
    raise exception 'user already belongs to an organization';
  end if;

  insert into public.organizations (name, slug, owner_user_id, status)
  values (trim(org_name), public.generate_org_slug(trim(org_name)), auth.uid(), 'active')
  returning id into new_org_id;

  insert into public.profiles (user_id, organization_id, full_name, phone, role)
  values (auth.uid(), new_org_id, owner_full_name, owner_phone, 'admin');

  perform public.seed_organization_defaults(new_org_id);

  return new_org_id;
end;
$$;

revoke execute on function public.register_organization(text, text, text) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.register_organization(text, text, text) to authenticated;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 4. Public read RPCs for the shop site (no login required)
-- ------------------------------------------------------------

-- Branding + contact info for a shop, by slug. Only active shops
-- resolve, so suspended/cancelled tenants stop serving a site.
create or replace function public.public_site_by_slug(p_slug text)
returns table (
  organization_id uuid,
  name            text,
  tagline         text,
  logo_url        text,
  primary_color   text,
  secondary_color text,
  city            text,
  address         text,
  contact_phone   text,
  contact_email   text
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
         o.contact_email
  from public.organizations o
  left join public.brand_settings b on b.organization_id = o.id
  where o.slug = lower(trim(p_slug))
    and o.status = 'active';
$$;

-- Active services shown on the shop's site as a mini catalog.
create or replace function public.public_site_services(p_slug text)
returns table (
  name                text,
  category            text,
  unit                text,
  unit_price_centavos int,
  description         text
)
language sql
stable
security definer
set search_path = public
as $$
  select s.name, s.category, s.unit, s.unit_price_centavos, s.description
  from public.services s
  join public.organizations o on o.id = s.organization_id
  where o.slug = lower(trim(p_slug))
    and o.status = 'active'
    and s.is_active = true
  order by s.category nulls last, s.name;
$$;

-- Grant to anonymous (public) + signed-in callers.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function public.public_site_by_slug(text)  to anon;
    grant execute on function public.public_site_services(text) to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.public_site_by_slug(text)  to authenticated;
    grant execute on function public.public_site_services(text) to authenticated;
  end if;
end;
$$;
