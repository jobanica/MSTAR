-- ============================================================
-- PrintOS — Phase 5: File Management, Routing & Revisions
-- Tables: files, file_checks, revision_requests,
--         revision_comments, file_routings
-- ============================================================

-- ------------------------------------------------------------
-- 12. files — all uploaded files per order with version tracking
-- ------------------------------------------------------------
create table public.files (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id        uuid not null references public.orders(id) on delete cascade,
  version_number  int not null default 1,
  file_name       text not null,
  file_type       text,              -- e.g. 'image/jpeg', 'application/pdf'
  file_size_bytes bigint,
  storage_path    text not null,     -- Supabase Storage path
  thumbnail_path  text,              -- auto-generated thumbnail path
  status          text not null default 'draft'
                    check (status in (
                      'draft','for_review','approved','sent_to_production'
                    )),
  check_passed    boolean,           -- result of print-ready file checker
  uploaded_by     uuid references public.profiles(id),
  notes           text,
  created_at      timestamptz default now(),
  unique(order_id, version_number)
);

-- ------------------------------------------------------------
-- 13. file_checks — print-ready file checker results per upload
-- ------------------------------------------------------------
create table public.file_checks (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  file_id         uuid not null references public.files(id) on delete cascade,
  check_type      text not null
                    check (check_type in ('resolution','color_mode','file_size')),
  passed          boolean not null,
  value_found     text,    -- e.g. "72dpi", "RGB", "45MB"
  expected_value  text,    -- e.g. "≥150dpi", "CMYK", "≤30MB"
  warning_message text,
  checked_at      timestamptz default now()
);

-- ------------------------------------------------------------
-- 14. revision_requests — revision requests per order
-- (from customer or admin)
-- ------------------------------------------------------------
create table public.revision_requests (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id        uuid not null references public.orders(id) on delete cascade,
  file_id         uuid references public.files(id),       -- which version was flagged
  requested_by    uuid references public.profiles(id),    -- staff profile
  requested_by_customer_id uuid references public.customers(id),  -- or customer
  notes           text not null,
  reference_file_path text,                        -- optional attached reference
  status          text not null default 'open'
                    check (status in ('open','in_progress','resolved')),
  resolved_by     uuid references public.profiles(id),
  resolved_at     timestamptz,
  resolved_file_id uuid references public.files(id),      -- the new version that resolved it
  created_at      timestamptz default now()
);

-- ------------------------------------------------------------
-- 15. revision_comments — comment thread on a revision request
-- ------------------------------------------------------------
create table public.revision_comments (
  id                  uuid primary key default gen_random_uuid(),
  organization_id     uuid not null references public.organizations(id) on delete cascade,
  revision_request_id uuid not null references public.revision_requests(id) on delete cascade,
  posted_by           uuid references public.profiles(id),
  posted_by_customer_id uuid references public.customers(id),
  content             text not null,
  attachment_path     text,
  created_at          timestamptz default now()
);

-- ------------------------------------------------------------
-- 16. file_routings — which file version was routed to which dept
-- ------------------------------------------------------------
create table public.file_routings (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id        uuid not null references public.orders(id) on delete cascade,
  file_id         uuid not null references public.files(id),
  department_id   uuid not null references public.departments(id),
  routed_by       uuid references public.profiles(id),
  operator_status text not null default 'queued'
                    check (operator_status in ('queued','printing','done')),
  done_at         timestamptz,
  created_at      timestamptz default now()
);

-- ------------------------------------------------------------
-- RLS: files
--  - admin/sales/designer read & write in their org
--  - operator reads only files routed to their department
--  - customer reads approved files on their own orders
-- ------------------------------------------------------------
alter table public.files enable row level security;

create policy "files_staff_read" on public.files
  for select using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','designer','super_admin')
  );

create policy "files_staff_write" on public.files
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','designer','super_admin')
  );

create policy "files_operator_read_routed" on public.files
  for select using (
    organization_id = public.user_organization_id()
    and public.user_role() = 'operator'
    and id in (
      select file_id from public.file_routings
      where department_id = public.user_department_id()
    )
  );

create policy "files_customer_read_approved" on public.files
  for select using (
    status in ('approved','sent_to_production')
    and order_id in (select public.user_order_ids())
  );

-- ------------------------------------------------------------
-- RLS: file_checks — follows the file's staff visibility;
-- inserts come from the checker (designer upload flow or backend)
-- ------------------------------------------------------------
alter table public.file_checks enable row level security;

create policy "file_checks_read_own_org" on public.file_checks
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "file_checks_write_staff" on public.file_checks
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','designer','super_admin')
  );

-- ------------------------------------------------------------
-- RLS: revision_requests — staff read/write; customer can read and
-- open revision requests on their own orders
-- ------------------------------------------------------------
alter table public.revision_requests enable row level security;

create policy "revision_requests_read_own_org" on public.revision_requests
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "revision_requests_write_staff" on public.revision_requests
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','designer','super_admin')
  );

create policy "revision_requests_customer_read_own" on public.revision_requests
  for select using (order_id in (select public.user_order_ids()));

create policy "revision_requests_customer_insert_own" on public.revision_requests
  for insert with check (
    order_id in (select public.user_order_ids())
    and requested_by_customer_id in (select public.user_customer_ids())
  );

-- ------------------------------------------------------------
-- RLS: revision_comments — staff read/write; customer participates
-- on threads for their own orders
-- ------------------------------------------------------------
alter table public.revision_comments enable row level security;

create policy "revision_comments_read_own_org" on public.revision_comments
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "revision_comments_write_staff" on public.revision_comments
  for all using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "revision_comments_customer_read_own" on public.revision_comments
  for select using (
    revision_request_id in (
      select id from public.revision_requests
      where order_id in (select public.user_order_ids())
    )
  );

create policy "revision_comments_customer_insert_own" on public.revision_comments
  for insert with check (
    posted_by_customer_id in (select public.user_customer_ids())
    and revision_request_id in (
      select id from public.revision_requests
      where order_id in (select public.user_order_ids())
    )
  );

-- ------------------------------------------------------------
-- RLS: file_routings — admin/sales/designer route files; operators
-- see and update routings for their own department
-- ------------------------------------------------------------
alter table public.file_routings enable row level security;

create policy "file_routings_read_own_org" on public.file_routings
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "file_routings_write_staff" on public.file_routings
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','designer','super_admin')
  );

create policy "file_routings_operator_update" on public.file_routings
  for update using (
    organization_id = public.user_organization_id()
    and public.user_role() = 'operator'
    and department_id = public.user_department_id()
  );
