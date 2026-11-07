-- F10: `email text unique` is case-sensitive, so two customer rows could differ only
-- by capitalisation while account linking resolves with lower(email). Enforce the
-- canonical form the lookup actually uses.
create unique index if not exists customers_email_lower_key
  on public.customers (lower(email))
  where email is not null;
