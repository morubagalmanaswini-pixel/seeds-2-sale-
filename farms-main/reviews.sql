-- Reviews table for farmers, delivery partners, consumers, and markets.
-- Run after supabase-auth.sql and before/after delivery-partner.sql as needed.

create type public.review_target_type as enum ('farmer', 'delivery_partner', 'consumer', 'market');

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null references public.profiles(user_id) on delete cascade,
  reviewed_user_id uuid not null references public.profiles(user_id) on delete cascade,
  review_target public.review_target_type not null,
  rating smallint not null check (rating between 1 and 5),
  comment text,
  order_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (reviewer_id, reviewed_user_id, review_target, order_id)
);

create index reviews_reviewed_user_idx
  on public.reviews (reviewed_user_id, review_target, created_at desc);

create index reviews_reviewer_idx
  on public.reviews (reviewer_id, created_at desc);

create index reviews_rating_idx
  on public.reviews (review_target, rating);

create or replace function public.update_reviews_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger reviews_updated_at
before update on public.reviews
for each row execute procedure public.update_reviews_updated_at();

create view public.review_summary as
select
  reviewed_user_id,
  review_target,
  round(avg(rating)::numeric, 2) as average_rating,
  count(*) as total_reviews,
  sum(case when rating >= 4 then 1 else 0 end) as positive_reviews
from public.reviews
group by reviewed_user_id, review_target;

alter table public.reviews enable row level security;

create policy reviews_select_all_authenticated on public.reviews
for select to authenticated
using (true);

create policy reviews_insert_own_review on public.reviews
for insert to authenticated
with check (
  reviewer_id = (select auth.uid())
  and reviewed_user_id <> (select auth.uid())
  and comment is null or char_length(comment) <= 500
);

create policy reviews_update_own_review on public.reviews
for update to authenticated
using (reviewer_id = (select auth.uid()))
with check (
  reviewer_id = (select auth.uid())
  and reviewed_user_id <> (select auth.uid())
  and comment is null or char_length(comment) <= 500
);

create policy reviews_delete_own_review on public.reviews
for delete to authenticated
using (reviewer_id = (select auth.uid()));

-- Optional: allow admins to moderate all reviews.
create policy reviews_admin_manage on public.reviews
for all to authenticated
using ((select public.is_approved_admin()));
