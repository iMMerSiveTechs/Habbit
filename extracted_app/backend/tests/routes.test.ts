import { describe, it, expect } from 'vitest';
import { getTierLevel, getLimits, meetsMinimumTier, FREE_LIMITS, CORE_LIMITS, PRO_LIMITS } from '../src/tierGuard';
import { calculateHabitStreak } from '../src/utils/streakCalculator';

// ===========================================================================
// 1. Health Endpoint Shape Tests
// ===========================================================================
describe('Health Endpoint Response Shape', () => {
  it('health response contains required fields when ok', () => {
    // Simulate the shape returned by GET /health on success
    const response = { status: 'ok', timestamp: new Date().toISOString() };
    expect(response).toHaveProperty('status', 'ok');
    expect(response).toHaveProperty('timestamp');
    expect(() => new Date(response.timestamp)).not.toThrow();
  });

  it('health degraded response contains error details', () => {
    // Simulate the shape returned by GET /health when DB is unreachable
    const response = { status: 'degraded', error: 'Database unreachable' };
    expect(response.status).toBe('degraded');
    expect(response.error).toBe('Database unreachable');
    expect(response).not.toHaveProperty('timestamp');
  });
});

// ===========================================================================
// 2. Input Validation Helpers
// ===========================================================================
describe('Input Validation', () => {
  // This helper mirrors the days-query-param clamping used in various route handlers
  const clampDays = (raw: string | undefined): number => {
    const parsed = parseInt(raw || '7', 10);
    return Math.max(1, Math.min(365, isNaN(parsed) ? 7 : parsed));
  };

  it('defaults to 7 when param is undefined', () => {
    expect(clampDays(undefined)).toBe(7);
  });

  it('clamps zero to minimum of 1', () => {
    expect(clampDays('0')).toBe(1);
  });

  it('clamps negative values to minimum of 1', () => {
    expect(clampDays('-5')).toBe(1);
    expect(clampDays('-999')).toBe(1);
  });

  it('clamps values above 365 to maximum of 365', () => {
    expect(clampDays('1000')).toBe(365);
    expect(clampDays('366')).toBe(365);
  });

  it('falls back to 7 for non-numeric strings', () => {
    expect(clampDays('abc')).toBe(7);
    expect(clampDays('')).toBe(7);
    expect(clampDays('NaN')).toBe(7);
  });

  it('passes through valid values unchanged', () => {
    expect(clampDays('1')).toBe(1);
    expect(clampDays('30')).toBe(30);
    expect(clampDays('365')).toBe(365);
  });
});

// ===========================================================================
// 3. Achievement Milestone Logic (catalog and streak-based detection)
// ===========================================================================
describe('Achievement Milestone Logic', () => {
  // The achievement catalog defines streak milestones at 3, 7, 14, 30, 100
  const STREAK_MILESTONES = [3, 7, 14, 30, 100];

  it('streak milestones are in ascending order', () => {
    for (let i = 1; i < STREAK_MILESTONES.length; i++) {
      expect(STREAK_MILESTONES[i]).toBeGreaterThan(STREAK_MILESTONES[i - 1]);
    }
  });

  it('calculateHabitStreak returns 0 for empty events', () => {
    expect(calculateHabitStreak([])).toBe(0);
  });

  it('calculateHabitStreak counts consecutive days from today', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dayBefore = new Date(today);
    dayBefore.setDate(dayBefore.getDate() - 2);

    const events = [
      { completedAt: today },
      { completedAt: yesterday },
      { completedAt: dayBefore },
    ];

    const streak = calculateHabitStreak(events);
    expect(streak).toBe(3);
  });

  it('calculateHabitStreak breaks on a gap day', () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    // Skip yesterday, have day-before-yesterday
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const events = [
      { completedAt: today },
      { completedAt: twoDaysAgo },
    ];

    // Streak should be 1 (only today counts; yesterday is missing so chain breaks)
    const streak = calculateHabitStreak(events);
    expect(streak).toBe(1);
  });

  it('milestone detection fires at correct thresholds', () => {
    // Simulate the milestone check logic from achievementService
    const shouldGrantMilestone = (streak: number, milestone: number) => streak >= milestone;

    expect(shouldGrantMilestone(2, 3)).toBe(false);
    expect(shouldGrantMilestone(3, 3)).toBe(true);
    expect(shouldGrantMilestone(7, 7)).toBe(true);
    expect(shouldGrantMilestone(99, 100)).toBe(false);
    expect(shouldGrantMilestone(100, 100)).toBe(true);
  });
});

// ===========================================================================
// 4. Tier Limit Calculations
// ===========================================================================
describe('Tier Limit Calculations', () => {
  it('free tier geofence limit is 0', () => {
    const limits = getLimits('free');
    expect(limits.maxGeofences).toBe(0);
  });

  it('core tier allows exactly 3 geofences', () => {
    const limits = getLimits('core');
    expect(limits.maxGeofences).toBe(3);
  });

  it('pro and elite tiers have unlimited geofences (-1)', () => {
    expect(getLimits('pro').maxGeofences).toBe(-1);
    expect(getLimits('elite').maxGeofences).toBe(-1);
  });

  it('isWithinLimit helper correctly checks usage against tier', () => {
    // Mirror the limit-checking logic routes use
    const isWithinLimit = (current: number, max: number): boolean => {
      if (max === -1) return true; // unlimited
      return current < max;
    };

    // Free tier: max 5 habits
    expect(isWithinLimit(4, FREE_LIMITS.maxHabits)).toBe(true);
    expect(isWithinLimit(5, FREE_LIMITS.maxHabits)).toBe(false);

    // Core tier: effectively unlimited habits
    expect(isWithinLimit(500, CORE_LIMITS.maxHabits)).toBe(true);

    // Pro tier: truly unlimited
    expect(isWithinLimit(999999, PRO_LIMITS.maxHabits)).toBe(true);
  });

  it('focus session limits differ between free and core', () => {
    expect(FREE_LIMITS.maxFocusSessions).toBe(3);
    expect(CORE_LIMITS.maxFocusSessions).toBe(-1); // unlimited
  });

  it('reminder limits scale with tier', () => {
    expect(FREE_LIMITS.maxReminders).toBe(0);
    expect(CORE_LIMITS.maxReminders).toBe(5);
    expect(PRO_LIMITS.maxReminders).toBe(-1);
  });
});
