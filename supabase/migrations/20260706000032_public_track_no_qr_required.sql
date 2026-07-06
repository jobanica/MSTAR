-- ============================================================
-- PrintOS — Allow order tracking without a pre-generated QR row
--
-- The claim stub prints a QR that links to /track/<order_id> directly,
-- without first creating a qr_codes row. The original tracking RPC only
-- returned orders that had a qr_codes row, so scanning a claim stub said
-- "order not found". The order id is an unguessable UUID and only safe
-- status fields are returned, so we drop the qr_codes requirement.
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
  where o.id = p_order_id;
$$;
