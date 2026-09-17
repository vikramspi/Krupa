-- Sign in with Google.
--
-- google_id is Google's stable account id (the ID token's `sub` claim). It is the
-- primary match on every Google sign-in; email is only a fallback used to link an
-- existing account the first time. A Google account never has to have a password.
--
-- Re-runnable. Table-level grants from 0004 already cover the new column.

alter table public.customers
  add column if not exists google_id text;

create unique index if not exists customers_google_id_unique
  on public.customers (google_id)
  where google_id is not null;
