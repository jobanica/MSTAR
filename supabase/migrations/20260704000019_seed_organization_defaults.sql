-- ============================================================
-- PrintOS — Seed data for new organizations
--
-- Call public.seed_organization_defaults(org_id) from the backend
-- (service role) when a new organization is activated. It seeds:
--   1. Default kanban stages
--   2. An example department
--   3. SMS settings (all events active)
--   4. Default loyalty settings
--   5. Default brand settings
--   6. Integration stubs
--
-- All inserts are idempotent (on conflict do nothing), so calling
-- it twice for the same org is safe.
-- ============================================================

create or replace function public.seed_organization_defaults(org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 1. Default kanban stages
  insert into public.kanban_stages (organization_id, name, slug, sort_order, is_terminal) values
    (org_id, 'New Order',           'new',                0, false),
    (org_id, 'Design / Prepress',   'design',             1, false),
    (org_id, 'For Revision',        'revision',           2, false),
    (org_id, 'Approved',            'approved',           3, false),
    (org_id, 'Sent to Production',  'sent_to_production', 4, false),
    (org_id, 'Printing',            'printing',           5, false),
    (org_id, 'Done',                'done',               6, false),
    (org_id, 'Ready for Pickup',    'ready',              7, false),
    (org_id, 'Completed',           'completed',          8, true)
  on conflict (organization_id, slug) do nothing;

  -- 2. Example department
  insert into public.departments (organization_id, name, color_hex)
  select org_id, 'Tarpaulin', '#f59e0b'
  where not exists (
    select 1 from public.departments
    where organization_id = org_id and name = 'Tarpaulin'
  );

  -- 3. SMS settings (all active by default)
  insert into public.sms_settings (organization_id, event_type, is_active) values
    (org_id, 'order_confirmed',   true),
    (org_id, 'file_ready',        true),
    (org_id, 'revision_ready',    true),
    (org_id, 'ready_for_pickup',  true),
    (org_id, 'out_for_delivery',  true),
    (org_id, 'invoice_generated', true)
  on conflict (organization_id, event_type) do nothing;

  -- 4. Default loyalty settings
  insert into public.loyalty_settings (organization_id) values (org_id)
  on conflict (organization_id) do nothing;

  -- 5. Default brand settings
  insert into public.brand_settings (organization_id) values (org_id)
  on conflict (organization_id) do nothing;

  -- 6. Integration stubs
  insert into public.integration_settings (organization_id, integration) values
    (org_id, 'facebook_messenger'),
    (org_id, 'gcash_payment_link'),
    (org_id, 'maya_payment_link'),
    (org_id, 'google_drive'),
    (org_id, 'canva')
  on conflict (organization_id, integration) do nothing;
end;
$$;
