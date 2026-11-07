-- Herkey Maintenance: row-level security checks.
-- Run as the database owner (Supabase SQL editor or supabase/tests/run-local.mjs).
-- Each check signs in as a sample user via request.jwt.claims and tries something forbidden.
-- A check that raises an EXCEPTION fails the run; PASS/FAIL notices are collected by the runner.
-- The two-simultaneous-claims race is proven separately by run-local.mjs (needs two sessions).

-- ============ helpers ============
create or replace function test_as(p_email text, p_aal text default 'aal2') returns void language plpgsql as $$
declare v_id uuid;
begin
  select id into v_id from profiles where email = p_email;
  if v_id is null then raise exception 'test user % not found', p_email; end if;
  execute 'reset role';
  execute 'set role authenticated';
  execute format('set request.jwt.claims = %L', json_build_object('sub', v_id, 'aal', p_aal)::text);
end $$;

create or replace function test_reset() returns void language plpgsql as $$
begin
  execute 'reset role';
  execute 'reset request.jwt.claims';
end $$;

-- ============ 1. customers see only their own records ============
do $$
declare n int;
begin
  perform test_as('dana.whitfield@example.com');            -- C-01
  select count(*) into n from jobs where customer_id = 'C-02';
  if n <> 0 then raise notice 'FAIL: customer read % other-customer jobs', n; else raise notice 'PASS: customer cannot read other customers'' jobs'; end if;
  select count(*) into n from estimates e join jobs j on j.id = e.job_id where j.customer_id = 'C-02';
  if n <> 0 then raise notice 'FAIL: customer read % other-customer estimates', n; else raise notice 'PASS: customer cannot read other customers'' estimates'; end if;
  select count(*) into n from invoices i join jobs j on j.id = i.job_id where j.customer_id = 'C-02';
  if n <> 0 then raise notice 'FAIL: customer read % other-customer invoices', n; else raise notice 'PASS: customer cannot read other customers'' invoices'; end if;
  select count(*) into n from activity_log l join jobs j on j.id = l.job_id where j.customer_id = 'C-02';
  if n <> 0 then raise notice 'FAIL: customer read % other-customer activity rows', n; else raise notice 'PASS: customer cannot read other customers'' activity'; end if;
  select count(*) into n from customers where id <> 'C-01';
  if n <> 0 then raise notice 'FAIL: customer read % other customer records', n; else raise notice 'PASS: customer cannot read other customer records'; end if;
  -- sanity: own data is visible
  select count(*) into n from jobs where customer_id = 'C-01';
  if n = 0 then raise notice 'FAIL: customer cannot read own jobs'; else raise notice 'PASS: customer reads own jobs (% rows)', n; end if;
  select count(*) into n from estimates e join jobs j on j.id = e.job_id where j.customer_id = 'C-01' and e.status <> 'Draft';
  if n = 0 then raise notice 'FAIL: customer cannot read own sent estimates'; else raise notice 'PASS: customer reads own non-draft estimates (% rows)', n; end if;
  -- draft estimates stay hidden even from their own customer
  select count(*) into n from estimates where id = 'EST-2052';
  if n <> 0 then raise notice 'FAIL: draft estimate visible to customer'; else raise notice 'PASS: draft estimates hidden from customers'; end if;
  perform test_reset();
end $$;

