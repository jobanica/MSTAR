-- ============================================================
-- PrintOS — Phase 7: Kanban Production Board
-- Tables: kanban_stages
-- Also: adds the orders.kanban_stage_id foreign key deferred
--       from the Phase 3 migration
-- ============================================================

-- ------------------------------------------------------------
-- 18. kanban_stages — configurable stages per organization
-- Default stages are seeded on org creation (see seed function):
--   new, design, revision, approved, sent_to_production,
--   printing, done, ready, completed
-- ------------------------------------------------------------
create table public.kanban_stages (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name            text not null,
  slug            text not null,   -- e.g. 'new','design','revision','approved', etc.
  color_hex       text default '#94a3b8',
  sort_order      int not null default 0,
  is_terminal     boolean default false,  -- true = Completed/Cancelled
  created_at      timestamptz default now(),
  unique(organization_id, slug)
);

-- orders.kanban_stage_id was created without its FK in Phase 3
-- (kanban_stages did not exist yet) — add it now
alter table public.orders
  add constraint orders_kanban_stage_id_fkey
  foreign key (kanban_stage_id) references public.kanban_stages(id);

alter table public.kanban_stages enable row level security;

create policy "kanban_stages_read_own_org" on public.kanban_stages
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "kanban_stages_write_admin" on public.kanban_stages
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','super_admin')
  );
