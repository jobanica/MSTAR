# PrintOS — Supabase Database Schema

Complete multi-tenant database schema for PrintOS, covering all 22 phases:
**33 tables**, Row Level Security on every table, storage buckets, and
per-organization seed data.

## Layout

```
supabase/
  migrations/
    20260704000001_phase01_foundation_auth.sql      organizations, departments, profiles + RLS helpers
    20260704000002_phase02_billing.sql              subscriptions, xendit_payment_events
    20260704000003_phase03_orders_quoting.sql       customers, job_templates, quotes, orders, order_items
    20260704000004_phase04_quotation_pdfs.sql       quotation_pdfs
    20260704000005_phase05_files_revisions.sql      files, file_checks, revision_requests, revision_comments, file_routings
    20260704000006_phase06_messaging.sql            messages
    20260704000007_phase07_kanban.sql               kanban_stages (+ orders.kanban_stage_id FK)
    20260704000008_phase09_deliveries.sql           deliveries
    20260704000009_phase10_sms.sql                  sms_logs, sms_settings
    20260704000010_phase12_feedback.sql             feedback (+ auto-flag ratings ≤ 2)
    20260704000011_phase14_qr_codes.sql             qr_codes
    20260704000012_phase15_inventory.sql            materials, inventory_transactions (+ stock sync trigger)
    20260704000013_phase16_invoicing_payments.sql   invoices, payments
    20260704000014_phase17_loyalty.sql              loyalty_settings, loyalty_transactions
    20260704000015_phase18_staff_notifications.sql  staff_assignments, notifications
    20260704000016_phase21_brand_settings.sql       brand_settings
    20260704000017_phase22_integrations.sql         integration_settings
    20260704000018_storage_buckets.sql              8 storage buckets
    20260704000019_seed_organization_defaults.sql   seed_organization_defaults(org_id) function
    20260704000020_indexes_and_triggers.sql         indexes + updated_at triggers
```

## Applying the schema

With the [Supabase CLI](https://supabase.com/docs/guides/local-development)
linked to your project:

```bash
supabase db push            # apply to the linked remote project
# or locally:
supabase start && supabase migration up
```

Migrations run in filename order and each one is self-contained (tables +
that phase's RLS policies together).

## Multi-tenancy & RLS model

- Every table carries `organization_id` → `organizations(id)`; RLS is
  enabled on all 33 tables.
- Policies never query `profiles` directly (a subquery on `profiles`
  inside a `profiles` policy causes infinite RLS recursion in Postgres).
  Instead, `SECURITY DEFINER` helper functions do the lookup once:
  - `user_organization_id()` — caller's org
  - `user_role()` — caller's role
  - `user_department_id()` — caller's department (operators)
  - `user_is_staff()` — true for any non-customer role
  - `user_customer_ids()` / `user_order_ids()` — portal-customer linkage
    via `customers.portal_user_id`
- The **service role** key bypasses RLS entirely — org provisioning,
  Xendit webhooks, SMS dispatch, and notification fan-out are expected to
  run through it (those tables intentionally have no client write policies).
- Portal customers only ever see their own `customers` / `quotes` /
  `orders` rows, approved files, and non-internal messages.
- Operators see files/routings only for their own department and can
  update `operator_status` on their department's routings.

## Seeding a new organization

After creating an `organizations` row (backend, service role):

```sql
select public.seed_organization_defaults('<org uuid>');
```

Seeds the 9 default kanban stages, an example department, the 6 SMS event
toggles, and default loyalty / brand / integration settings. The function
is idempotent — safe to call more than once.

## Conventions

- All monetary values are stored in **centavos** (integer); display as ₱
  by dividing by 100.
- All timestamps are `timestamptz`; tables with `updated_at` have a
  `before update` trigger keeping it current.
- `inventory_transactions` inserts automatically adjust
  `materials.current_stock` (quantity is signed: negative = deduction).
- `feedback` with rating ≤ 2 is auto-flagged for review on insert.

## Notes on the spec

Table and column names follow the specification exactly. Additions beyond
the spec (no renames):

- Per-org uniqueness on document numbers:
  `unique(organization_id, quote_number / order_number / invoice_number)`.
- `quotes.converted_to_order_id` and `orders.kanban_stage_id` are real
  foreign keys (added after their target tables exist).
- Indexes on `organization_id` everywhere plus the hottest lookup paths.
- The spec's table index mentions a `loyalty_points` table, but no DDL is
  defined for it and the summary counts 33 tables — point balances live in
  `customers.loyalty_points` and `loyalty_transactions.balance_after`, so
  no separate table was created.
