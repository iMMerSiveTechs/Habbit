/**
 * TimeSystem - UTC-based date math for consistent habit tracking
 *
 * Ported from Habit OS v4.0.0
 *
 * Philosophy:
 * - All dates as YYYY-MM-DD strings (no Date objects for storage)
 * - All calculations at UTC midnight (no timezone bugs)
 * - Works across DST transitions
 * - Deterministic streak calculations
 * - Pure functions (no side effects)
 */

export type DateKey = string; // Format: YYYY-MM-DD

export const TimeSystem = {
  /**
   * Get today's date key in YYYY-MM-DD format
   * Uses local timezone but returns string (no timezone info)
   */
  getTodayKey: (): DateKey => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  },

  /**
   * Convert YYYY-MM-DD string to UTC midnight timestamp
   * Internal helper for date math
   */
  _toUtcMidnightMs: (dateKey: DateKey): number => {
    const [y, m, d] = dateKey.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  },

  /**
   * Add/subtract days from a date key
   * Returns new date key in YYYY-MM-DD format
   *
   * @example
   * addDays('2026-02-15', 1) => '2026-02-16'
   * addDays('2026-02-15', -1) => '2026-02-14'
   */
  addDays: (dateKey: DateKey, days: number): DateKey => {
    const ms = TimeSystem._toUtcMidnightMs(dateKey);
    const d = new Date(ms + days * 86400000); // 86400000ms = 1 day
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
  },

  /**
   * Calculate number of days between two date keys
   * Positive if end > start, negative if end < start
   *
   * @example
   * daysBetween('2026-02-10', '2026-02-15') => 5
   */
  daysBetween: (start: DateKey, end: DateKey): number => {
    return Math.floor((TimeSystem._toUtcMidnightMs(end) - TimeSystem._toUtcMidnightMs(start)) / 86400000);
  },

  /**
   * Compute current streak from history
   * Walks backwards from todayKey until no match found
   *
   * @param history - Array of YYYY-MM-DD strings when habit was completed
   * @param todayKey - Current date (YYYY-MM-DD)
   * @returns Number of consecutive days (including today if present)
   *
   * @example
   * computeStreak(['2026-02-13', '2026-02-14', '2026-02-15'], '2026-02-15') => 3
   * computeStreak(['2026-02-13', '2026-02-14'], '2026-02-15') => 0 (no today)
   */
  computeStreak: (history: DateKey[], todayKey: DateKey): number => {
    const set = new Set(history);

    // Start from today if present, else yesterday
    let cursor = set.has(todayKey) ? todayKey : TimeSystem.addDays(todayKey, -1);
    let streak = 0;

    while (set.has(cursor)) {
      streak++;
      cursor = TimeSystem.addDays(cursor, -1);
    }

    return streak;
  },

  /**
   * Check if date key is today
   */
  isToday: (dateKey: DateKey): boolean => {
    return dateKey === TimeSystem.getTodayKey();
  },

  /**
   * Check if date key is in the past
   */
  isPast: (dateKey: DateKey): boolean => {
    return TimeSystem.daysBetween(dateKey, TimeSystem.getTodayKey()) > 0;
  },

  /**
   * Check if date key is in the future
   */
  isFuture: (dateKey: DateKey): boolean => {
    return TimeSystem.daysBetween(TimeSystem.getTodayKey(), dateKey) > 0;
  },

  /**
   * Get date key for X days ago
   *
   * @example
   * daysAgo(7) => '2026-02-08' (if today is 2026-02-15)
   */
  daysAgo: (days: number): DateKey => {
    return TimeSystem.addDays(TimeSystem.getTodayKey(), -days);
  },

  /**
   * Get date key for X days from now
   *
   * @example
   * daysFromNow(7) => '2026-02-22' (if today is 2026-02-15)
   */
  daysFromNow: (days: number): DateKey => {
    return TimeSystem.addDays(TimeSystem.getTodayKey(), days);
  },

  /**
   * Get array of last N date keys (including today)
   *
   * @example
   * getLastNDays(7) => ['2026-02-09', '2026-02-10', ..., '2026-02-15']
   */
  getLastNDays: (n: number): DateKey[] => {
    const days: DateKey[] = [];
    const today = TimeSystem.getTodayKey();

    for (let i = n - 1; i >= 0; i--) {
      days.push(TimeSystem.addDays(today, -i));
    }

    return days;
  },

  /**
   * Format date key for display
   *
   * @example
   * format('2026-02-15') => 'Feb 15, 2026'
   */
  format: (dateKey: DateKey): string => {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  /**
   * Format date key for short display
   *
   * @example
   * formatShort('2026-02-15') => 'Feb 15'
   */
  formatShort: (dateKey: DateKey): string => {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  },

  /**
   * Get day of week from date key
   *
   * @example
   * getDayOfWeek('2026-02-15') => 'Sunday'
   */
  getDayOfWeek: (dateKey: DateKey): string => {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  },

  /**
   * Get week number of year
   * ISO 8601 week date system (week starts Monday)
   */
  getWeekNumber: (dateKey: DateKey): number => {
    const [y, m, d] = dateKey.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
    return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
  },
};
