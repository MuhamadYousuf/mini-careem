import { describe, test, expect } from 'vitest';
import {
  STATUS,
  HAPPY_PATH,
  meta,
  isTerminal,
  stepIndex,
} from './rideStatus';

describe('ride status machine', () => {
  test('the happy path runs requested -> complete in order', () => {
    expect(HAPPY_PATH[0]).toBe(STATUS.REQUESTED);
    expect(HAPPY_PATH[HAPPY_PATH.length - 1]).toBe(STATUS.COMPLETE);
    expect(HAPPY_PATH).toContain(STATUS.STARTED);
    expect(HAPPY_PATH).toContain(STATUS.STOPPED);
  });

  test('only COMPLETE and FAILED are terminal', () => {
    expect(isTerminal(STATUS.COMPLETE)).toBe(true);
    expect(isTerminal(STATUS.FAILED)).toBe(true);
    expect(isTerminal(STATUS.STARTED)).toBe(false);
    expect(isTerminal(STATUS.IDLE)).toBe(false);
  });

  test('FAILED is not on the happy path', () => {
    expect(stepIndex(STATUS.FAILED)).toBe(-1);
    expect(stepIndex(STATUS.STARTED)).toBeGreaterThan(-1);
  });

  test('every status has display metadata', () => {
    for (const s of Object.values(STATUS)) {
      expect(meta(s).label).toBeTruthy();
      expect(meta(s).variant).toBeTruthy();
    }
    expect(meta(STATUS.COMPLETE).variant).toBe('success');
    expect(meta(STATUS.FAILED).variant).toBe('danger');
  });
});