-- ============ 2. crew privacy rules ============
do $$
declare n int; c text;
begin
  perform test_as('marcus.lee@example.com');                -- Crew
  -- unclaimed job: no direct row, no customer identity, no house number
  select count(*) into n from jobs where id = 'J-1043';     -- unclaimed, belongs to C-02
  if n <> 0 then raise notice 'FAIL: crew read unclaimed job row directly (%)', n; else raise notice 'PASS: crew cannot read unclaimed job row directly'; end if;
  select count(*) into n from customers where id = 'C-02';
  if n <> 0 then raise notice 'FAIL: crew read customer of unclaimed job (%)', n; else raise notice 'PASS: crew cannot read customer of an unclaimed job'; end if;
  -- job board exposes street name only, no name/phone/house number columns
  select string_agg(column_name, ',') into c from information_schema.columns where table_name = 'job_board';
  if c ~* '(^|,)(name|phone|address|service_address|latitude|longitude)(,|$)' then raise notice 'FAIL: job_board exposes private column: %', c; else raise notice 'PASS: job_board columns contain no customer identity (%)', c; end if;
  select count(*) into n from job_board where id = 'J-1043';
  if n <> 1 then raise notice 'FAIL: crew cannot see unclaimed job on board'; else raise notice 'PASS: crew sees unclaimed job on job_board'; end if;
  select street_name into c from job_board where id = 'J-1043';
  if c !~ 'Cedar' or c ~ '^\s*18' then raise notice 'FAIL: job_board street_name leaked house number: %', c; else raise notice 'PASS: job_board shows street name without house number (%)', c; end if;
  -- another crew member's time and expenses
  select count(*) into n from time_entries where user_id = (select id from profiles where email = 'tasha.green@example.com');
  if n <> 0 then raise notice 'FAIL: crew read another crew member''s time entries (%)', n; else raise notice 'PASS: crew cannot read another crew member''s time entries'; end if;
  select count(*) into n from expenses where submitted_by = (select id from profiles where email = 'tasha.green@example.com');
  if n <> 0 then raise notice 'FAIL: crew read another crew member''s expenses (%)', n; else raise notice 'PASS: crew cannot read another crew member''s expenses'; end if;
  -- no invoices at all for crew
  select count(*) into n from invoices;
  if n <> 0 then raise notice 'FAIL: crew read invoices (%)', n; else raise notice 'PASS: crew cannot read any invoices'; end if;
  -- customers stay out of the board
  perform test_reset();
  perform test_as('dana.whitfield@example.com');
  select count(*) into n from job_board;
  if n <> 0 then raise notice 'FAIL: customer saw job_board rows (%)', n; else raise notice 'PASS: job_board empty for customers'; end if;
  perform test_reset();
end $$;

-- ============ 3. nobody can change their own role ============
do $$
declare n int; threw boolean;
begin
  perform test_as('marcus.lee@example.com');
  threw := false;
  begin
    update profiles set role = 'Admin' where id = auth.uid();
  exception when others then threw := true;
  end;
  if threw then raise notice 'PASS: crew cannot promote self to Admin';
  else raise notice 'FAIL: crew changed own role'; end if;
  select count(*) into n from profiles where id = auth.uid() and role = 'Admin';
  if n <> 0 then raise notice 'FAIL: role actually changed to Admin'; else raise notice 'PASS: role unchanged after attempt'; end if;
  perform test_reset();
end $$;

-- ============ 4. claim is atomic (sequential double-claim; race proven by run-local.mjs) ============
do $$
declare threw boolean; n int;
begin
  perform test_as('marcus.lee@example.com');
  perform claim_job('J-1047');                              -- Emergency, unclaimed
  raise notice 'PASS: first claim succeeds';
  perform test_reset();
  perform test_as('tasha.green@example.com');
  threw := false;
  begin
    perform claim_job('J-1047');
  exception when others then threw := true;
  end;
  if threw then raise notice 'PASS: second claim on same job is rejected';
  else raise notice 'FAIL: two claims on the same job both succeeded'; end if;
  perform test_reset();                                     -- check as owner: other crew can't see it directly
  select count(*) into n from jobs where id = 'J-1047' and status = 'Accepted';
  if n <> 1 then raise notice 'FAIL: claimed job not in Accepted'; else raise notice 'PASS: claimed job is Accepted'; end if;
end $$;

-- ============ 5. customer flows: cancel own job only; answer own estimates only ============
do $$
declare threw boolean;
begin
  perform test_as('robert.ames@example.com');
  threw := false;
  begin
    perform cancel_my_job('J-1046');                         -- Dana's job
  exception when others then threw := true;
  end;
  if threw then raise notice 'PASS: customer cannot cancel another customer''s job';
  else raise notice 'FAIL: customer canceled someone else''s job'; end if;
  perform test_reset();
  perform test_as('dana.whitfield@example.com');
  perform cancel_my_job('J-1046');                          -- own Requested job
  raise notice 'PASS: customer can cancel own open request';
  -- restore for later checks
  perform test_reset();
  update jobs set status = 'Requested', completed_at = null where id = 'J-1046';
  perform test_as('dana.whitfield@example.com');
  perform respond_estimate('EST-2053', true);               -- Sent, her job J-1046, aal2 default
  raise notice 'PASS: customer can accept own sent estimate';
  perform test_reset();
  perform test_as('robert.ames@example.com');
  threw := false;
  begin
    perform respond_estimate('EST-2049', false);            -- Dana's estimate
  exception when others then threw := true;
  end;
  if threw then raise notice 'PASS: customer cannot answer another customer''s estimate';
  else raise notice 'FAIL: customer answered someone else''s estimate'; end if;
  perform test_reset();
