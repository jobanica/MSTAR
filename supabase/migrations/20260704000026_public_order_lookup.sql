-- ============================================================
-- PrintOS — Public order lookup + chat (no login)
--
-- Customers look up an order by ORDER NUMBER + the PHONE on file
-- (order numbers are sequential and guessable, so the phone is a
-- lightweight second factor that keeps one customer from reading
-- another's order and chat). All functions are SECURITY DEFINER and
-- verify the phone before returning or writing anything.
-- ============================================================

-- Last 10 digits of a phone, ignoring formatting (+63 / 09 / spaces).
create or replace function public.phone_tail(p text)
returns text
language sql
immutable
as $$
  select right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 10);
$$;

-- ------------------------------------------------------------
-- Look up an order by number + phone. Returns safe fields (plus the
-- order id needed to load/post chat) only when the phone matches.
-- ------------------------------------------------------------
create or replace function public.public_order_lookup(
  p_order_number text,
  p_phone text
)
returns table (
  order_id      uuid,
  order_number  text,
  job_type      text,
  status        text,
  due_date      date,
  created_at    timestamptz,
  shop_name     text,
  customer_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.order_number, o.job_type, o.status, o.due_date, o.created_at,
         org.name, c.full_name
  from public.orders o
  join public.customers c    on c.id = o.customer_id
  join public.organizations org on org.id = o.organization_id
  where o.order_number = trim(p_order_number)
    and length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 7
    and public.phone_tail(c.phone) = public.phone_tail(p_phone);
$$;

-- ------------------------------------------------------------
-- Non-internal chat for an order, if the phone matches.
-- ------------------------------------------------------------
create or replace function public.public_order_messages(
  p_order_id uuid,
  p_phone text
)
returns table (
  content     text,
  is_customer boolean,
  author      text,
  created_at  timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select m.content,
         (m.sent_by_customer_id is not null) as is_customer,
         coalesce(p.full_name, c.full_name, 'Shop') as author,
         m.created_at
  from public.messages m
  join public.orders o    on o.id = m.order_id
  join public.customers c on c.id = o.customer_id
  left join public.profiles p on p.id = m.sent_by
  where m.order_id = p_order_id
    and m.is_internal = false
    and length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 7
    and public.phone_tail(c.phone) = public.phone_tail(p_phone)
  order by m.created_at asc;
$$;

-- ------------------------------------------------------------
-- Post a customer chat message / revision comment, if phone matches.
-- Returns true when the message was accepted.
-- ------------------------------------------------------------
create or replace function public.public_post_message(
  p_order_id uuid,
  p_phone text,
  p_content text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
  v_customer uuid;
begin
  if coalesce(btrim(p_content), '') = '' then
    return false;
  end if;

  select o.organization_id, o.customer_id
  into v_org, v_customer
  from public.orders o
  join public.customers c on c.id = o.customer_id
  where o.id = p_order_id
    and length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 7
    and public.phone_tail(c.phone) = public.phone_tail(p_phone);

  if v_org is null then
    return false;   -- no match: reject
  end if;

  insert into public.messages
    (organization_id, order_id, sent_by_customer_id, content, is_internal)
  values (v_org, p_order_id, v_customer, left(btrim(p_content), 2000), false);

  return true;
end;
$$;

-- Grant to anonymous (public) + signed-in callers.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function public.public_order_lookup(text, text)   to anon;
    grant execute on function public.public_order_messages(uuid, text) to anon;
    grant execute on function public.public_post_message(uuid, text, text) to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.public_order_lookup(text, text)   to authenticated;
    grant execute on function public.public_order_messages(uuid, text) to authenticated;
    grant execute on function public.public_post_message(uuid, text, text) to authenticated;
  end if;
end;
$$;
