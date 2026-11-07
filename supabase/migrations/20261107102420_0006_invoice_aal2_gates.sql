-- F5: office reads of the invoice ledger were gated only by the React Aal2Gate.
-- F7: invoice creation had no aal2 check (the RPC does).
-- F8: invoice deletion had no aal2 check.
-- Customers keep their own un-gated read via inv_customer_read.
drop policy if exists inv_office_select on invoices;
create policy inv_office_select on invoices for select to authenticated
  using (has_role('Finance','Admin') and is_aal2());

drop policy if exists inv_office_insert on invoices;
create policy inv_office_insert on invoices for insert to authenticated
  with check (has_role('Finance','Admin') and is_aal2());

drop policy if exists inv_office_delete on invoices;
create policy inv_office_delete on invoices for delete to authenticated
  using (has_role('Finance','Admin') and is_aal2());

-- invoice_lines office writes follow the same money gate
drop policy if exists invl_office on invoice_lines;
create policy invl_office_select on invoice_lines for select to authenticated
  using (has_role('Finance','Admin') and is_aal2());
create policy invl_office_insert on invoice_lines for insert to authenticated
  with check (has_role('Finance','Admin') and is_aal2());
create policy invl_office_update on invoice_lines for update to authenticated
  using (has_role('Finance','Admin'))
  with check (has_role('Finance','Admin') and is_aal2());
create policy invl_office_delete on invoice_lines for delete to authenticated
  using (has_role('Finance','Admin') and is_aal2());
