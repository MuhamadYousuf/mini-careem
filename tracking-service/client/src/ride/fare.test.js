import { describe, test, expect } from 'vitest';
import { computeFare, BASE_FARE, PER_KM, MIN_FARE } from './fare';

describe('computeFare', () => {
  test('is base + per-km for a normal trip', () => {
    expect(computeFare(10)).toBe(BASE_FARE + PER_KM * 10);
  });

  test('never drops below the minimum fare', () => {
    expect(computeFare(0)).toBe(MIN_FARE);
    expect(computeFare(0.1)).toBe(MIN_FARE);
  });

  test('rounds to 2 decimal places', () => {
    // 3.333 km -> 100 + 45*3.333 = 249.985 -> 249.99
    expect(computeFare(3.333)).toBe(249.99);
  });

  test('rejects nonsense input', () => {
    expect(() => computeFare(-5)).toThrow();
    expect(() => computeFare('far')).toThrow();
    expect(() => computeFare(NaN)).toThrow();
  });
});
