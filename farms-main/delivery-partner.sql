-- Delivery partner application and operational state.
-- Run after supabase-auth.sql.

create type public.partner_verification_status as enum ('pending', 'verified', 'rejected');
create type public.partner_account_status as enum ('active', 'suspended');
create type public.partner_availability_status as enum ('available', 'busy', 'offline');

create table public.delivery_partner_profiles (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  full_name text not null,
  mobile_number text not null,
  email text not null,
  operating_location text not null,
  service_area text not null,
  vehicle_type text not null check (vehicle_type in ('Bike', 'Auto', 'Mini Truck', 'Truck')),
  vehicle_number text not null,
  government_id_type text not null,
  government_id_last4 text not null,
  verification_documents jsonb not null default '[]'::jsonb,
  verification_status public.partner_verification_status not null default 'pending',
  account_status public.partner_account_status not null default 'suspended',
  current_location jsonb,
  location_permission boolean not null default false,
  availability_status public.partner_availability_status not null default 'offline',
  active_order_count integer not null default 0 check (active_order_count >= 0),
  approved_by uuid references public.profiles(user_id),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index delivery_partner_eligibility_idx on public.delivery_partner_profiles(verification_status, account_status, availability_status);
alter table public.delivery_partner_profiles enable row level security;

create policy delivery_partner_read_own_or_admin on public.delivery_partner_profiles
for select to authenticated
using (
  user_id = (select auth.uid())
  or (select public.is_approved_admin())
);

create policy delivery_partner_insert_own_pending on public.delivery_partner_profiles
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and verification_status = 'pending'
  and account_status = 'suspended'
  and availability_status = 'offline'
);

create policy delivery_partner_update_own_application on public.delivery_partner_profiles
for update to authenticated
using (user_id = (select auth.uid()) and verification_status = 'pending')
with check (
  user_id = (select auth.uid())
  and verification_status = 'pending'
  and account_status = 'suspended'
);

-- No client policy can change verification, approval, account status, or assignment counters.
-- The service-role backend changes those fields only after an approved-admin check.
