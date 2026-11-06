import { supabase } from '@herkey/shared';
import type {
  ActivityLog, Customer, Estimate, EstimateLine, Expense, Invoice, InvoiceLine,
  Job, JobBoardRow, Profile, TimeEntry,
} from '@herkey/shared';

export const fetchProfile = (id: string) =>
  supabase().from('profiles').select('*').eq('id', id).single<Profile>();

export const fetchAllJobs = () =>
  supabase().from('jobs').select('*').order('created_at', { ascending: false });

export const fetchJobBoard = () =>
  supabase().from('job_board').select('*').order('created_at', { ascending: true });

export const fetchMyJobs = (uid: string) =>
  supabase().from('jobs').select('*').eq('crew_id', uid).order('created_at', { ascending: false });

export const fetchCustomers = () => supabase().from('customers').select('*').order('name');

export const fetchProfiles = () => supabase().from('profiles').select('*').order('full_name');

export const fetchActivity = (jobIds: string[]) =>
  jobIds.length
    ? supabase().from('activity_log').select('*').in('job_id', jobIds).order('at', { ascending: false })
    : Promise.resolve({ data: [] as ActivityLog[], error: null });

export const fetchEstimates = () => supabase().from('estimates').select('*').order('created_at', { ascending: false });
export const fetchEstimateLines = () => supabase().from('estimate_lines').select('*');
export const fetchInvoices = () => supabase().from('invoices').select('*').order('issued_at', { ascending: false });
export const fetchInvoiceLines = () => supabase().from('invoice_lines').select('*');
export const fetchExpenses = () => supabase().from('expenses').select('*').order('expense_date', { ascending: false });
export const fetchTimeEntries = () => supabase().from('time_entries').select('*').order('clock_in', { ascending: false });

export const claimJob = (jobId: string) => supabase().rpc('claim_job', { p_job: jobId });
export const setJobStatus = (jobId: string, status: string, note?: string) =>
  supabase().rpc('set_job_status', { p_job: jobId, p_status: status, p_note: note ?? null });
export const invoiceFromEstimate = (estimateId: string) =>
  supabase().rpc('invoice_from_estimate', { p_estimate: estimateId });

export const clockIn = async (jobId: string | null, customerId: string | null, geo: { distanceMeters: number | null; locationCheck: string }) => {
  const review = geo.locationCheck === 'Outside geofence' ? 'Needs Review' : 'Open';
  return supabase().from('time_entries').insert({
    job_id: jobId, customer_id: customerId, distance_meters: geo.distanceMeters,
    location_check: geo.locationCheck, review,
  });
};

export const clockOut = (entryId: number) =>
  supabase().from('time_entries').update({ clock_out: new Date().toISOString() }).eq('id', entryId);

export const reviewTime = (entryId: number, review: 'Approved' | 'Rejected') =>
  supabase().from('time_entries').update({ review }).eq('id', entryId);

export const reviewExpense = async (expenseId: number, status: 'Approved' | 'Rejected') => {
  const { data: s } = await supabase().auth.getSession();
  return supabase().from('expenses').update({ status, reviewed_by: s.session?.user.id ?? null }).eq('id', expenseId);
};

export const submitExpense = (p: { jobId: string | null; category: string; vendor: string; amountCents: number; note: string }) =>
  supabase().from('expenses').insert({
    job_id: p.jobId, category: p.category, vendor: p.vendor || null,
    amount_cents: p.amountCents, note: p.note || null, status: 'Submitted',
  });

export const addActivity = async (jobId: string, action: string, visible = true) => {
  const { data: s } = await supabase().auth.getSession();
  return supabase().from('activity_log').insert({ job_id: jobId, actor_id: s.session?.user.id ?? null, action, visible_to_customer: visible });
};

export const setProfileRole = (profileId: string, role: string) =>
  supabase().from('profiles').update({ role: role as Profile['role'] }).eq('id', profileId);

export const inviteStaff = async (email: string) => {
  // Supabase admin invite is not available to the anon key; use the auth invite endpoint via RPC-free flow:
  // send an OTP invite email; on first sign-in the handle_new_user trigger creates the Customer profile
  // and an Admin assigns the staff role from Team & access.
  return supabase().auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
};

export type StaffData = {
  jobs: Job[];
  board: JobBoardRow[];
  customers: Customer[];
  profiles: Profile[];
  activity: ActivityLog[];
  estimates: Estimate[];
  estimateLines: EstimateLine[];
  invoices: Invoice[];
  invoiceLines: InvoiceLine[];
  expenses: Expense[];
  time: TimeEntry[];
};

export const fetchStaffData = async (): Promise<StaffData> => {
  const [jobs, board, customers, profiles, estimates, estimateLines, invoices, invoiceLines, expenses, time] = await Promise.all([
    fetchAllJobs(), fetchJobBoard(), fetchCustomers(), fetchProfiles(),
    fetchEstimates(), fetchEstimateLines(), fetchInvoices(), fetchInvoiceLines(), fetchExpenses(), fetchTimeEntries(),
  ]);
  const jobIds = ((jobs.data ?? []) as Job[]).map((j) => j.id);
  const activity = await fetchActivity(jobIds);
  return {
    jobs: (jobs.data ?? []) as Job[],
    board: (board.data ?? []) as JobBoardRow[],
    customers: (customers.data ?? []) as Customer[],
    profiles: (profiles.data ?? []) as Profile[],
    activity: (activity.data ?? []) as ActivityLog[],
    estimates: (estimates.data ?? []) as Estimate[],
    estimateLines: (estimateLines.data ?? []) as EstimateLine[],
    invoices: (invoices.data ?? []) as Invoice[],
    invoiceLines: (invoiceLines.data ?? []) as InvoiceLine[],
    expenses: (expenses.data ?? []) as Expense[],
    time: (time.data ?? []) as TimeEntry[],
  };
};

export const docTotal = (lines: { quantity: number; unit_price_cents: number }[]): number =>
  lines.reduce((a, l) => a + Math.round(l.quantity * l.unit_price_cents), 0);
