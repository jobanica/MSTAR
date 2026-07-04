-- ============================================================
-- PrintOS — Services catalog & Discount requests
--
-- services          — the shop's price list; picked in quotes/orders
--                     so the price fills in automatically
-- discount_requests — customer/staff discount asks that the owner
--                     (admin) reviews and approves; approval applies
--                     the discount to the linked order/quote
-- ============================================================

-- ------------------------------------------------------------
-- services
-- ------------------------------------------------------------
create table public.services (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  name                text not null,           -- e.g. "Tarpaulin 4x8 (eyelets)"
  description         text,
  category            text,                    -- e.g. "Large Format", "Digital Print"
  unit                text,                    -- e.g. "per pc", "per sqft"
  unit_price_centavos int not null default 0,
  is_active           boolean default true,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.services enable row level security;

create policy "services_read_own_org" on public.services
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "services_write_admin_sales" on public.services
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','super_admin')
  );

-- ------------------------------------------------------------
-- discount_requests
-- ------------------------------------------------------------
create table public.discount_requests (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id        uuid references public.orders(id) on delete cascade,
  quote_id        uuid references public.quotes(id) on delete cascade,
  customer_id     uuid references public.customers(id) on delete set null,
  requested_by    uuid references public.profiles(id) on delete set null,   -- staff who logged it
  from_customer   boolean default false,       -- true = customer asked via tracking page
  amount_centavos int not null default 0,      -- requested discount amount
  reason          text,
  status          text not null default 'pending'
                    check (status in ('pending','approved','rejected')),
  reviewed_by     uuid references public.profiles(id) on delete set null,
  reviewed_at     timestamptz,
  decision_note   text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.discount_requests enable row level security;

create policy "discount_requests_read_own_org" on public.discount_requests
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

-- Staff (admin/sales) can create/update requests; the owner-only
-- approval rule is additionally enforced in the server action.
create policy "discount_requests_write_staff" on public.discount_requests
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','super_admin')
  );

-- ------------------------------------------------------------
-- Indexes + updated_at triggers (earlier auto-migrations already ran)
-- ------------------------------------------------------------
create index if not exists services_organization_id_idx on public.services (organization_id);
create index if not exists discount_requests_organization_id_idx on public.discount_requests (organization_id);
create index if not exists discount_requests_status_idx on public.discount_requests (organization_id, status);
create index if not exists discount_requests_order_id_idx on public.discount_requests (order_id);

create trigger set_updated_at before update on public.services
  for each row execute function public.set_updated_at();
create trigger set_updated_at before update on public.discount_requests
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- Public RPC: a customer requests a discount from the tracking page
-- (gated by order number's phone, same as the other public RPCs)
-- ------------------------------------------------------------
create or replace function public.public_request_discount(
  p_order_id uuid,
  p_phone text,
  p_amount_centavos int,
  p_reason text
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
  select o.organization_id, o.customer_id
  into v_org, v_customer
  from public.orders o
  join public.customers c on c.id = o.customer_id
  where o.id = p_order_id
    and length(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')) >= 7
    and public.phone_tail(c.phone) = public.phone_tail(p_phone);

  if v_org is null then
    return false;
  end if;

  insert into public.discount_requests
    (organization_id, order_id, customer_id, from_customer, amount_centavos, reason, status)
  values (v_org, p_order_id, v_customer, true,
          greatest(coalesce(p_amount_centavos, 0), 0), left(btrim(coalesce(p_reason, '')), 500), 'pending');

  return true;
end;
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function public.public_request_discount(uuid, text, int, text) to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.public_request_discount(uuid, text, int, text) to authenticated;
  end if;
end;
$$;
