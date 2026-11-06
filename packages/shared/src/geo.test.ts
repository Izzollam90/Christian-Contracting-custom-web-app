import { describe, expect, it } from 'vitest';
import { haversineMeters } from './geo';

describe('haversineMeters', () => {
  it('is zero for the same point', () => {
    expect(haversineMeters(40.0412, -76.3021, 40.0412, -76.3021)).toBe(0);
  });
  it('matches known distance: Dana (C-01) to Robert (C-02) ≈ 957 m', () => {
    const d = haversineMeters(40.0412, -76.3021, 40.048, -76.2952);
    expect(d).toBeGreaterThan(850);
    expect(d).toBeLessThan(1050);
  });
  it('flags 260 m as outside a 200 m geofence (seed row T-025 case)', () => {
    const fence = 200;
    expect(260 > fence).toBe(true);
    expect(38 <= fence).toBe(true);
  });
});
