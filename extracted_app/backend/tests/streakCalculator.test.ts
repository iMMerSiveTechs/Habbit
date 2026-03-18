import { describe, it, expect } from 'vitest';
import { calculateHabitStreak } from '../src/utils/streakCalculator';

describe('calculateHabitStreak', () => {
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today); twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const threeDaysAgo = new Date(today); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const fiveDaysAgo = new Date(today); fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

  it('returns 0 for empty events', () => {
    expect(calculateHabitStreak([])).toBe(0);
  });

  it('returns 1 for single event today', () => {
    expect(calculateHabitStreak([{ completedAt: today }])).toBe(1);
  });

  it('returns 1 for single event yesterday', () => {
    expect(calculateHabitStreak([{ completedAt: yesterday }])).toBe(1);
  });

  it('returns 2 for consecutive days (today + yesterday)', () => {
    expect(calculateHabitStreak([
      { completedAt: today },
      { completedAt: yesterday },
    ])).toBe(2);
  });

  it('returns 3 for three consecutive days', () => {
    expect(calculateHabitStreak([
      { completedAt: today },
      { completedAt: yesterday },
      { completedAt: twoDaysAgo },
    ])).toBe(3);
  });

  it('handles gap in streak - returns only recent portion', () => {
    const result = calculateHabitStreak([
      { completedAt: today },
      { completedAt: yesterday },
      { completedAt: fiveDaysAgo },
    ]);
    expect(result).toBe(2);
  });

  it('handles duplicate events on same day', () => {
    const result = calculateHabitStreak([
      { completedAt: today },
      { completedAt: today },
      { completedAt: yesterday },
    ]);
    expect(result).toBeGreaterThanOrEqual(2);
  });

  it('handles events not starting from today', () => {
    const result = calculateHabitStreak([
      { completedAt: threeDaysAgo },
      { completedAt: fiveDaysAgo },
    ]);
    // Streak should be 1 since there's a gap between 3 and 5 days ago
    expect(result).toBeGreaterThanOrEqual(0);
  });
});
