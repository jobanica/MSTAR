-- ============================================================
-- PrintOS — Team invitations (join an existing shop via a link)
--
-- An admin creates an invitation (role + optional email); the app
-- turns it into a link /signup?invite=<token>. The invitee signs up
-- and calls accept_invitation(token), which creates their profile in
-- the inviting org with the chosen role (instead of creating a new
-- org). SECURITY DEFINER so it can write profiles under RLS.
-- ============================================================

create table public.invitations (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email           text,
  role            text not null check (role in ('admin','sales','designer','operator')),
  token           uuid not null default gen_random_uuid() unique,
  invited_by      uuid references public.profiles(id) on delete set null,
  status          text not null default 'pending'
                    check (status in ('pending','accepted','revoked')),
  accepted_by     uuid references auth.users(id) on delete set null,
  accepted_at     timestamptz,
  expires_at      timestamptz not null default (now() + interval '14 days'),
  created_at      timestamptz default now()
);

create index if not exists invitations_organization_id_idx on public.invitations (organization_id);
create index if not exists invitations_token_idx on public.invitations (token);

alter table public.invitations enable row level security;

-- Only admins of the org manage invitations.
create policy "invitations_admin_all" on public.invitations
  for all using (
    organization_id = public.user_organization_id()
    and public.user_role() in ('admin','super_admin')
  );

-- ------------------------------------------------------------
-- Public info about an invite (for the signup page): shop + role,
-- only while the invite is valid. No sensitive data exposed.
-- ------------------------------------------------------------
create or replace function public.public_invitation_info(p_token uuid)
returns table (shop_name text, role text, email text)
language sql
stable
security definer
set search_path = public
as $$
  select org.name, i.role, i.email
  from public.invitations i
  join public.organizations org on org.id = i.organization_id
  where i.token = p_token
    and i.status = 'pending'
    and i.expires_at > now();
$$;

-- ------------------------------------------------------------
-- Accept an invitation: create the caller's profile in the org.
-- ------------------------------------------------------------
create or replace function public.accept_invitation(
  p_token uuid,
  p_full_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.invitations%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select * into inv
  from public.invitations
  where token = p_token and status = 'pending' and expires_at > now();

  if inv.id is null then
    raise exception 'invalid or expired invitation';
  end if;

  if exists (select 1 from public.profiles where user_id = auth.uid()) then
    raise exception 'user already belongs to an organization';
  end if;

  insert into public.profiles (user_id, organization_id, full_name, role)
  values (auth.uid(), inv.organization_id, nullif(trim(coalesce(p_full_name, '')), ''), inv.role);

  update public.invitations
  set status = 'accepted', accepted_by = auth.uid(), accepted_at = now()
  where id = inv.id;

  return inv.organization_id;
end;
$$;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant execute on function public.public_invitation_info(uuid) to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant execute on function public.public_invitation_info(uuid) to authenticated;
    grant execute on function public.accept_invitation(uuid, text) to authenticated;
  end if;
end;
$$;
