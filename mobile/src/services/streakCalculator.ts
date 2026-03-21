/**
 * Streak Calculation Service
 * Calculates habit streaks based on completion history
 */

interface HabitEvent {
  completedAt: Date | string;
}

interface HabitWithEvents {
  id: string;
  targetCount: number;
  events: HabitEvent[];
  frequency: string;
}

/**
 * Calculate current streak for a habit
 * Returns number of consecutive days the habit was completed
 */
export function calculateHabitStreak(
  events: HabitEvent[],
  targetCount: number = 1,
  includeToday: boolean = true
): number {
  if (events.length === 0) return 0;

  // Sort events by date (newest first)
  const sortedEvents = [...events].sort((a, b) => {
    const dateA = new Date(a.completedAt).getTime();
    const dateB = new Date(b.completedAt).getTime();
    return dateB - dateA;
  });

  // Group events by date
  const eventsByDate = new Map<string, number>();
  sortedEvents.forEach((event) => {
    const dateKey = getDateKey(new Date(event.completedAt));
    eventsByDate.set(dateKey, (eventsByDate.get(dateKey) || 0) + 1);
  });

  // Start from today or yesterday based on includeToday flag
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let currentDate = new Date(today);
  let streak = 0;

  // Check if today is complete (if we're including it)
  const todayKey = getDateKey(today);
  const todayCount = eventsByDate.get(todayKey) || 0;

  if (includeToday && todayCount >= targetCount) {
    streak = 1;
    currentDate.setDate(currentDate.getDate() - 1);
  } else if (!includeToday) {
    currentDate.setDate(currentDate.getDate() - 1);
  } else {
    // Today is not complete, check if yesterday was (grace period)
    currentDate.setDate(currentDate.getDate() - 1);
  }

  // Count backwards from current date
  while (true) {
    const dateKey = getDateKey(currentDate);
    const count = eventsByDate.get(dateKey) || 0;

    if (count >= targetCount) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Get date key in YYYY-MM-DD format
 */
function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Calculate longest streak for a habit (all-time record)
 */
export function calculateLongestStreak(
  events: HabitEvent[],
  targetCount: number = 1
): number {
  if (events.length === 0) return 0;

  // Group events by date
  const eventsByDate = new Map<string, number>();
  events.forEach((event) => {
    const dateKey = getDateKey(new Date(event.completedAt));
    eventsByDate.set(dateKey, (eventsByDate.get(dateKey) || 0) + 1);
  });

  // Get all dates and sort them
  const dates = Array.from(eventsByDate.keys()).sort();
  if (dates.length === 0) return 0;

  let longestStreak = 0;
  let currentStreak = 0;
  let previousDate: Date | null = null;

  dates.forEach((dateKey) => {
    const count = eventsByDate.get(dateKey) || 0;
    const currentDate = new Date(dateKey);

    if (count >= targetCount) {
      if (previousDate) {
        const daysDiff = Math.floor(
          (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysDiff === 1) {
          // Consecutive day
          currentStreak++;
        } else {
          // Streak broken, start new one
          longestStreak = Math.max(longestStreak, currentStreak);
          currentStreak = 1;
        }
      } else {
        // First day
        currentStreak = 1;
      }

      previousDate = currentDate;
    }
  });

  // Check final streak
  longestStreak = Math.max(longestStreak, currentStreak);

  return longestStreak;
}

/**
 * Get streak statistics for a habit
 */
export function getStreakStats(
  events: HabitEvent[],
  targetCount: number = 1
): {
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  completionRate: number; // Last 30 days
} {
  const currentStreak = calculateHabitStreak(events, targetCount, true);
  const longestStreak = calculateLongestStreak(events, targetCount);
  const totalCompletions = events.length;

  // Calculate completion rate for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentEvents = events.filter((event) => {
    return new Date(event.completedAt) >= thirtyDaysAgo;
  });

  // Group by date
  const recentEventsByDate = new Map<string, number>();
  recentEvents.forEach((event) => {
    const dateKey = getDateKey(new Date(event.completedAt));
    recentEventsByDate.set(dateKey, (recentEventsByDate.get(dateKey) || 0) + 1);
  });

  // Count days where target was met
  let completedDays = 0;
  recentEventsByDate.forEach((count) => {
    if (count >= targetCount) completedDays++;
  });

  const completionRate = Math.round((completedDays / 30) * 100);

  return {
    currentStreak,
    longestStreak,
    totalCompletions,
    completionRate,
  };
}
