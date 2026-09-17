-- ─────────────────────────────────────────────────────────────────────────────
-- Email + password login, alongside phone OTP.
--
-- Phone and email are independently nullable: an account may be phone-only,
-- email-only, or (once a phone is verified on an email account) both. There is
-- deliberately NO merge flow yet — see README "Known limitation: no account linking".
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.customers
  add column if not exists email             text,
  -- bcrypt digest. Never a fast hash: the OTP HMAC is for 5-minute codes, not credentials.
  add column if not exists password_hash     text,
  -- Null until the emailed verification link is clicked; login is refused before then.
  add column if not exists email_verified_at timestamptz;

-- Case-insensitive uniqueness: Foo@x.com and foo@x.com are the same account.
create unique index if not exists customers_email_unique on public.customers (lower(email));

-- The phone column pre-dates this migration as NOT NULL UNIQUE; email-only
-- accounts need it nullable. (Uniqueness is preserved by the index below.)
alter table public.customers alter column phone drop not null;
-- Drop the constraint before the index it owns: DROP INDEX alone would error and
-- abort the migration. A plain unique index still allows multiple NULL phones.
alter table public.customers drop constraint if exists customers_phone_key;
drop index if exists customers_phone_key;
create unique index if not exists customers_phone_unique on public.customers (phone);

-- An account must be reachable by at least one identity.
alter table public.customers drop constraint if exists customers_identity_present;
alter table public.customers
  add constraint customers_identity_present check (phone is not null or email is not null);

comment on column public.customers.password_hash is
  'bcrypt hash (cost 12). Verification and reset links are signed with SESSION_SECRET and bound to this value, so completing a reset invalidates every outstanding link.';
