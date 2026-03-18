import { describe, it, expect } from 'vitest';
import { getTierLevel, meetsMinimumTier, getLimits, FREE_LIMITS, CORE_LIMITS, PRO_LIMITS } from '../src/tierGuard';

describe('getTierLevel', () => {
  it('returns 0 for free tier', () => {
    expect(getTierLevel('free')).toBe(0);
  });
  it('returns 0 for preview tier', () => {
    expect(getTierLevel('preview')).toBe(0);
  });
  it('returns 1 for core tier', () => {
    expect(getTierLevel('core')).toBe(1);
  });
  it('returns 2 for pro tier', () => {
    expect(getTierLevel('pro')).toBe(2);
  });
  it('returns 3 for elite tier', () => {
    expect(getTierLevel('elite')).toBe(3);
  });
  it('returns 0 for unknown tier', () => {
    expect(getTierLevel('unknown')).toBe(0);
  });
  it('returns 0 for empty string', () => {
    expect(getTierLevel('')).toBe(0);
  });
});

describe('meetsMinimumTier', () => {
  it('free meets free requirement', () => {
    expect(meetsMinimumTier('free', 'free')).toBe(true);
  });
  it('free does not meet core requirement', () => {
    expect(meetsMinimumTier('free', 'core')).toBe(false);
  });
  it('core meets core requirement', () => {
    expect(meetsMinimumTier('core', 'core')).toBe(true);
  });
  it('pro meets core requirement', () => {
    expect(meetsMinimumTier('pro', 'core')).toBe(true);
  });
  it('elite meets all requirements', () => {
    expect(meetsMinimumTier('elite', 'free')).toBe(true);
    expect(meetsMinimumTier('elite', 'core')).toBe(true);
    expect(meetsMinimumTier('elite', 'pro')).toBe(true);
    expect(meetsMinimumTier('elite', 'elite')).toBe(true);
  });
  it('core does not meet pro requirement', () => {
    expect(meetsMinimumTier('core', 'pro')).toBe(false);
  });
  it('unknown tier defaults to free level', () => {
    expect(meetsMinimumTier('garbage', 'core')).toBe(false);
    expect(meetsMinimumTier('garbage', 'free')).toBe(true);
  });
});

describe('getLimits', () => {
  it('returns FREE_LIMITS for free tier', () => {
    expect(getLimits('free')).toEqual(FREE_LIMITS);
  });
  it('returns FREE_LIMITS for preview tier', () => {
    expect(getLimits('preview')).toEqual(FREE_LIMITS);
  });
  it('returns CORE_LIMITS for core tier', () => {
    expect(getLimits('core')).toEqual(CORE_LIMITS);
  });
  it('returns PRO_LIMITS for pro tier', () => {
    expect(getLimits('pro')).toEqual(PRO_LIMITS);
  });
  it('returns PRO_LIMITS for elite tier', () => {
    expect(getLimits('elite')).toEqual(PRO_LIMITS);
  });
  it('returns FREE_LIMITS for unknown tier', () => {
    expect(getLimits('unknown')).toEqual(FREE_LIMITS);
  });
  it('free limits restrict habits to 5', () => {
    expect(FREE_LIMITS.maxHabits).toBe(5);
  });
  it('free limits restrict todos to 10', () => {
    expect(FREE_LIMITS.maxTodos).toBe(10);
  });
  it('core limits allow unlimited habits', () => {
    expect(CORE_LIMITS.maxHabits).toBe(999999);
  });
  it('pro limits are fully unlimited', () => {
    expect(PRO_LIMITS.maxHabits).toBe(-1);
    expect(PRO_LIMITS.maxTodos).toBe(-1);
    expect(PRO_LIMITS.maxGeofences).toBe(-1);
  });
});
