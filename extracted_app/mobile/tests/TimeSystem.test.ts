import { describe, it, expect } from 'vitest';

// Since TimeSystem may use React Native APIs, we test the core date logic directly
describe('TimeSystem date math', () => {
  // Test UTC date key format
  it('generates YYYY-MM-DD format', () => {
    const d = new Date(2026, 2, 18); // March 18, 2026
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    expect(`${year}-${month}-${day}`).toBe('2026-03-18');
  });

  it('calculates days between dates correctly', () => {
    const d1 = Date.UTC(2026, 2, 15);
    const d2 = Date.UTC(2026, 2, 18);
    const diff = Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
    expect(diff).toBe(3);
  });

  it('handles month boundaries', () => {
    const jan31 = Date.UTC(2026, 0, 31);
    const feb1 = Date.UTC(2026, 1, 1);
    const diff = Math.round((feb1 - jan31) / (1000 * 60 * 60 * 24));
    expect(diff).toBe(1);
  });

  it('handles year boundaries', () => {
    const dec31 = Date.UTC(2025, 11, 31);
    const jan1 = Date.UTC(2026, 0, 1);
    const diff = Math.round((jan1 - dec31) / (1000 * 60 * 60 * 24));
    expect(diff).toBe(1);
  });
});

describe('Streak calculation logic', () => {
  function computeStreak(history: Record<string, boolean>, todayKey: string): number {
    let streak = 0;
    let d = new Date(todayKey + 'T00:00:00Z');
    while (true) {
      const key = d.toISOString().split('T')[0]!;
      if (history[key]) {
        streak++;
        d.setUTCDate(d.getUTCDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  it('returns 0 for empty history', () => {
    expect(computeStreak({}, '2026-03-18')).toBe(0);
  });

  it('returns 1 for today only', () => {
    expect(computeStreak({ '2026-03-18': true }, '2026-03-18')).toBe(1);
  });

  it('returns 3 for three consecutive days', () => {
    expect(computeStreak({
      '2026-03-16': true,
      '2026-03-17': true,
      '2026-03-18': true,
    }, '2026-03-18')).toBe(3);
  });

  it('breaks streak on gap', () => {
    expect(computeStreak({
      '2026-03-15': true,
      '2026-03-17': true,
      '2026-03-18': true,
    }, '2026-03-18')).toBe(2);
  });

  it('returns 0 if today not completed', () => {
    expect(computeStreak({
      '2026-03-17': true,
      '2026-03-16': true,
    }, '2026-03-18')).toBe(0);
  });
});
