-- ============================================================
-- PrintOS — 7-day free trial + $5 lifetime plan
--
-- New shops get a 7-day trial. After it ends they must pay for
-- lifetime access (subscription_status = 'lifetime'), which the
-- Xendit webhook (or a super-admin) sets.
-- ============================================================

-- New signups start a 7-day trial.
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

  insert into public.organizations
    (name, owner_user_id, status, subscription_status, trial_ends_at)
  values
    (trim(org_name), auth.uid(), 'active', 'trial', now() + interval '7 days')
  returning id into new_org_id;

  insert into public.profiles (user_id, organization_id, full_name, phone, role)
  values (auth.uid(), new_org_id, owner_full_name, owner_phone, 'admin');

  perform public.seed_organization_defaults(new_org_id);

  return new_org_id;
end;
$$;

revoke execute on function public.register_organization(text, text, text) from public;

-- Super-admin: grant lifetime access (used for comps / manual payments).
create or replace function public.admin_grant_lifetime(p_org uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.user_role() <> 'super_admin' then
    raise exception 'not authorized';
  end if;
  update public.organizations
     set subscription_status = 'lifetime', status = 'active', updated_at = now()
   where id = p_org;
end;
$$;

-- Super-admin: put an org back on a fresh N-day trial.
create or replace function public.admin_reset_trial(p_org uuid, p_days int default 7)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  new_end timestamptz;
begin
  if public.user_role() <> 'super_admin' then
    raise exception 'not authorized';
  end if;
  if p_days is null or p_days < 0 or p_days > 3650 then
    raise exception 'invalid days';
  end if;
  update public.organizations
     set trial_ends_at = now() + make_interval(days => p_days),
         subscription_status = 'trial',
         status = 'active',
         updated_at = now()
   where id = p_org
  returning trial_ends_at into new_end;
  return new_end;
end;
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.register_organization(text, text, text) to authenticated;
    grant execute on function public.admin_grant_lifetime(uuid) to authenticated;
    grant execute on function public.admin_reset_trial(uuid, int) to authenticated;
  end if;
end;
$$;
