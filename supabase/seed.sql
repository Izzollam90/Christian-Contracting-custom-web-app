-- Herkey Maintenance: fictional seed data, transcribed from glide/data/*.csv.
-- Run AFTER migrations/0001_init.sql and AFTER the sample staff exist in auth.users/profiles
-- (create them with scripts/seed-users.ts, or insert into auth.users directly as service role).
-- All people, addresses and amounts are fictional. Money in integer cents, timestamps UTC.

-- ============ lookups & config ============
insert into settings (key, value, notes) values
  ('CompanyName', 'Herkey Maintenance', 'Christian Contracting is a possible legal/brand name'),
  ('Timezone', 'America/New_York', 'Reports use this for "this month"'),
  ('GeofenceMeters', '200', 'Clock-in distance check (supporting evidence only)'),
  ('OvertimeAfterHours', '40', 'Weekly; paid at 1.5x. Not final.'),
  ('InvoiceDueDays', '30', 'Payment terms. Not final.');

insert into service_categories (category, description, active) values
  ('Plumbing', 'Leaks, drains, fixtures', true),
  ('Electrical', 'Lights, outlets, switches', true),
  ('HVAC', 'Heat, A/C, filters', true),
  ('Carpentry', 'Doors, trim, railings', true),
  ('Appliance Repair', 'Washers, ranges, fridges', true),
  ('Painting', 'Interior and exterior', true),
  ('Exterior', 'Gutters, siding, decks', true),
  ('General Repair', 'Anything else', true);

insert into time_slots (slot, start_time, end_time, sort_order) values
  ('8-10 am', '08:00', '10:00', 1),
  ('10 am-12 pm', '10:00', '12:00', 2),
  ('1-3 pm', '13:00', '15:00', 3),
  ('3-5 pm', '15:00', '17:00', 4);

-- ============ customers ============
-- If a sample customer already signed in, handle_new_user created a bare customer row; replace
-- those with the canonical fictional records and re-link profiles. Otherwise this is a plain insert.
update profiles set customer_id = null
where email in ('dana.whitfield@example.com','robert.ames@example.com','greenfield.pm@example.com','linda.moss@example.com');
delete from customers
where email in ('dana.whitfield@example.com','robert.ames@example.com','greenfield.pm@example.com','linda.moss@example.com');
insert into customers (id, name, email, phone, street, city, state, zip, latitude, longitude, created_at) values
  ('C-01', 'Dana Whitfield', 'dana.whitfield@example.com', '(717) 555-0142', '410 Maple Ridge Rd, Apt 204', 'Lancaster', 'PA', '17601', 40.0412, -76.3021, '2026-09-01T14:00:00Z'),
  ('C-02', 'Robert Ames', 'robert.ames@example.com', '(717) 555-0157', '18 Cedar St, Unit B', 'Lancaster', 'PA', '17602', 40.0480, -76.2952, '2026-09-01T14:00:00Z'),
  ('C-03', 'Greenfield Property Group', 'greenfield.pm@example.com', '(717) 555-0188', '22 Orchard Ln', 'Lancaster', 'PA', '17603', 40.0365, -76.2890, '2026-09-01T14:00:00Z'),
  ('C-04', 'Linda Moss', 'linda.moss@example.com', '(717) 555-0163', '77 King St', 'Lancaster', 'PA', '17602', 40.0390, -76.3100, '2026-09-01T14:00:00Z');
update profiles p set customer_id = c.id from customers c where p.email = c.email and p.customer_id is null;

-- ============ jobs ============
-- crew references resolve by staff email in profiles.
insert into jobs (id, title, description, category, priority, status, customer_id, service_address, crew_id, preferred_date, time_slot, created_at, accepted_at, completed_at) values
  ('J-1041', 'Kitchen sink leaking under cabinet', 'Slow drip from the trap. A bucket is under it for now.', 'Plumbing', 'Soon', 'In Progress', 'C-01', '410 Maple Ridge Rd, Apt 204, Lancaster, PA 17601', (select id from profiles where email='marcus.lee@example.com'), '2026-11-06', '10 am-12 pm', '2026-11-04T14:00:00Z', '2026-11-04T16:00:00Z', null),
  ('J-1042', 'Hallway light fixture out', 'Fixture by the stairwell flickers then goes dark.', 'Electrical', 'Routine', 'Scheduled', 'C-01', '410 Maple Ridge Rd, Apt 204, Lancaster, PA 17601', (select id from profiles where email='tasha.green@example.com'), '2026-11-09', '8-10 am', '2026-11-05T13:00:00Z', '2026-11-05T17:00:00Z', null),
  ('J-1043', 'Gutter cleanout, both sides', 'Seasonal cleanout before winter.', 'Exterior', 'Routine', 'Requested', 'C-02', '18 Cedar St, Unit B, Lancaster, PA 17602', null, '2026-11-12', '1-3 pm', '2026-11-06T12:00:00Z', null, null),
  ('J-1044', 'Furnace filter and inspection', 'Annual service. Two dogs in the home.', 'HVAC', 'Soon', 'Requested', 'C-02', '18 Cedar St, Unit B, Lancaster, PA 17602', null, '2026-11-10', '8-10 am', '2026-11-06T15:00:00Z', null, null),
  ('J-1045', 'Unit turnover: paint and patch', '2BR turnover, move-in in 10 days.', 'Painting', 'Routine', 'Accepted', 'C-03', '22 Orchard Ln, Lancaster, PA 17603', (select id from profiles where email='eli.ortiz@example.com'), null, null, '2026-11-05T12:00:00Z', '2026-11-05T16:00:00Z', null),
  ('J-1046', 'Repaint living room and trim', 'Two walls plus baseboards. Match the existing warm white.', 'Painting', 'Routine', 'Requested', 'C-01', '410 Maple Ridge Rd, Apt 204, Lancaster, PA 17601', null, '2026-11-13', '10 am-12 pm', '2026-11-06T13:00:00Z', null, null),
  ('J-1047', 'Dishwasher not draining', 'Standing water after every cycle.', 'Appliance Repair', 'Emergency', 'Requested', 'C-04', '77 King St, Lancaster, PA 17602', null, '2026-11-07', '8-10 am', '2026-11-06T17:20:00Z', null, null),
  ('J-1039', 'Back door sticks', 'Swelling at the latch side.', 'Carpentry', 'Routine', 'Scheduled', 'C-04', '77 King St, Lancaster, PA 17602', (select id from profiles where email='marcus.lee@example.com'), '2026-11-10', '1-3 pm', '2026-11-02T15:00:00Z', '2026-11-02T18:00:00Z', null),
  ('J-1040', 'Porch railing re-anchor', 'Waiting on brackets (backordered).', 'Carpentry', 'Emergency', 'On Hold', 'C-02', '18 Cedar St, Unit B, Lancaster, PA 17602', (select id from profiles where email='eli.ortiz@example.com'), '2026-11-11', '10 am-12 pm', '2026-10-31T14:00:00Z', '2026-10-31T15:00:00Z', null),
  ('J-1038', 'Patch and paint drywall', 'Two holes from move-out.', 'Painting', 'Routine', 'Completed', 'C-01', '410 Maple Ridge Rd, Apt 204, Lancaster, PA 17601', (select id from profiles where email='eli.ortiz@example.com'), '2026-10-28', '1-3 pm', '2026-10-25T14:00:00Z', '2026-10-26T13:00:00Z', '2026-10-29T20:00:00Z'),
  ('J-1035', 'Storm door rehang', 'Door drags on the threshold.', 'Carpentry', 'Routine', 'Completed', 'C-04', '77 King St, Lancaster, PA 17602', (select id from profiles where email='marcus.lee@example.com'), '2026-11-03', '8-10 am', '2026-10-30T14:00:00Z', '2026-10-30T16:00:00Z', '2026-11-03T15:30:00Z'),
  ('J-1033', 'Bath fan replacement', 'Fan is loud and barely pulls air.', 'Electrical', 'Routine', 'Completed', 'C-03', '22 Orchard Ln, Lancaster, PA 17603', (select id from profiles where email='tasha.green@example.com'), '2026-11-02', '10 am-12 pm', '2026-10-27T14:00:00Z', '2026-10-27T18:00:00Z', '2026-11-02T16:45:00Z');

select setval('jobs_seq', 1047);

-- ============ activity log ============
insert into activity_log (job_id, at, actor_id, action, visible_to_customer) values
  ('J-1041', '2026-11-04T14:00:00Z', (select id from profiles where email='dana.whitfield@example.com'), 'Request submitted', true),
  ('J-1041', '2026-11-04T16:00:00Z', (select id from profiles where email='marcus.lee@example.com'), 'Claimed job', true),
  ('J-1041', '2026-11-04T18:10:00Z', (select id from profiles where email='dana.whitfield@example.com'), 'Accepted estimate EST-2049', true),
  ('J-1041', '2026-11-06T15:05:00Z', (select id from profiles where email='marcus.lee@example.com'), 'On site. Trap washer worn; replacing.', true),
  ('J-1042', '2026-11-05T13:00:00Z', (select id from profiles where email='dana.whitfield@example.com'), 'Request submitted', true),
  ('J-1042', '2026-11-05T17:00:00Z', (select id from profiles where email='renee.carter@example.com'), 'Assigned to Tasha Green; scheduled Nov 9, 8-10 am', true),
  ('J-1043', '2026-11-06T12:00:00Z', (select id from profiles where email='robert.ames@example.com'), 'Request submitted', true),
  ('J-1044', '2026-11-06T15:00:00Z', (select id from profiles where email='robert.ames@example.com'), 'Request submitted', true),
  ('J-1045', '2026-11-05T12:00:00Z', (select id from profiles where email='owner@example.com'), 'Job created by office', true),
  ('J-1045', '2026-11-05T16:00:00Z', (select id from profiles where email='eli.ortiz@example.com'), 'Claimed job', true),
  ('J-1046', '2026-11-06T13:00:00Z', (select id from profiles where email='dana.whitfield@example.com'), 'Request submitted', true),
  ('J-1046', '2026-11-06T15:05:00Z', (select id from profiles where email='renee.carter@example.com'), 'Sent estimate EST-2053', true),
  ('J-1047', '2026-11-06T17:20:00Z', (select id from profiles where email='linda.moss@example.com'), 'Emergency request submitted', true),
  ('J-1040', '2026-11-03T14:00:00Z', (select id from profiles where email='eli.ortiz@example.com'), 'On hold: brackets backordered', true),
  ('J-1038', '2026-10-29T20:00:00Z', (select id from profiles where email='eli.ortiz@example.com'), 'Marked complete', true),
  ('J-1035', '2026-11-03T15:30:00Z', (select id from profiles where email='marcus.lee@example.com'), 'Marked complete', true),
  ('J-1033', '2026-11-02T16:45:00Z', (select id from profiles where email='tasha.green@example.com'), 'Marked complete', true);

-- ============ estimates & lines ============
insert into estimates (id, job_id, status, created_by, created_at, sent_at, responded_at, customer_comment) values
  ('EST-2053', 'J-1046', 'Sent', (select id from profiles where email='renee.carter@example.com'), '2026-11-06T15:00:00Z', '2026-11-06T15:05:00Z', null, null),
  ('EST-2052', 'J-1045', 'Draft', (select id from profiles where email='eli.ortiz@example.com'), '2026-11-05T20:00:00Z', null, null, null),
  ('EST-2049', 'J-1041', 'Accepted', (select id from profiles where email='marcus.lee@example.com'), '2026-11-04T16:30:00Z', '2026-11-04T16:35:00Z', '2026-11-04T18:10:00Z', null),
  ('EST-2047', 'J-1033', 'Accepted', (select id from profiles where email='tasha.green@example.com'), '2026-10-28T14:00:00Z', '2026-10-28T14:05:00Z', '2026-10-28T19:00:00Z', null);

insert into estimate_lines (estimate_id, description, quantity, unit_price_cents) values
  ('EST-2053', 'Wall prep and patching', 2, 6500),
  ('EST-2053', 'Paint, 2 coats, 2 walls', 1, 38000),
  ('EST-2053', 'Baseboard trim, semi-gloss', 1, 12500),
  ('EST-2053', 'Paint and materials', 1, 9400),
  ('EST-2052', 'Turnover paint, 2BR (labor hours)', 16, 4500),
  ('EST-2052', 'Paint and supplies', 1, 21000),
  ('EST-2049', 'Plumbing labor (hours)', 1.5, 8500),
  ('EST-2049', 'P-trap kit', 1, 1800),
  ('EST-2047', 'Electrical labor (hours)', 2, 9000),
  ('EST-2047', 'Bath fan, 80 CFM', 1, 11900);

select setval('estimates_seq', 2053);

-- ============ invoices & lines ============
insert into invoices (id, job_id, estimate_id, status, issued_at, due_date, paid_at, payment_method) values
  ('INV-3018', 'J-1038', null, 'Unpaid', '2026-10-29T21:00:00Z', '2026-11-28', null, null),
  ('INV-3016', 'J-1035', null, 'Paid', '2026-11-03T18:00:00Z', '2026-12-03', '2026-11-05T15:00:00Z', 'Check'),
  ('INV-3014', 'J-1033', 'EST-2047', 'Unpaid', '2026-11-02T19:00:00Z', '2026-12-02', null, null);

insert into invoice_lines (invoice_id, description, quantity, unit_price_cents) values
  ('INV-3018', 'Drywall repair labor (hours)', 4, 6000),
  ('INV-3018', 'Compound, primer, paint', 1, 4600),
  ('INV-3016', 'Storm door rehang', 1, 14500),
  ('INV-3014', 'Electrical labor (hours)', 2, 9000),
  ('INV-3014', 'Bath fan, 80 CFM', 1, 11900);

select setval('invoices_seq', 3018);

-- ============ expenses ============
insert into expenses (submitted_by, job_id, category, vendor, amount_cents, expense_date, status, reviewed_by, note) values
  ((select id from profiles where email='marcus.lee@example.com'), null, 'Materials', 'Ace Supply', 18000, '2026-11-06', 'Approved', (select id from profiles where email='renee.carter@example.com'), 'Drain parts restock'),
  ((select id from profiles where email='eli.ortiz@example.com'), null, 'Fuel', 'Sheetz', 9500, '2026-11-05', 'Approved', (select id from profiles where email='renee.carter@example.com'), null),
  ((select id from profiles where email='tasha.green@example.com'), null, 'Tools', 'Home Depot', 24000, '2026-11-02', 'Approved', (select id from profiles where email='pat.kim@example.com'), 'Cordless driver'),
  ((select id from profiles where email='marcus.lee@example.com'), null, 'Fuel', 'Sheetz', 6200, '2026-10-29', 'Approved', (select id from profiles where email='renee.carter@example.com'), null),
  ((select id from profiles where email='renee.carter@example.com'), null, 'Equipment rental', 'Sunbelt Rentals', 14500, '2026-10-31', 'Approved', (select id from profiles where email='pat.kim@example.com'), 'Ladder rental'),
  ((select id from profiles where email='renee.carter@example.com'), 'J-1040', 'Subcontractor', 'Keystone Welding', 65000, '2026-10-23', 'Approved', (select id from profiles where email='pat.kim@example.com'), 'Railing brackets fabrication'),
  ((select id from profiles where email='tasha.green@example.com'), 'J-1033', 'Materials', 'Ace Supply', 8900, '2026-10-28', 'Approved', (select id from profiles where email='renee.carter@example.com'), 'Fan and duct'),
  ((select id from profiles where email='eli.ortiz@example.com'), 'J-1038', 'Materials', 'Home Depot', 4600, '2026-10-28', 'Approved', (select id from profiles where email='renee.carter@example.com'), 'Compound, primer'),
  ((select id from profiles where email='marcus.lee@example.com'), null, 'Fuel', 'Sheetz', 7100, '2026-10-14', 'Approved', (select id from profiles where email='renee.carter@example.com'), null),
  ((select id from profiles where email='renee.carter@example.com'), null, 'Equipment rental', 'Sunbelt Rentals', 22000, '2026-10-10', 'Approved', (select id from profiles where email='pat.kim@example.com'), null),
  ((select id from profiles where email='marcus.lee@example.com'), 'J-1041', 'Materials', 'Ace Supply', 1800, '2026-11-06', 'Submitted', null, 'P-trap kit'),
  ((select id from profiles where email='eli.ortiz@example.com'), null, 'Fuel', 'Sheetz', 4275, '2026-11-05', 'Submitted', null, 'Truck 2 fill-up');

-- ============ time entries ============
insert into time_entries (user_id, job_id, customer_id, clock_in, clock_out, distance_meters, location_check, review, note) values
  ((select id from profiles where email='marcus.lee@example.com'), null, 'C-04', '2026-10-29T12:37:00Z', '2026-10-29T20:37:00Z', 67, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='marcus.lee@example.com'), null, 'C-01', '2026-10-30T12:44:00Z', '2026-10-30T21:14:00Z', 104, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='marcus.lee@example.com'), null, 'C-04', '2026-11-02T12:51:00Z', '2026-11-02T20:21:00Z', 141, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='marcus.lee@example.com'), null, 'C-01', '2026-11-03T12:58:00Z', '2026-11-03T20:58:00Z', 38, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='marcus.lee@example.com'), null, 'C-04', '2026-11-04T13:05:00Z', '2026-11-04T21:35:00Z', 75, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='marcus.lee@example.com'), null, 'C-01', '2026-11-05T12:32:00Z', '2026-11-05T20:02:00Z', 112, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='tasha.green@example.com'), null, 'C-01', '2026-10-29T12:39:00Z', '2026-10-29T20:39:00Z', 149, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='tasha.green@example.com'), null, 'C-03', '2026-10-30T12:46:00Z', '2026-10-30T21:16:00Z', 46, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='tasha.green@example.com'), null, 'C-01', '2026-11-02T12:53:00Z', '2026-11-02T20:23:00Z', 83, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='tasha.green@example.com'), null, 'C-03', '2026-11-03T13:00:00Z', '2026-11-03T21:00:00Z', 120, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='tasha.green@example.com'), null, 'C-01', '2026-11-04T13:07:00Z', '2026-11-04T21:37:00Z', 157, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='tasha.green@example.com'), null, 'C-03', '2026-11-05T12:34:00Z', '2026-11-05T20:04:00Z', 54, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='eli.ortiz@example.com'), null, 'C-02', '2026-10-29T12:41:00Z', '2026-10-29T20:41:00Z', 91, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='eli.ortiz@example.com'), null, 'C-03', '2026-10-30T12:48:00Z', '2026-10-30T21:18:00Z', 128, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='eli.ortiz@example.com'), null, 'C-02', '2026-11-02T12:55:00Z', '2026-11-02T20:25:00Z', 165, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='eli.ortiz@example.com'), null, 'C-03', '2026-11-03T13:02:00Z', '2026-11-03T21:02:00Z', 62, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='eli.ortiz@example.com'), null, 'C-02', '2026-11-04T13:09:00Z', '2026-11-04T21:39:00Z', 99, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='eli.ortiz@example.com'), null, 'C-03', '2026-11-05T12:36:00Z', '2026-11-05T21:00:00Z', 136, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='renee.carter@example.com'), null, 'C-04', '2026-10-29T12:43:00Z', '2026-10-29T20:43:00Z', 33, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='renee.carter@example.com'), null, 'C-02', '2026-10-30T12:50:00Z', '2026-10-30T21:20:00Z', 70, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='renee.carter@example.com'), null, 'C-04', '2026-11-02T12:57:00Z', '2026-11-02T20:27:00Z', 107, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='renee.carter@example.com'), null, 'C-02', '2026-11-03T13:04:00Z', '2026-11-03T21:04:00Z', 144, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='renee.carter@example.com'), null, 'C-04', '2026-11-04T12:31:00Z', '2026-11-04T21:01:00Z', 41, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='renee.carter@example.com'), null, 'C-02', '2026-11-05T12:38:00Z', '2026-11-05T20:08:00Z', 78, 'Within geofence', 'Approved', null),
  ((select id from profiles where email='eli.ortiz@example.com'), 'J-1045', 'C-03', '2026-11-05T12:36:00Z', '2026-11-05T21:00:00Z', 260, 'Outside geofence', 'Needs Review', 'Gate locked, clocked in from the street.'),
  ((select id from profiles where email='marcus.lee@example.com'), 'J-1041', 'C-01', '2026-11-06T14:52:00Z', null, 38, 'Within geofence', 'Open', null);
