-- Run in Supabase SQL Editor after enabling Email/Password Auth.
-- Replace the UUID below with the Auth user's UUID created manually by the owner.

create type public.app_role as enum ('admin', 'customer_care', 'farmer', 'consumer', 'delivery_partner');
create type public.account_status as enum ('pending', 'approved', 'disabled');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role public.app_role not null default 'consumer',
  account_status public.account_status not null default 'pending',
  approved_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index profiles_role_status_idx on public.profiles(role, account_status);
alter table public.profiles enable row level security;

-- Public signups may create only consumer, farmer, or delivery_partner profiles.
-- Admin and customer_care are never accepted from signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, name, email, role, account_status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    lower(new.email),
    case
      when new.raw_user_meta_data ->> 'role' in ('consumer', 'farmer', 'delivery_partner')
        then (new.raw_user_meta_data ->> 'role')::public.app_role
      else 'consumer'::public.app_role
    end,
    case
      when new.raw_user_meta_data ->> 'role' = 'delivery_partner' then 'pending'::public.account_status
      else 'approved'::public.account_status
    end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_approved_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and role = 'admin'
      and account_status = 'approved'
  );
$$;

create policy profiles_select_own_or_staff on public.profiles
for select to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_approved_admin())
);

-- No client insert/update/delete policy exists intentionally. The service-role backend
-- performs staff appointment and status changes after checking the admin profile.

-- First-admin bootstrap: create the Auth user manually in Supabase Dashboard first,
-- then replace both values below and execute as the project owner.
insert into public.profiles (user_id, name, email, role, account_status, approved_by)
values ('00000000-0000-0000-0000-000000000000', 'FarmDirect Owner', 'owner@farmdirect.com', 'admin', 'approved', '00000000-0000-0000-0000-000000000000')
on conflict (user_id) do update set role = 'admin', account_status = 'approved', email = excluded.email, name = excluded.name;

-- Optional hardening for an existing database: ensure only the owner can use this row.
-- Never expose the service-role key to the browser.
