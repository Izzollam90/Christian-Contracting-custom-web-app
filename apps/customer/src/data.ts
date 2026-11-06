import { supabase } from '@herkey/shared';
import type { ActivityLog, Estimate, EstimateLine, Invoice, InvoiceLine, Job, Profile, ServiceCategory, TimeSlot } from '@herkey/shared';

export const fetchProfile = (id: string) =>
  supabase().from('profiles').select('*').eq('id', id).single<Profile>();

export const fetchMyJobs = (customerId: string) =>
  supabase().from('jobs').select('*').eq('customer_id', customerId).order('created_at', { ascending: false });

export const fetchActivity = (jobIds: string[]) =>
  jobIds.length
    ? supabase().from('activity_log').select('*').in('job_id', jobIds).eq('visible_to_customer', true).order('at', { ascending: false })
    : Promise.resolve({ data: [] as ActivityLog[], error: null });

export const fetchEstimates = (jobIds: string[]) =>
  jobIds.length
    ? supabase().from('estimates').select('*').in('job_id', jobIds).neq('status', 'Draft').order('created_at', { ascending: false })
    : Promise.resolve({ data: [] as Estimate[], error: null });

export const fetchEstimateLines = (estimateIds: string[]) =>
  estimateIds.length
    ? supabase().from('estimate_lines').select('*').in('estimate_id', estimateIds)
    : Promise.resolve({ data: [] as EstimateLine[], error: null });

export const fetchInvoices = (jobIds: string[]) =>
  jobIds.length
    ? supabase().from('invoices').select('*').in('job_id', jobIds).neq('status', 'Draft').order('created_at', { ascending: false })
    : Promise.resolve({ data: [] as Invoice[], error: null });

export const fetchInvoiceLines = (invoiceIds: string[]) =>
  invoiceIds.length
    ? supabase().from('invoice_lines').select('*').in('invoice_id', invoiceIds)
    : Promise.resolve({ data: [] as InvoiceLine[], error: null });

export const fetchCrewProfiles = (crewIds: string[]) =>
  crewIds.length
    ? supabase().from('profiles').select('id, full_name, role').in('id', crewIds)
    : Promise.resolve({ data: [] as Pick<Profile, 'id' | 'full_name' | 'role'>[], error: null });

export const fetchCategories = () =>
  supabase().from('service_categories').select('*').eq('active', true).order('category');

export const fetchTimeSlots = () =>
  supabase().from('time_slots').select('*').order('sort_order');

export const createJob = async (p: {
  profile: Profile; title: string; description: string; category: string;
  priority: 'Routine' | 'Soon' | 'Emergency'; serviceAddress: string;
  preferredDate: string; timeSlot: string;
}) => {
  const { data, error } = await supabase().from('jobs').insert({
    title: p.title,
    description: p.description || null,
    category: p.category,
    priority: p.priority,
    status: 'Requested',
    customer_id: p.profile.customer_id,
    service_address: p.serviceAddress,
    preferred_date: p.preferredDate,
    time_slot: p.timeSlot,
    crew_id: null,
  }).select().single<Job>();
  if (error) throw error;
  await supabase().from('activity_log').insert({
    job_id: data.id, actor_id: p.profile.id, visible_to_customer: true,
    action: `Request received · preferred ${p.preferredDate}, ${p.timeSlot}`,
  });
  return data;
};

export const cancelJob = (jobId: string) => supabase().rpc('cancel_my_job', { p_job: jobId });
export const respondEstimate = (estimateId: string, accept: boolean, comment?: string) =>
  supabase().rpc('respond_estimate', { p_estimate: estimateId, p_accept: accept, p_comment: comment ?? null });

export const docTotal = (lines: { quantity: number; unit_price_cents: number }[]): number =>
  lines.reduce((a, l) => a + Math.round(l.quantity * l.unit_price_cents), 0);

export const linesTotal = (lines: { line_total_cents: number }[]): number =>
  lines.reduce((a, l) => a + l.line_total_cents, 0);
