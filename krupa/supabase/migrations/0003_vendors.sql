-- ─────────────────────────────────────────────────────────────────────────────
-- Laundry partners.
--
-- Not personal data, so no per-customer RLS — but RLS is still enabled with no
-- policies, so the anon key can't read it. All reads go through server-side
-- route handlers, same as every other table.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.vendors (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  contact_phone        text not null,
  -- Service-area ids this partner collects from (see src/data/areas.ts).
  coverage_areas       jsonb not null default '[]'::jsonb,
  -- Offering ids from the service catalogue (wash-fold, dry-cleaning, …).
  offered_service_ids  jsonb not null default '[]'::jsonb,
  -- { "min_hours": 24, "max_hours": 48 } — drives the delivery-window estimate.
  turnaround_estimate  jsonb not null default '{"min_hours": 24, "max_hours": 48}'::jsonb,
  rating               numeric(2,1),
  -- false = not currently accepting orders; shown to customers as "at capacity".
  is_active            boolean not null default true,

  -- Needed by the app beyond the base spec (all documented in the README):
  -- pricing integrity (the server recomputes every order from these),
  price_multiplier     numeric(3,2) not null default 1.00,
  pickup_fee           integer not null default 49,
  -- distance display + "nearest" sorting (null = distance hidden),
  latitude             numeric(9,6),
  longitude            numeric(9,6),
  -- and whether same-day pickup slots are offered.
  accepts_same_day     boolean not null default true,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists vendors_is_active_idx on public.vendors (is_active);
create index if not exists vendors_coverage_idx on public.vendors using gin (coverage_areas);

drop trigger if exists vendors_set_updated_at on public.vendors;
create trigger vendors_set_updated_at
  before update on public.vendors
  for each row execute function public.set_updated_at();

alter table public.vendors enable row level security;

-- ─────────────────────────────────────────────────────────────────────────────
-- PLACEHOLDER DATA — obviously fictional on purpose.
-- Replace each row with a real partner (see README "Filling in real vendors").
-- Note: no row covers 'gorai', so that area exercises the "no partners" state,
-- and Placeholder Vendor 6 is inactive, exercising the "at capacity" state.
-- ─────────────────────────────────────────────────────────────────────────────
insert into public.vendors (id, name, contact_phone, coverage_areas, offered_service_ids, turnaround_estimate, rating, is_active, price_multiplier, pickup_fee, latitude, longitude, accepts_same_day)
values
  ('00000000-0000-4000-8000-000000000001', 'Placeholder Vendor 1', '9000000001',
   '["bandra-west","khar-west","santacruz-west","bandra-east","mahim","dadar","juhu"]',
   '["wash-fold","wash-iron","ironing","dry-cleaning","premium","bedsheets","blankets"]',
   '{"min_hours": 24, "max_hours": 48}', 4.8, true, 1.10, 49, 19.061200, 72.831200, true),

  ('00000000-0000-4000-8000-000000000002', 'Placeholder Vendor 2', '9000000002',
   '["andheri-west","versova","juhu","santacruz-west","goregaon-west","malad-west","andheri-east"]',
   '["wash-fold","wash-iron","ironing","bedsheets","blankets","shoes"]',
   '{"min_hours": 24, "max_hours": 36}', 4.6, true, 0.95, 39, 19.140900, 72.827700, true),

  ('00000000-0000-4000-8000-000000000003', 'Placeholder Vendor 3', '9000000003',
   '["powai","vikhroli","ghatkopar","kurla","andheri-east","chembur"]',
   '["wash-fold","wash-iron","ironing","dry-cleaning","premium","bedsheets","blankets","shoes"]',
   '{"min_hours": 24, "max_hours": 48}', 4.7, true, 1.05, 49, 19.119700, 72.908100, true),

  ('00000000-0000-4000-8000-000000000004', 'Placeholder Vendor 4', '9000000004',
   '["lower-parel","worli","prabhadevi","dadar","tardeo","mahim","matunga"]',
   '["wash-iron","ironing","dry-cleaning","premium"]',
   '{"min_hours": 48, "max_hours": 72}', 4.5, true, 1.20, 59, 18.997500, 72.828400, false),

  -- rating null on purpose: the UI must hide the stars entirely, not show 0.
  ('00000000-0000-4000-8000-000000000005', 'Placeholder Vendor 5', '9000000005',
   '["malad-west","kandivali-west","borivali-west","goregaon-west"]',
   '["wash-fold","wash-iron","ironing","bedsheets","blankets"]',
   '{"min_hours": 24, "max_hours": 48}', null, true, 0.90, 29, 19.185100, 72.840200, true),

  -- inactive on purpose: exercises the "partner at capacity" state.
  ('00000000-0000-4000-8000-000000000006', 'Placeholder Vendor 6', '9000000006',
   '["dadar","matunga","sion","mahim","prabhadevi","bandra-east"]',
   '["wash-fold","wash-iron","ironing","dry-cleaning","premium","bedsheets","blankets"]',
   '{"min_hours": 24, "max_hours": 48}', 4.6, false, 1.00, 39, 19.020500, 72.842300, false),

  ('00000000-0000-4000-8000-000000000007', 'Placeholder Vendor 7', '9000000007',
   '["chembur","ghatkopar","kurla","sion","vikhroli"]',
   '["wash-fold","wash-iron","ironing","bedsheets","blankets","shoes"]',
   '{"min_hours": 36, "max_hours": 48}', null, true, 0.92, 39, 19.054400, 72.898700, false),

  ('00000000-0000-4000-8000-000000000008', 'Placeholder Vendor 8', '9000000008',
   '["colaba","fort","tardeo","worli","lower-parel"]',
   '["wash-iron","ironing","dry-cleaning","premium","shoes"]',
   '{"min_hours": 48, "max_hours": 72}', 4.7, true, 1.25, 69, 18.910100, 72.816300, true)
on conflict (id) do nothing;

-- Now that vendors exists, tie orders to it. Partners are never hard-deleted
-- (set is_active = false instead), so restrict rather than cascade.
alter table public.orders drop constraint if exists orders_vendor_id_fkey;
alter table public.orders
  add constraint orders_vendor_id_fkey foreign key (vendor_id) references public.vendors (id) on delete restrict;
