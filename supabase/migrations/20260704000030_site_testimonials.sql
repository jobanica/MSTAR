-- ============================================================
-- PrintOS — Phase 26: Public testimonials for the shop site
--
-- Surfaces real 4–5 star customer feedback (with a comment) on the
-- shop's public landing page. SECURITY DEFINER + granted to anon so
-- the site can render reviews without exposing the feedback table.
-- ============================================================

create or replace function public.public_site_testimonials(p_slug text)
returns table (
  author     text,
  rating     int,
  comment    text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(split_part(c.full_name, ' ', 1), ''), 'Customer'),
         f.rating,
         f.comment,
         f.submitted_at
  from public.feedback f
  join public.organizations o on o.id = f.organization_id
  left join public.customers c on c.id = f.customer_id
  where o.slug = lower(trim(p_slug))
    and o.status = 'active'
    and f.rating >= 4
    and coalesce(btrim(f.comment), '') <> ''
  order by f.submitted_at desc
  limit 6;
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function public.public_site_testimonials(text) to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.public_site_testimonials(text) to authenticated;
  end if;
end;
$$;