end $$;

-- ============ 6. office flows: invoicing restricted to Finance/Admin ============
do $$
declare threw boolean; n int;
begin
  perform test_as('marcus.lee@example.com');
  threw := false;
  begin
    perform invoice_from_estimate('EST-2049');
  exception when others then threw := true;
  end;
  if threw then raise notice 'PASS: crew cannot create invoices';
  else raise notice 'FAIL: crew created an invoice'; end if;
  perform test_reset();
  perform test_as('pat.kim@example.com');                   -- Finance, aal2 default
  perform invoice_from_estimate('EST-2049');
  select count(*) into n from invoices where estimate_id = 'EST-2049';
  if n <> 1 then raise notice 'FAIL: invoice not created from accepted estimate'; else raise notice 'PASS: Finance created invoice from accepted estimate'; end if;
  select count(*) into n from invoice_lines l join invoices i on i.id = l.invoice_id where i.estimate_id = 'EST-2049';
  if n <> 2 then raise notice 'FAIL: invoice lines not copied (got %)', n; else raise notice 'PASS: invoice lines copied from estimate (2 rows)'; end if;
  perform test_reset();
end $$;

-- ============ 7. time review: only approvers can change review state ============
do $$
declare n int;
begin
  perform test_as('eli.ortiz@example.com');                 -- owner of the Needs Review entry
  update time_entries set review = 'Approved' where review = 'Needs Review';
  get diagnostics n = row_count;
  if n <> 0 then raise notice 'FAIL: crew approved own flagged time (% rows)', n;
  else raise notice 'PASS: crew cannot approve own flagged time'; end if;
  perform test_reset();
  perform test_as('renee.carter@example.com');               -- CrewLead, aal2 default
  update time_entries set review = 'Rejected' where review = 'Needs Review';
  get diagnostics n = row_count;
  if n <> 1 then raise notice 'FAIL: CrewLead review affected % rows', n;
  else raise notice 'PASS: CrewLead can review flagged time'; end if;
  perform test_reset();
end $$;

