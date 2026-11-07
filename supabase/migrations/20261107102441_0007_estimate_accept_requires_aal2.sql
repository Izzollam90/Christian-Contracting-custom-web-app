-- F6: est_staff_write let a CrewLead/Admin set any status, including 'Accepted',
-- bypassing the aal2 gate that respond_estimate enforces on the accept path.
drop policy if exists est_staff_write on estimates;

create policy est_staff_select on estimates for select to authenticated
  using (has_role('CrewLead','Admin')
         or exists (select 1 from jobs j where j.id = job_id and j.crew_id = auth.uid()));

create policy est_staff_insert on estimates for insert to authenticated
  with check (
    status <> 'Accepted'
    and (has_role('CrewLead','Admin')
         or (status in ('Draft','Sent')
             and exists (select 1 from jobs j where j.id = job_id and j.crew_id = auth.uid())))
  );

create policy est_staff_update on estimates for update to authenticated
  using (has_role('CrewLead','Admin')
         or (status = 'Draft'
             and exists (select 1 from jobs j where j.id = job_id and j.crew_id = auth.uid())))
  with check (
    (status <> 'Accepted' or is_aal2())
    and (has_role('CrewLead','Admin')
         or (status in ('Draft','Sent')
             and exists (select 1 from jobs j where j.id = job_id and j.crew_id = auth.uid())))
  );

create policy est_staff_delete on estimates for delete to authenticated
  using (has_role('CrewLead','Admin')
         or (status = 'Draft'
             and exists (select 1 from jobs j where j.id = job_id and j.crew_id = auth.uid())));
