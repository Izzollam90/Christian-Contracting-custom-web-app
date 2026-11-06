import type { AppRole, JobPriority, JobStatus } from './types';

export const COMPANY_NAME = import.meta.env.VITE_COMPANY_NAME ?? 'Herkey Maintenance';
export const TIMEZONE = import.meta.env.VITE_TIMEZONE ?? 'America/New_York';

export const STAGES: JobStatus[] = ['Requested', 'Accepted', 'Scheduled', 'In Progress', 'Completed'];
export const ALL_STATUSES: JobStatus[] = [...STAGES, 'On Hold', 'Canceled'];

export const PRIORITIES: { value: JobPriority; label: string; hint: string }[] = [
  { value: 'Routine', label: 'Routine', hint: 'Within a week or two' },
  { value: 'Soon', label: 'Soon', hint: 'In the next few days' },
  { value: 'Emergency', label: 'Emergency', hint: 'Water, power or safety' },
];

export const GEOFENCE_METERS = 200;

export const ROLE_LABEL: Record<AppRole, string> = {
  Customer: 'Customer',
  Crew: 'Crew',
  CrewLead: 'Crew Lead',
  Finance: 'Finance',
  Admin: 'Admin',
};

export const statusPillClass = (s: string): string =>
  ({
    Requested: 'p-info', Accepted: 'p-violet', Scheduled: 'p-gold', 'In Progress': 'p-warn',
    Completed: 'p-ok', 'On Hold': 'p-muted', Canceled: 'p-bad',
    Draft: 'p-muted', Sent: 'p-info', Rejected: 'p-bad', Unpaid: 'p-warn', Paid: 'p-ok', Void: 'p-bad',
    Submitted: 'p-warn', Approved: 'p-ok', 'Needs Review': 'p-warn', Open: 'p-info',
  })[s] ?? 'p-muted';
