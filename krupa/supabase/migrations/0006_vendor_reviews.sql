-- Vendor reviews from verified customers.
--
-- A review is tied to one DELIVERED order (enforced in the route handler), so
-- only real customers of a partner can review it, once per order. The customer
-- can edit it later. The operator can hide a review by setting is_published to
-- false in the table editor.
--
-- Re-runnable.

create table if not exists public.vendor_reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vendor_reviews_vendor_published_idx
  on public.vendor_reviews (vendor_id, created_at desc)
  where is_published;

drop trigger if exists vendor_reviews_set_updated_at on public.vendor_reviews;
create trigger vendor_reviews_set_updated_at
  before update on public.vendor_reviews
  for each row execute function public.set_updated_at();

-- Same access model as every other table: server-side service role only.
alter table public.vendor_reviews enable row level security;
grant all privileges on public.vendor_reviews to service_role;