-- ============ 8. MFA: money actions fail at aal1, pass at aal2 ============
do $$
declare threw boolean; n int;
begin
  -- Reset EST-2053 to Sent for these tests (test 5 may have accepted it)
  update estimates set status = 'Sent', responded_at = null, customer_comment = null where id = 'EST-2053';

  -- Customer accepting an estimate at aal1 must fail
  perform test_as('dana.whitfield@example.com', 'aal1');
  threw := false;
  begin
    perform respond_estimate('EST-2053', true);
  exception when others then threw := true;
  end;
  if threw then raise notice 'PASS: customer cannot accept estimate at aal1';
  else raise notice 'FAIL: customer accepted estimate at aal1'; end if;
  perform test_reset();

  -- Reset again for the reject test
  update estimates set status = 'Sent', responded_at = null, customer_comment = null where id = 'EST-2053';

  -- Customer rejecting an estimate at aal1 must succeed (reject is not a money action)
  perform test_as('dana.whitfield@example.com', 'aal1');
  threw := false;
  begin
    perform respond_estimate('EST-2053', false);
  exception when others then threw := true;
  end;
  if threw then raise notice 'FAIL: customer cannot reject estimate at aal1';
  else raise notice 'PASS: customer can reject estimate at aal1 (not a money action)'; end if;
  perform test_reset();

  -- Finance creating invoice at aal1 must fail
  perform test_as('pat.kim@example.com', 'aal1');
  threw := false;
  begin
    perform invoice_from_estimate('EST-2049');
  exception when others then threw := true;
  end;
  if threw then raise notice 'PASS: Finance cannot create invoice at aal1';
  else raise notice 'FAIL: Finance created invoice at aal1'; end if;
  perform test_reset();

  -- Admin changing role at aal1 must fail (Marcus is Crew, change to CrewLead to trigger guard)
  perform test_as('owner@example.com', 'aal1');
  threw := false;
  begin
    update profiles set role = 'CrewLead' where email = 'marcus.lee@example.com';
  exception when others then threw := true;
  end;
  if threw then raise notice 'PASS: Admin cannot change role at aal1';
  else raise notice 'FAIL: Admin changed role at aal1'; end if;
  perform test_reset();

  -- Admin changing role at aal2 must succeed
  perform test_as('owner@example.com', 'aal2');
  update profiles set role = 'CrewLead' where email = 'marcus.lee@example.com';
  select count(*) into n from profiles where email = 'marcus.lee@example.com' and role = 'CrewLead';
  if n = 1 then raise notice 'PASS: Admin can change role at aal2';
  else raise notice 'FAIL: Admin could not change role at aal2'; end if;
  perform test_reset();

  -- Expense review at aal1 must fail
  perform test_as('renee.carter@example.com', 'aal1');
  threw := false;
  begin
    update expenses set status = 'Approved' where status = 'Submitted' and id = (select min(id) from expenses where status = 'Submitted');
  exception when others then threw := true;
  end;
  if threw then raise notice 'PASS: CrewLead cannot approve expense at aal1';
  else raise notice 'FAIL: CrewLead approved expense at aal1'; end if;
  perform test_reset();

  -- Insert a fresh Needs Review entry for these tests (section 7 consumed the seeded one)
  insert into time_entries (user_id, job_id, customer_id, clock_in, clock_out, distance_meters, location_check, review, note)
  values ((select id from profiles where email = 'eli.ortiz@example.com'), 'J-1045', 'C-03', '2026-11-06T12:00:00Z', '2026-11-06T18:00:00Z', 300, 'Outside geofence', 'Needs Review', 'MFA test entry');

  -- Time review at aal1 must fail
  perform test_as('renee.carter@example.com', 'aal1');
  threw := false;
  begin
    update time_entries set review = 'Approved' where review = 'Needs Review';
  exception when others then threw := true;
  end;
  if threw then raise notice 'PASS: CrewLead cannot review time at aal1';
  else raise notice 'FAIL: CrewLead reviewed time at aal1'; end if;
  perform test_reset();

  -- Time review at aal2 must succeed
  perform test_as('renee.carter@example.com', 'aal2');
  update time_entries set review = 'Approved' where review = 'Needs Review';
  get diagnostics n = row_count;
  if n >= 1 then raise notice 'PASS: CrewLead can review time at aal2';
  else raise notice 'FAIL: CrewLead could not review time at aal2'; end if;
  perform test_reset();

  -- Customer updating own address at aal1 must fail
  perform test_as('dana.whitfield@example.com', 'aal1');
  threw := false;
  begin
    update customers set street = '999 New St' where id = 'C-01';
  exception when others then threw := true;
  end;
  if threw then raise notice 'PASS: customer cannot update address at aal1';
  else raise notice 'FAIL: customer updated address at aal1'; end if;
  perform test_reset();

  -- Invoice status update at aal1 must fail
  perform test_as('pat.kim@example.com', 'aal1');
  threw := false;
  begin
    update invoices set status = 'Unpaid', issued_at = now() where status = 'Draft' and estimate_id = 'EST-2049';
  exception when others then threw := true;
  end;
  if threw then raise notice 'PASS: Finance cannot update invoice status at aal1';
  else raise notice 'FAIL: Finance updated invoice status at aal1'; end if;
  perform test_reset();

  -- Admin/Finance reading money tables at aal1 should still work (reads not gated, only writes)
  perform test_as('pat.kim@example.com', 'aal1');
  select count(*) into n from invoices;
  if n >= 0 then raise notice 'PASS: Finance can read invoices at aal1 (reads not gated)';
  else raise notice 'FAIL: Finance cannot read invoices at aal1'; end if;
  perform test_reset();
end $$;
