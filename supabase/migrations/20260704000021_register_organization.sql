-- ============================================================
-- PrintOS — Signup RPC
--
-- Called by the web app right after auth signup. Creates the
-- organization, the caller's admin profile, and seeds org defaults
-- in one transaction. SECURITY DEFINER because RLS (correctly)
-- blocks anonymous/self-service inserts into organizations.
-- ============================================================

create or replace function public.register_organization(
  org_name text,
  owner_full_name text default null,
  owner_phone text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if org_name is null or length(trim(org_name)) = 0 then
    raise exception 'organization name is required';
  end if;

  if exists (select 1 from public.profiles where user_id = auth.uid()) then
    raise exception 'user already belongs to an organization';
  end if;

  insert into public.organizations (name, owner_user_id, status)
  values (trim(org_name), auth.uid(), 'active')
  returning id into new_org_id;

  insert into public.profiles (user_id, organization_id, full_name, phone, role)
  values (auth.uid(), new_org_id, owner_full_name, owner_phone, 'admin');

  perform public.seed_organization_defaults(new_org_id);

  return new_org_id;
end;
$$;

revoke execute on function public.register_organization(text, text, text) from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.register_organization(text, text, text) to authenticated;
  end if;
end;
$$;
