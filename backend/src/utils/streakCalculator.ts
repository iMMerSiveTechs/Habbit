/**
 * Streak Calculator for Backend
 * Calculates habit streaks based on completion history
 */

interface HabitEvent {
  completedAt: Date;
}

/**
 * Calculate current streak for a habit
 */
export function calculateHabitStreak(
  events: HabitEvent[],
  targetCount: number = 1
): number {
  if (events.length === 0) return 0;

  // Sort events by date (newest first)
  const sortedEvents = [...events].sort((a, b) => {
    return b.completedAt.getTime() - a.completedAt.getTime();
  });

  // Group events by date
  const eventsByDate = new Map<string, number>();
  sortedEvents.forEach((event) => {
    const dateKey = getDateKey(event.completedAt);
    eventsByDate.set(dateKey, (eventsByDate.get(dateKey) || 0) + 1);
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if today is complete
  const todayKey = getDateKey(today);
  const todayCount = eventsByDate.get(todayKey) || 0;

  let currentDate = new Date(today);
  let streak = 0;

  // Start from today if complete, otherwise from yesterday
  if (todayCount >= targetCount) {
    streak = 1;
    currentDate.setDate(currentDate.getDate() - 1);
  } else {
    // Grace period: check if yesterday was complete
    currentDate.setDate(currentDate.getDate() - 1);
  }

  // Count consecutive days backwards
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

function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
