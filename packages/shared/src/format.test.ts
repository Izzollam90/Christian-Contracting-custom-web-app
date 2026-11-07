import { describe, expect, it } from 'vitest';
import { usd, fmtDT, hoursBetween, nextWorkdays } from './format';

describe('usd', () => {
  it('formats integer cents', () => {
    expect(usd(0)).toBe('$0.00');
    expect(usd(1800)).toBe('$18.00');
    expect(usd(123456)).toBe('$1,234.56');
    expect(usd(null)).toBe('$0.00');
  });
});

describe('hoursBetween', () => {
  it('computes hours between ISO timestamps', () => {
    expect(hoursBetween('2026-11-06T12:00:00Z', '2026-11-06T20:30:00Z')).toBeCloseTo(8.5);
  });
});

describe('fmtDT', () => {
  it('renders in America/New_York, not UTC', () => {
    // 2026-11-06T02:00:00Z is 2026-11-05 22:00 in New York (EST, UTC-5)
    expect(fmtDT('2026-11-06T02:00:00Z')).toContain('Nov 5');
    expect(fmtDT(null)).toBe('—');
  });
});

describe('nextWorkdays', () => {
  it('skips weekends', () => {
    const days = nextWorkdays(5, new Date('2026-11-06T12:00:00Z')); // Friday
    expect(days).toHaveLength(5);
    for (const d of days) {
      const wd = new Date(d + 'T12:00:00Z').getUTCDay();
      expect([0, 6]).not.toContain(wd);
    }
    expect(days[0]).toBe('2026-11-09'); // Monday
  });
});
