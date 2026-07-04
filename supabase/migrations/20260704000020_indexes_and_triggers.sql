-- ============================================================
-- PrintOS — Indexes & updated_at triggers
--
-- Runs after all tables exist:
--   1. Index organization_id on every tenant table (RLS filters on
--      it constantly, and it backs the multi-tenant isolation)
--   2. Targeted indexes for the hottest query paths
--   3. Attach the set_updated_at trigger to every table that has
--      an updated_at column
-- ============================================================

-- ------------------------------------------------------------
-- 1. organization_id index on every table that has the column
-- ------------------------------------------------------------
do $$
declare
  tbl text;
begin
  for tbl in
    select table_name
    from information_schema.columns
    where table_schema = 'public'
      and column_name = 'organization_id'
      and table_name in (
        select table_name from information_schema.tables
        where table_schema = 'public' and table_type = 'BASE TABLE'
      )
  loop
    execute format(
      'create index if not exists %I on public.%I (organization_id)',
      tbl || '_organization_id_idx', tbl
    );
  end loop;
end;
$$;

-- ------------------------------------------------------------
-- 2. Targeted indexes for common lookups
-- ------------------------------------------------------------
create index if not exists profiles_user_id_idx            on public.profiles (user_id);
create index if not exists customers_portal_user_id_idx    on public.customers (portal_user_id) where portal_user_id is not null;

create index if not exists quotes_customer_id_idx          on public.quotes (customer_id);
create index if not exists quotes_status_idx               on public.quotes (organization_id, status);

create index if not exists orders_customer_id_idx          on public.orders (customer_id);
create index if not exists orders_status_idx               on public.orders (organization_id, status);
create index if not exists orders_kanban_stage_id_idx      on public.orders (kanban_stage_id);
create index if not exists orders_due_date_idx             on public.orders (organization_id, due_date);
create index if not exists orders_assigned_designer_idx    on public.orders (assigned_designer_id);
create index if not exists orders_assigned_operator_idx    on public.orders (assigned_operator_id);

create index if not exists order_items_order_id_idx        on public.order_items (order_id);
create index if not exists files_order_id_idx              on public.files (order_id);
create index if not exists file_checks_file_id_idx         on public.file_checks (file_id);
create index if not exists revision_requests_order_id_idx  on public.revision_requests (order_id);
create index if not exists revision_comments_request_idx   on public.revision_comments (revision_request_id);
create index if not exists file_routings_file_id_idx       on public.file_routings (file_id);
create index if not exists file_routings_department_idx    on public.file_routings (department_id, operator_status);

create index if not exists messages_order_id_idx           on public.messages (order_id, created_at);
create index if not exists deliveries_order_id_idx         on public.deliveries (order_id);
create index if not exists sms_logs_order_id_idx           on public.sms_logs (order_id);
create index if not exists feedback_order_id_idx           on public.feedback (order_id);
create index if not exists inventory_transactions_material_idx on public.inventory_transactions (material_id);
create index if not exists invoices_order_id_idx           on public.invoices (order_id);
create index if not exists payments_invoice_id_idx         on public.payments (invoice_id);
create index if not exists loyalty_transactions_customer_idx on public.loyalty_transactions (customer_id);
create index if not exists staff_assignments_order_id_idx  on public.staff_assignments (order_id);
create index if not exists staff_assignments_assigned_to_idx on public.staff_assignments (assigned_to);
create index if not exists notifications_user_unread_idx   on public.notifications (user_id, is_read, created_at desc);

-- ------------------------------------------------------------
-- 3. updated_at triggers on every table with an updated_at column
-- ------------------------------------------------------------
do $$
declare
  tbl text;
begin
  for tbl in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema and t.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'updated_at'
      and t.table_type = 'BASE TABLE'
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I;
       create trigger set_updated_at
         before update on public.%I
         for each row execute function public.set_updated_at()',
      tbl, tbl
    );
  end loop;
end;
$$;
