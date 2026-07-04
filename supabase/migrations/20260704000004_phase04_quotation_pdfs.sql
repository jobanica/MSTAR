-- ============================================================
-- PrintOS — Phase 4: Quotation PDF
-- Tables: quotation_pdfs
-- ============================================================

-- ------------------------------------------------------------
-- 11. quotation_pdfs — tracks generated PDF quotations
-- ------------------------------------------------------------
create table public.quotation_pdfs (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id        uuid not null references public.quotes(id) on delete cascade,
  storage_path    text not null,     -- Supabase Storage path
  public_url      text,              -- shareable link
  approved_by_customer_at timestamptz,
  approved_by_customer_ip text,
  generated_at    timestamptz default now()
);

alter table public.quotation_pdfs enable row level security;

create policy "quotation_pdfs_read_own_org" on public.quotation_pdfs
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "quotation_pdfs_write_admin_sales" on public.quotation_pdfs
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','super_admin')
  );

-- Customer can see PDFs of their own quotes via portal
create policy "quotation_pdfs_customer_read_own" on public.quotation_pdfs
  for select using (
    quote_id in (
      select id from public.quotes
      where customer_id in (select public.user_customer_ids())
    )
  );
