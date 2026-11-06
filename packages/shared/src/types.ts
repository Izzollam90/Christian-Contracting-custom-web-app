// Database row types, mirroring supabase/migrations/0001_init.sql.
export type AppRole = 'Customer' | 'Crew' | 'CrewLead' | 'Finance' | 'Admin';
export type JobStatus = 'Requested' | 'Accepted' | 'Scheduled' | 'In Progress' | 'Completed' | 'On Hold' | 'Canceled';
export type JobPriority = 'Routine' | 'Soon' | 'Emergency';
export type EstimateStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected';
export type InvoiceStatus = 'Draft' | 'Unpaid' | 'Paid' | 'Void';
export type ExpenseStatus = 'Submitted' | 'Approved' | 'Rejected';
export type TimeReview = 'Open' | 'Approved' | 'Needs Review' | 'Rejected';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: AppRole;
  customer_id: string | null;
  hourly_rate_cents: number | null;
  active: boolean;
  created_at: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
}

export interface Job {
  id: string;
  title: string;
  description: string | null;
  category: string;
  priority: JobPriority;
  status: JobStatus;
  customer_id: string;
  service_address: string;
  street_name: string | null;
  crew_id: string | null;
  preferred_date: string | null;
  time_slot: string | null;
  created_at: string;
  accepted_at: string | null;
  completed_at: string | null;
}

export interface ActivityLog {
  id: number;
  job_id: string;
  at: string;
  actor_id: string | null;
  action: string;
  visible_to_customer: boolean;
}

export interface Estimate {
  id: string;
  job_id: string;
  status: EstimateStatus;
  created_by: string | null;
  created_at: string;
  sent_at: string | null;
  responded_at: string | null;
  customer_comment: string | null;
}

export interface EstimateLine {
  id: number;
  estimate_id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
}

export interface Invoice {
  id: string;
  job_id: string;
  estimate_id: string | null;
  status: InvoiceStatus;
  issued_at: string | null;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
}

export interface InvoiceLine {
  id: number;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
}

export interface Expense {
  id: number;
  submitted_by: string;
  job_id: string | null;
  category: string;
  vendor: string | null;
  amount_cents: number;
  expense_date: string;
  status: ExpenseStatus;
  reviewed_by: string | null;
  note: string | null;
  receipt_path: string | null;
}

export interface TimeEntry {
  id: number;
  user_id: string;
  job_id: string | null;
  customer_id: string | null;
  clock_in: string;
  clock_out: string | null;
  distance_meters: number | null;
  location_check: string | null;
  review: TimeReview;
  note: string | null;
}

export interface JobBoardRow {
  id: string;
  title: string;
  category: string;
  priority: JobPriority;
  preferred_date: string | null;
  time_slot: string | null;
  street_name: string | null;
  created_at: string;
}

export interface ServiceCategory {
  category: string;
  description: string | null;
  active: boolean;
}

export interface TimeSlot {
  slot: string;
  start_time: string;
  end_time: string;
  sort_order: number;
}

export interface Setting {
  key: string;
  value: string;
  notes: string | null;
}

export const STAFF_ROLES: AppRole[] = ['Crew', 'CrewLead', 'Finance', 'Admin'];
export const isStaffRole = (r: AppRole) => (STAFF_ROLES as string[]).includes(r);
