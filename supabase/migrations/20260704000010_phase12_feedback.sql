-- ============================================================
-- PrintOS — Phase 12: Customer Feedback & Ratings
-- Tables: feedback
-- ============================================================

-- ------------------------------------------------------------
-- 22. feedback — post-completion customer ratings
-- ------------------------------------------------------------
create table public.feedback (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id        uuid not null references public.orders(id) on delete cascade,
  customer_id     uuid not null references public.customers(id),
  rating          int not null check (rating between 1 and 5),
  comment         text,
  flagged_for_review boolean default false,   -- auto-flagged if rating <= 2
  reviewed_by     uuid references public.profiles(id),
  reviewed_at     timestamptz,
  submitted_at    timestamptz default now()
);

alter table public.feedback enable row level security;

create policy "feedback_read_own_org" on public.feedback
  for select using (
    organization_id = public.user_organization_id()
    and public.user_is_staff()
  );

create policy "feedback_write_admin_sales" on public.feedback
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','sales','super_admin')
  );

-- Customer submits feedback on their own completed orders
create policy "feedback_customer_insert_own" on public.feedback
  for insert with check (
    customer_id in (select public.user_customer_ids())
    and order_id in (select public.user_order_ids())
  );

-- Customer can read back their own feedback
create policy "feedback_customer_read_own" on public.feedback
  for select using (customer_id in (select public.user_customer_ids()));

-- ------------------------------------------------------------
-- Auto-flag low ratings (<= 2) for admin review
-- ------------------------------------------------------------
create or replace function public.flag_low_rating_feedback()
returns trigger
language plpgsql
as $$
begin
  if new.rating <= 2 then
    new.flagged_for_review = true;
  end if;
  return new;
end;
$$;

create trigger feedback_flag_low_rating
  before insert on public.feedback
  for each row execute function public.flag_low_rating_feedback();
