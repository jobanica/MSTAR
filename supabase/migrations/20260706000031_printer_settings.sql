-- ============================================================
-- PrintOS — Printer settings for the claim stub
-- Adds claim-stub print preferences to brand_settings.
-- ============================================================

alter table public.brand_settings
  add column if not exists receipt_width_mm int not null default 58
    check (receipt_width_mm in (58, 80)),
  add column if not exists claim_footer text,
  add column if not exists claim_auto_print boolean not null default false;
