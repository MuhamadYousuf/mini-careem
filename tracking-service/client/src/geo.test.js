import { describe, test, expect } from 'vitest';
import { project, lerp, haversineKm, BOUNDS } from './geo';

describe('project', () => {
  test('lower-left corner maps to bottom-left of the svg (0,100)', () => {
    const { x, y } = project({ lat: BOUNDS.minLat, lng: BOUNDS.minLng });
    expect(x).toBeCloseTo(0);
    expect(y).toBeCloseTo(100);
  });

  test('upper-right corner maps to top-right of the svg (100,0)', () => {
    const { x, y } = project({ lat: BOUNDS.maxLat, lng: BOUNDS.maxLng });
    expect(x).toBeCloseTo(100);
    expect(y).toBeCloseTo(0);
  });

  test('out-of-bounds coordinates are clamped to 0..100', () => {
    const { x, y } = project({ lat: 90, lng: 200 });
    expect(x).toBeLessThanOrEqual(100);
    expect(x).toBeGreaterThanOrEqual(0);
    expect(y).toBeLessThanOrEqual(100);
    expect(y).toBeGreaterThanOrEqual(0);
  });
});

describe('lerp', () => {
  test('t=0 returns the start, t=1 returns the end', () => {
    const a = { lat: 0, lng: 0 };
    const b = { lat: 10, lng: 20 };
    expect(lerp(a, b, 0)).toEqual(a);
    expect(lerp(a, b, 1)).toEqual(b);
  });

  test('t=0.5 returns the midpoint', () => {
    const mid = lerp({ lat: 0, lng: 0 }, { lat: 10, lng: 20 }, 0.5);
    expect(mid).toEqual({ lat: 5, lng: 10 });
  });

  test('t is clamped to [0,1]', () => {
    expect(lerp({ lat: 0, lng: 0 }, { lat: 10, lng: 10 }, 2)).toEqual({ lat: 10, lng: 10 });
    expect(lerp({ lat: 0, lng: 0 }, { lat: 10, lng: 10 }, -1)).toEqual({ lat: 0, lng: 0 });
  });
});

describe('haversineKm', () => {
  test('distance to itself is zero', () => {
    expect(haversineKm({ lat: 24.86, lng: 67 }, { lat: 24.86, lng: 67 })).toBeCloseTo(0);
  });

  test('~0.1 degree of latitude is about 11 km', () => {
    const d = haversineKm({ lat: 24.8, lng: 67 }, { lat: 24.9, lng: 67 });
    expect(d).toBeGreaterThan(10);
    expect(d).toBeLessThan(12);
  });
});
