import { useCallback, useEffect, useState } from 'react';
import { useAuth, useRealtime } from '@herkey/shared';
import type { ActivityLog, Estimate, EstimateLine, Invoice, InvoiceLine, Job, Profile, ServiceCategory, TimeSlot } from '@herkey/shared';
import {
  fetchActivity, fetchCategories, fetchCrewProfiles, fetchEstimateLines, fetchEstimates,
  fetchInvoiceLines, fetchInvoices, fetchMyJobs, fetchTimeSlots,
} from './data';

export interface CustomerData {
  jobs: Job[];
  activity: ActivityLog[];
  estimates: Estimate[];
  estimateLines: EstimateLine[];
  invoices: Invoice[];
  invoiceLines: InvoiceLine[];
  crew: Pick<Profile, 'id' | 'full_name' | 'role'>[];
  categories: ServiceCategory[];
  slots: TimeSlot[];
  profileName: string | null;
  reload: () => Promise<void>;
}

export function useCustomerData(): CustomerData {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [estimates, setEstimates] = useState<Estimate[]>([]);
  const [estimateLines, setEstimateLines] = useState<EstimateLine[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [invoiceLines, setInvoiceLines] = useState<InvoiceLine[]>([]);
  const [crew, setCrew] = useState<Pick<Profile, 'id' | 'full_name' | 'role'>[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);

  const reload = useCallback(async () => {
    if (!profile?.customer_id) return;
    const j = await fetchMyJobs(profile.customer_id);
    const jobRows = (j.data ?? []) as Job[];
    setJobs(jobRows);
    const jobIds = jobRows.map((x) => x.id);
    const [a, e, i] = await Promise.all([fetchActivity(jobIds), fetchEstimates(jobIds), fetchInvoices(jobIds)]);
    setActivity((a.data ?? []) as ActivityLog[]);
    const estRows = (e.data ?? []) as Estimate[];
    const invRows = (i.data ?? []) as Invoice[];
    setEstimates(estRows);
    setInvoices(invRows);
    const [el, il, cp] = await Promise.all([
      fetchEstimateLines(estRows.map((x) => x.id)),
      fetchInvoiceLines(invRows.map((x) => x.id)),
      fetchCrewProfiles(jobRows.map((x) => x.crew_id).filter((x): x is string => !!x)),
    ]);
    setEstimateLines((el.data ?? []) as EstimateLine[]);
    setInvoiceLines((il.data ?? []) as InvoiceLine[]);
    setCrew((cp.data ?? []) as Pick<Profile, 'id' | 'full_name' | 'role'>[]);
  }, [profile?.customer_id]);

  useEffect(() => {
    void reload();
    void fetchCategories().then((r) => setCategories((r.data ?? []) as ServiceCategory[]));
    void fetchTimeSlots().then((r) => setSlots((r.data ?? []) as TimeSlot[]));
  }, [reload]);

  const filter = profile?.customer_id ? `customer_id=eq.${profile.customer_id}` : null;
  useRealtime('jobs', filter, () => void reload());
  useRealtime('activity_log', null, () => void reload());
  useRealtime('estimates', null, () => void reload());
  useRealtime('invoices', null, () => void reload());

  return { jobs, activity, estimates, estimateLines, invoices, invoiceLines, crew, categories, slots, profileName: profile?.full_name ?? null, reload };
}
