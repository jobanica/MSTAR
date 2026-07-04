-- ============================================================
-- PrintOS — Phase 15: Inventory Management
-- Tables: materials, inventory_transactions
-- ============================================================

-- ------------------------------------------------------------
-- 23. materials — material catalog per org
-- ------------------------------------------------------------
create table public.materials (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  name                text not null,              -- e.g. "Tarpaulin Roll (White)"
  unit                text not null,              -- e.g. "sqm", "roll", "ream", "liter"
  current_stock       numeric(10,2) not null default 0,
  reorder_threshold   numeric(10,2) not null default 0,
  cost_per_unit_centavos int default 0,
  department_id       uuid references public.departments(id),  -- which dept uses this
  is_active           boolean default true,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.materials enable row level security;

create policy "materials_read_own_org" on public.materials
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "materials_write_admin_sales" on public.materials
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','super_admin')
  );

-- ------------------------------------------------------------
-- 24. inventory_transactions — stock movement log
-- (auto-deduct + manual adjustments)
-- ------------------------------------------------------------
create table public.inventory_transactions (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  material_id     uuid not null references public.materials(id),
  order_id        uuid references public.orders(id),     -- null for manual adjustments
  transaction_type text not null
                    check (transaction_type in (
                      'deduct','restock','adjustment','initial'
                    )),
  quantity        numeric(10,2) not null,          -- negative = deduction
  notes           text,
  performed_by    uuid references public.profiles(id),
  created_at      timestamptz default now()
);

alter table public.inventory_transactions enable row level security;

create policy "inventory_transactions_read_own_org" on public.inventory_transactions
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "inventory_transactions_write_admin_sales" on public.inventory_transactions
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','super_admin')
  );

-- ------------------------------------------------------------
-- Keep materials.current_stock in sync with the transaction log
-- ------------------------------------------------------------
create or replace function public.apply_inventory_transaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.materials
  set current_stock = current_stock + new.quantity,
      updated_at = now()
  where id = new.material_id;
  return new;
end;
$$;

create trigger inventory_transactions_apply
  after insert on public.inventory_transactions
  for each row execute function public.apply_inventory_transaction();
