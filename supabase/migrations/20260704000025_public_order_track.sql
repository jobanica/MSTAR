-- ============================================================
-- PrintOS — Public order tracking RPC (for QR job tracking)
--
-- The QR code on a job encodes /track/<order_id>. That page is public
-- (no login), so it can't read `orders` through RLS. This SECURITY
-- DEFINER function returns only a few safe fields, and ONLY for orders
-- that have a QR code generated — so nothing is exposed until the shop
-- deliberately creates a tracking QR for that order.
-- ============================================================

create or replace function public.public_order_track(p_order_id uuid)
returns table (
  order_number text,
  job_type     text,
  status       text,
  due_date     date,
  created_at   timestamptz,
  shop_name    text
)
language sql
stable
security definer
set search_path = public
as $$
  select o.order_number, o.job_type, o.status, o.due_date, o.created_at, org.name
  from public.orders o
  join public.organizations org on org.id = o.organization_id
  where o.id = p_order_id
    and exists (select 1 from public.qr_codes q where q.order_id = o.id);
$$;

-- Anyone with the (unguessable) order id encoded in the QR can read
-- the safe status fields.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function public.public_order_track(uuid) to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.public_order_track(uuid) to authenticated;
  end if;
end;
$$;
