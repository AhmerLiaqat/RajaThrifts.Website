-- ════════════════════════════════════════════════════════════════════════════
-- RajaThrifs · 0002 · Profiles and role-based authorization
-- ════════════════════════════════════════════════════════════════════════════
-- Roles live in public.profiles.role and can ONLY be changed by an admin through
-- public.set_user_role(). Users can edit their own contact details, never their role.
--
-- Bootstrap the first admin once, from the Supabase SQL editor (runs as postgres):
--   update public.profiles set role = 'admin' where email = 'you@example.com';

create table public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  role           public.user_role not null default 'customer',
  email          text,
  full_name      text check (char_length(full_name) <= 120),
  phone          text check (phone ~ '^\+?[0-9][0-9 -]{6,19}$'),
  address_line1  text check (char_length(address_line1) <= 200),
  address_line2  text check (char_length(address_line2) <= 200),
  city           text check (char_length(city) <= 80),
  province       text check (char_length(province) <= 80),
  postal_code    text check (char_length(postal_code) <= 12),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on table public.profiles is 'One row per auth user. role drives authorization across RLS policies.';

create index profiles_staff_idx on public.profiles (role) where role <> 'customer';
create index profiles_email_idx on public.profiles (lower(email));

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function private.set_updated_at();

-- ── Role helpers ────────────────────────────────────────────────────────────
-- SECURITY DEFINER so RLS policies can read the caller's role without recursing
-- into profiles' own policies. They only ever reveal the CALLER's role.
create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid());
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() in ('shopkeeper', 'admin'), false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

-- ── Auto-create a profile for every new auth user ───────────────────────────
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text := nullif(trim(new.raw_user_meta_data ->> 'phone'), '');
begin
  insert into public.profiles (id, email, full_name, phone)
  values (
    new.id,
    new.email,
    nullif(left(trim(new.raw_user_meta_data ->> 'full_name'), 120), ''),
    -- Never let malformed sign-up metadata block account creation.
    case when v_phone ~ '^\+?[0-9][0-9 -]{6,19}$' then v_phone end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function private.handle_user_email_change();

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.profiles enable row level security;

create policy "profiles: users read their own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: staff read all"
  on public.profiles for select to authenticated
  using ((select public.is_staff()));

create policy "profiles: users update their own"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Column-level privileges: even on their own row, users may only touch contact fields.
-- role, email and id are writable only by SECURITY DEFINER functions / the service role.
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (full_name, phone, address_line1, address_line2, city, province, postal_code)
  on public.profiles to authenticated;

-- ── Admin: change a user's role ─────────────────────────────────────────────
create or replace function public.set_user_role(p_user_id uuid, p_role public.user_role)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles;
begin
  if not public.is_admin() then
    raise exception 'Only admins can change roles' using errcode = '42501';
  end if;
  if p_user_id = (select auth.uid()) and p_role <> 'admin' then
    raise exception 'You cannot remove your own admin role' using errcode = '42501';
  end if;

  update public.profiles set role = p_role where id = p_user_id returning * into v_profile;
  if not found then
    raise exception 'User not found' using errcode = 'P0002';
  end if;
  return v_profile;
end;
$$;

revoke execute on function public.set_user_role(uuid, public.user_role) from public, anon;
grant execute on function public.set_user_role(uuid, public.user_role) to authenticated;
