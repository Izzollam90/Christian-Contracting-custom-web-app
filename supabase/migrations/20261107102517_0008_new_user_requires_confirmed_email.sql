-- F9: handle_new_user linked a brand-new auth user to an existing customer record
-- purely on a matching email address, with no check that the address was verified.
-- F10 support: resolve deterministically and only on a confirmed address.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare cid text;
begin
  if new.email_confirmed_at is not null then
    select id into cid
      from customers
     where lower(email) = lower(new.email)
     order by created_at nulls last, id
     limit 1;
  end if;

  if cid is null then
    insert into customers (name, email)
    values (coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email)
    returning id into cid;
  end if;

  insert into profiles (id, email, full_name, role, customer_id)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'Customer', cid);
  return new;
end $$;
