import { TIMEZONE } from './constants';

// Money is integer cents in the DB; format for display.
export const usd = (cents: number | null | undefined): string =>
  '$' + ((cents ?? 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const dt = (iso: string | null | undefined): Date | null =>
  iso ? new Date(iso) : null;

export const fmtDay = (iso: string | number | Date | null | undefined): string => {
  const d = iso == null ? null : typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(iso + 'T12:00:00Z') : new Date(iso);
  return d && !isNaN(+d)
    ? d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', timeZone: TIMEZONE })
    : '—';
};

export const fmtShort = (iso: string | null | undefined): string => {
  const d = dt(iso);
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: TIMEZONE }) : '—';
};

export const fmtDT = (iso: string | null | undefined): string => {
  const d = dt(iso);
  return d
    ? d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: TIMEZONE })
    : '—';
};

export const fmtTime = (iso: string | null | undefined): string => {
  const d = dt(iso);
  return d ? d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TIMEZONE }) : '—';
};

export const hoursBetween = (a: string, b: string | null): number => {
  const end = b ? new Date(b) : new Date();
  return (end.getTime() - new Date(a).getTime()) / 36e5;
};

// Next n weekdays (skip Sunday=0 and Saturday=6), as YYYY-MM-DD in the company timezone.
export const nextWorkdays = (n: number, from: Date = new Date()): string[] => {
  const out: string[] = [];
  const d = new Date(from.toLocaleDateString('en-US', { timeZone: TIMEZONE }));
  while (out.length < n) {
    d.setDate(d.getDate() + 1);
    const wd = d.getDay();
    if (wd !== 0 && wd !== 6) {
      out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
    }
  }
  return out;
};

export const weekdayShort = (isoDate: string): string =>
  new Date(isoDate + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });

export const dayNum = (isoDate: string): number => Number(isoDate.slice(8, 10));
export const monthShort = (isoDate: string): string =>
  new Date(isoDate + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' });
