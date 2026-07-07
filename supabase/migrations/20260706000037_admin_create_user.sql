-- ============================================================
-- PrintOS — Admin-created staff logins
--
-- Lets a shop admin create a login + temporary password for a
-- teammate directly (no invite link). SECURITY DEFINER so it can
-- write to the auth schema, but hard-guarded so only an admin /
-- super_admin of the caller's own org can use it, and it can never
-- mint a super_admin.
-- ============================================================

create or replace function public.admin_create_user(
  p_email text,
  p_password text,
  p_full_name text,
  p_role text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  caller_role text := public.user_role();
  caller_org  uuid := public.user_organization_id();
  new_id      uuid := gen_random_uuid();
  norm_email  text := lower(trim(p_email));
begin
  if caller_role not in ('admin','super_admin') then
    raise exception 'not authorized';
  end if;
  if norm_email is null or norm_email !~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' then
    raise exception 'a valid email is required';
  end if;
  if p_password is null or length(p_password) < 6 then
    raise exception 'password must be at least 6 characters';
  end if;
  if p_role not in ('admin','sales','designer','operator') then
    raise exception 'invalid role';
  end if;
  if exists (select 1 from auth.users where lower(email) = norm_email) then
    raise exception 'that email already has an account';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', new_id,
    'authenticated', 'authenticated', norm_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', p_full_name),
    '', '', '', ''
  );

  insert into auth.identities (
    provider_id, user_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at, id
  ) values (
    new_id::text, new_id,
    jsonb_build_object('sub', new_id::text, 'email', norm_email, 'email_verified', true),
    'email', now(), now(), now(), gen_random_uuid()
  );

  insert into public.profiles (user_id, organization_id, full_name, role, is_active)
  values (new_id, caller_org, nullif(trim(p_full_name), ''), p_role, true);

  return new_id;
end;
$$;

-- Reset a teammate's password to a new temporary one (same org, admin only).
create or replace function public.admin_set_user_password(
  p_user_id uuid,
  p_password text
)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  caller_role text := public.user_role();
  caller_org  uuid := public.user_organization_id();
  target_role text;
begin
  if caller_role not in ('admin','super_admin') then
    raise exception 'not authorized';
  end if;
  if p_password is null or length(p_password) < 6 then
    raise exception 'password must be at least 6 characters';
  end if;

  select role into target_role
  from public.profiles
  where user_id = p_user_id and organization_id = caller_org;
  if target_role is null then
    raise exception 'user not found in your shop';
  end if;
  if target_role = 'super_admin' then
    raise exception 'cannot change a super admin password';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = p_user_id;
end;
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.admin_create_user(text, text, text, text) to authenticated;
    grant execute on function public.admin_set_user_password(uuid, text) to authenticated;
  end if;
end;
$$;
