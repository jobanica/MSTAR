-- ============================================================
-- PrintOS — Function hardening (from Supabase security advisors)
--
-- 1. Pin search_path on the two trigger functions that lacked it.
-- 2. Lock down SECURITY DEFINER functions exposed via PostgREST RPC:
--    - apply_inventory_transaction: trigger-only, never client-callable
--      (triggers still fire — EXECUTE is not checked at fire time)
--    - seed_organization_defaults: backend/service-role only
--    - register_organization: authenticated users only (not anon)
--    The user_*() RLS helpers stay executable by authenticated —
--    RLS policy expressions run as the querying role and need them;
--    they only ever return the caller's own profile facts.
-- ============================================================

alter function public.set_updated_at() set search_path = public;
alter function public.flag_low_rating_feedback() set search_path = public;

do $$
begin
  -- revoke the blanket default grant
  revoke execute on function public.apply_inventory_transaction() from public;
  revoke execute on function public.seed_organization_defaults(uuid) from public;
  revoke execute on function public.register_organization(text, text, text) from public;

  -- and the Supabase per-role default grants, where those roles exist
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function public.apply_inventory_transaction() from anon;
    revoke execute on function public.seed_organization_defaults(uuid) from anon;
    revoke execute on function public.register_organization(text, text, text) from anon;
  end if;

  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke execute on function public.apply_inventory_transaction() from authenticated;
    revoke execute on function public.seed_organization_defaults(uuid) from authenticated;
    -- register_organization stays granted to authenticated (signup flow)
    grant execute on function public.register_organization(text, text, text) to authenticated;
  end if;
end;
$$;
