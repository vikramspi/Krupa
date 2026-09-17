-- Vendor portal + admin panel (krupa-vendors, krupa-admin).
--
--   vendor_users  logins for laundry partners (phone OTP and/or email + password),
--                 created by the operator in the admin panel
--   activity_log  an append-only feed of what happens across all three websites
--   orders        new orders now start as 'placed' and wait for the partner to
--                 accept; 'cancelled' is a new terminal status
--   otp_codes     development-only codes are now scoped to customers or vendors
--
-- All three websites use this one database. Re-runnable.

-- ─── Orders: partner confirmation ────────────────────────────────────────────
alter table public.orders alter column status set default 'placed';

create index if not exists orders_vendor_status_idx on public.orders (vendor_id, status, created_at desc);
create index if not exists orders_created_idx on public.orders (created_at desc);

-- ─── Partner logins ──────────────────────────────────────────────────────────
create table if not exists public.vendor_users (
  id                 uuid primary key default gen_random_uuid(),
  vendor_id          uuid not null references public.vendors(id) on delete cascade,
  name               text not null,
  phone              text unique,
  email              text,
  -- bcrypt; null until the partner sets a password from their invite link.
  password_hash      text,
  -- SHA-256 of single-use links; the raw tokens are only ever emailed.
  invite_token_hash  text,
  invite_expires_at  timestamptz,
  reset_token_hash   text,
  reset_expires_at   timestamptz,
  is_active          boolean not null default true,
  last_login_at      timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint vendor_users_phone_or_email check (phone is not null or email is not null)
);

create unique index if not exists vendor_users_email_unique on public.vendor_users (lower(email)) where email is not null;
create index if not exists vendor_users_vendor_idx on public.vendor_users (vendor_id);

drop trigger if exists vendor_users_set_updated_at on public.vendor_users;
create trigger vendor_users_set_updated_at
  before update on public.vendor_users
  for each row execute function public.set_updated_at();

-- ─── Activity feed ───────────────────────────────────────────────────────────
create table if not exists public.activity_log (
  id           bigint generated always as identity primary key,
  created_at   timestamptz not null default now(),
  actor_type   text not null check (actor_type in ('customer', 'vendor', 'admin', 'system')),
  actor_id     text,
  -- Human-readable at the time of the event ("Vikram K.", "Placeholder Vendor 1").
  actor_label  text,
  action       text not null,
  entity_type  text,
  entity_id    text,
  summary      text not null,
  details      jsonb not null default '{}'::jsonb
);

create index if not exists activity_log_created_idx on public.activity_log (created_at desc);
create index if not exists activity_log_entity_idx on public.activity_log (entity_type, entity_id, created_at desc);

-- ─── Dev OTP codes: customers and vendors are separate ───────────────────────
alter table public.otp_codes add column if not exists audience text not null default 'customer';

-- ─── Access: server-side service role only, like every other table ───────────
alter table public.vendor_users enable row level security;
alter table public.activity_log enable row level security;
grant all privileges on public.vendor_users to service_role;
grant all privileges on public.activity_log to service_role;
grant usage, select on all sequences in schema public to service_role;
