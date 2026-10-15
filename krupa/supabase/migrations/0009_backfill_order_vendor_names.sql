-- Orders snapshot the vendor's name at the time they were placed, so the label
-- survives a partner being renamed or removed. The three orders taken before
-- the real Mumbai partners were imported snapshotted the seed rows' names, so
-- the admin order list and customer tracking still read "Placeholder Vendor 8".
--
-- Those names were never real, so point them at the partner that actually owns
-- each order. Genuine snapshots are left alone: only the placeholder labels match.
update public.orders as o
set vendor_name = v.name
from public.vendors as v
where o.vendor_id = v.id
  and o.vendor_name like 'Placeholder Vendor %';
