-- Replace the original placeholder rows in place. The workbook IDs are stable
-- vendor codes; the existing UUID primary keys stay unchanged for orders/logins.
alter table public.vendors
  add column if not exists vendor_code text,
  add column if not exists contact_email text,
  add column if not exists coverage_area_names jsonb not null default '[]'::jsonb;

create unique index if not exists vendors_vendor_code_unique
  on public.vendors (vendor_code)
  where vendor_code is not null;

do $$
declare
  updated_count integer;
begin
  with imported (
    id, vendor_code, name, contact_email, contact_phone, coverage_areas, coverage_area_names
  ) as (
    values
      (
        '00000000-0000-4000-8000-000000000001'::uuid, 'V001', 'Rajendraprasad Kanaujiya',
        'kanojiya19041999@gmail.com', '9930590374',
        '["worli","lower-parel","prabhadevi","dadar","tardeo"]'::jsonb,
        '["Worli","Lower Parel","Prabhadevi","Dadar","Mahalaxmi","Mumbai Central"]'::jsonb
      ),
      (
        '00000000-0000-4000-8000-000000000002'::uuid, 'V002', 'Vishal Kanaujiya',
        'vishalkanaujiya174@gmail.com', '9136132575',
        '["andheri-west","andheri-east","goregaon-west","santacruz-west","versova"]'::jsonb,
        '["Andheri","Jogeshwari","Goregaon","Vile Parle","Santacruz","Versova","Lokhandwala"]'::jsonb
      ),
      (
        '00000000-0000-4000-8000-000000000003'::uuid, 'V003', 'Asha Kanojiya',
        'asha10041977@gmail.com', '9967186011',
        '["malad-west","kandivali-west","goregaon-west","borivali-west"]'::jsonb,
        '["Malad","Kandivali","Goregaon","Borivali","Marve","Mindspace"]'::jsonb
      ),
      (
        '00000000-0000-4000-8000-000000000004'::uuid, 'V004', 'Uma Kanojiya',
        'ukanojiya@gmail.com', '8617343506',
        '["colaba","fort","tardeo"]'::jsonb,
        '["Colaba","Cuffe Parade","Churchgate","Fort","Marine Lines","Nariman Point","Byculla"]'::jsonb
      ),
      (
        '00000000-0000-4000-8000-000000000005'::uuid, 'V005', 'Vikram Kanaujiya',
        'Vikramkanaujiya67@gmail.com', '8591196243',
        '["thane","mulund","airoli"]'::jsonb,
        '["Thane","Mulund","Bhandup","Airoli","Ghodbunder Road","Majiwada"]'::jsonb
      ),
      (
        '00000000-0000-4000-8000-000000000006'::uuid, 'V006', 'Rakesh Chordari',
        'rakeshch1237@gmail.com', '8617343506',
        '["chembur","ghatkopar","kurla","vashi"]'::jsonb,
        '["Chembur","Ghatkopar","Govandi","Deonar","Tilak Nagar","Kurla","Vashi"]'::jsonb
      ),
      (
        '00000000-0000-4000-8000-000000000007'::uuid, 'V007', 'Sonu Dhobi',
        'SonuD12482@gmail.com', '9620702023',
        '["mulund","vikhroli","powai"]'::jsonb,
        '["Bhandup","Kanjurmarg","Vikhroli","Mulund","Powai","Nahur"]'::jsonb
      ),
      (
        '00000000-0000-4000-8000-000000000008'::uuid, 'V008', 'Rishab Kanojiya',
        'RishabKano23830@gmail.com', '9620702023',
        '["kurla","andheri-east","ghatkopar","sion","bandra-east"]'::jsonb,
        '["Kurla","Saki Naka","Chunabhatti","Kalina","Ghatkopar","Bandra East"]'::jsonb
      )
  )
  update public.vendors as vendor
  set
    vendor_code = imported.vendor_code,
    name = imported.name,
    contact_email = imported.contact_email,
    contact_phone = imported.contact_phone,
    coverage_areas = imported.coverage_areas,
    coverage_area_names = imported.coverage_area_names,
    is_active = true
  from imported
  where vendor.id = imported.id;

  get diagnostics updated_count = row_count;
  if updated_count <> 8 then
    raise exception 'Expected to replace 8 placeholder vendors, updated %', updated_count;
  end if;
end;
$$;
