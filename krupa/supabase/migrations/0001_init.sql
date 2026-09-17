-- ─────────────────────────────────────────────────────────────────────────────
-- Krupa Laundry — initial schema
-- Run in the Supabase SQL editor (or `supabase db push`) before deploying.
--
-- Access model: every query runs server-side with the service role key, which
-- bypasses RLS. RLS is still ENABLED with no policies on every table, so the
-- anon/publishable key can read nothing even if it leaks. Authorisation is
-- enforced in the route handlers by matching the session cookie's phone.
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists pgcrypto;

-- Customers ------------------------------------------------------------------
create table if not exists public.customers (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null unique,
  name        text,
  created_at  timestamptz not null default now()
);

-- Saved addresses -------------------------------------------------------------
create table if not exists public.addresses (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers(id) on delete cascade,
  label        text not null default 'Home',
  line1        text not null,
  line2        text not null,
  landmark     text,
  area_id      text not null,
  area_name    text not null,
  pincode      text not null,
  city         text not null default 'Mumbai',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists addresses_customer_id_idx on public.addresses (customer_id);

-- Orders ----------------------------------------------------------------------
-- Human-readable order codes continue the prototype's numbering (KR-10287+).
create sequence if not exists public.order_code_seq start with 10287;

create table if not exists public.orders (
  id                     uuid primary key default gen_random_uuid(),
  order_code             text not null unique
                           default ('KR-' || lpad(nextval('public.order_code_seq')::text, 5, '0')),
  customer_id            uuid references public.customers(id) on delete set null,
  vendor_name            text not null,
  -- Beyond the base spec: re-hydrates partner details (phone, rating) for
  -- tracking and powers one-tap reorder. FK added in 0003 once vendors exists.
  vendor_id              uuid not null,
  items                  jsonb not null,
  subtotal               integer not null,
  pickup_fee             integer not null,
  discount               integer not null default 0,
  total                  integer not null,
  pickup_date            date not null,
  pickup_slot            text not null,
  address                jsonb not null,
  status                 text not null default 'pickup_scheduled',
  -- Also beyond the base spec: the customer's optional email (for the
  -- confirmation mail), pickup notes, the quoted delivery window, and the
  -- timeline the tracking page renders.
  contact_email          text,
  instructions           text,
  estimated_delivery_from timestamptz,
  estimated_delivery_to   timestamptz,
  status_history         jsonb not null default '[]'::jsonb,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists orders_customer_id_idx on public.orders (customer_id);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- One-time passcodes ----------------------------------------------------------
-- Only the HMAC of the code is stored; the raw code exists in memory and in the
-- SMS, never in the database or the logs.
create table if not exists public.otp_codes (
  id          uuid primary key default gen_random_uuid(),
  phone       text not null,
  code_hash   text not null,
  expires_at  timestamptz not null,
  attempts    integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists otp_codes_phone_idx on public.otp_codes (phone, created_at desc);

-- updated_at maintenance ------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists addresses_set_updated_at on public.addresses;
create trigger addresses_set_updated_at
  before update on public.addresses
  for each row execute function public.set_updated_at();

-- Lock everything down to the service role ------------------------------------
alter table public.customers enable row level security;
alter table public.addresses enable row level security;
alter table public.orders    enable row level security;
alter table public.otp_codes enable row level security;
-- No policies are defined on purpose: without one, anon/authenticated keys can
-- neither read nor write. The service role key used by the route handlers
-- bypasses RLS entirely.

-- Housekeeping: expired OTPs are deleted on each new request for that phone,
-- but this clears anything abandoned. Schedule via pg_cron if desired.
-- delete from public.otp_codes where expires_at < now() - interval '1 day';
