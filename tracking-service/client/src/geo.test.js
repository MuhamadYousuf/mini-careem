import { describe, test, expect } from 'vitest';
import { project, BOUNDS } from './geo';

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
