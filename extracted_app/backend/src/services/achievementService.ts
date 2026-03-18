import { db } from "../db";

interface AchievementDef {
  type: string;
  title: string;
  description: string;
  xp: number;
}

const ACHIEVEMENT_CATALOG: Record<string, AchievementDef> = {
  first_habit: { type: 'first_habit', title: 'First Step', description: 'Created your first habit', xp: 50 },
  first_completion: { type: 'first_completion', title: 'Momentum', description: 'Completed a habit for the first time', xp: 50 },
  streak_3: { type: 'streak_3', title: 'Getting Started', description: 'Achieved a 3-day streak', xp: 100 },
  streak_7: { type: 'streak_7', title: 'Week Warrior', description: 'Achieved a 7-day streak', xp: 200 },
  streak_14: { type: 'streak_14', title: 'Fortnight Force', description: 'Achieved a 14-day streak', xp: 300 },
  streak_30: { type: 'streak_30', title: 'Monthly Master', description: 'Achieved a 30-day streak', xp: 500 },
  streak_100: { type: 'streak_100', title: 'Centurion', description: 'Achieved a 100-day streak', xp: 1000 },
  completions_10: { type: 'completions_10', title: 'Decade Mark', description: 'Completed habits 10 times', xp: 100 },
  completions_100: { type: 'completions_100', title: 'Century Club', description: 'Completed habits 100 times', xp: 500 },
  first_focus: { type: 'first_focus', title: 'Deep Work Begins', description: 'Completed your first focus session', xp: 50 },
  focus_1h: { type: 'focus_1h', title: 'Hour of Power', description: 'Accumulated 1 hour of focus time', xp: 150 },
  first_todo: { type: 'first_todo', title: 'Task Tackler', description: 'Completed your first todo', xp: 50 },
  protocol_promoted: { type: 'protocol_promoted', title: 'Protocol Graduate', description: 'A protocol habit was promoted to core', xp: 300 },
  all_habits_day: { type: 'all_habits_day', title: 'Perfect Day', description: 'Completed all habits in a single day', xp: 150 },
};

async function hasAchievement(profileId: number, type: string): Promise<boolean> {
  const existing = await db.achievement.findFirst({
    where: { profileId, type },
  });
  return !!existing;
}

async function grantAchievement(profileId: number, type: string, habitId?: string): Promise<any | null> {
  const def = ACHIEVEMENT_CATALOG[type];
  if (!def) return null;

  if (await hasAchievement(profileId, type)) return null;

  const achievement = await db.achievement.create({
    data: {
      profileId,
      type: def.type,
      title: def.title,
      description: def.description,
      habitId: habitId ?? null,
      celebrated: false,
    },
  });

  // Award XP
  await db.profile.update({
    where: { id: profileId },
    data: { xp: { increment: def.xp } },
  });

  console.log(`[Achievement] Granted "${def.title}" to profile ${profileId} (+${def.xp} XP)`);
  return achievement;
}

/**
 * Check milestones after a habit completion event.
 */
export async function checkHabitMilestones(profileId: number, habitId: string): Promise<any[]> {
  const granted: any[] = [];

  // Count total completions across all habits
  const totalCompletions = await db.habitEvent.count({
    where: { habit: { profileId } },
  });

  // First completion
  if (totalCompletions === 1) {
    const a = await grantAchievement(profileId, 'first_completion', habitId);
    if (a) granted.push(a);
  }

  // Completion milestones
  if (totalCompletions >= 10) {
    const a = await grantAchievement(profileId, 'completions_10');
    if (a) granted.push(a);
  }
  if (totalCompletions >= 100) {
    const a = await grantAchievement(profileId, 'completions_100');
    if (a) granted.push(a);
  }

  // Check streak for this habit
  const events = await db.habitEvent.findMany({
    where: { habitId },
    orderBy: { completedAt: 'desc' },
    take: 110,
  });

  // Calculate streak from events
  if (events.length > 0) {
    const { calculateHabitStreak } = await import("../utils/streakCalculator");
    const streak = calculateHabitStreak(events);

    if (streak >= 3) {
      const a = await grantAchievement(profileId, 'streak_3', habitId);
      if (a) granted.push(a);
    }
    if (streak >= 7) {
      const a = await grantAchievement(profileId, 'streak_7', habitId);
      if (a) granted.push(a);
    }
    if (streak >= 14) {
      const a = await grantAchievement(profileId, 'streak_14', habitId);
      if (a) granted.push(a);
    }
    if (streak >= 30) {
      const a = await grantAchievement(profileId, 'streak_30', habitId);
      if (a) granted.push(a);
    }
    if (streak >= 100) {
      const a = await grantAchievement(profileId, 'streak_100', habitId);
      if (a) granted.push(a);
    }
  }

  // Check if all habits completed today
  const allHabits = await db.habit.findMany({
    where: { profileId, archived: false },
  });

  if (allHabits.length > 0) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const habitsWithToday = await Promise.all(
      allHabits.map(async (h) => {
        const event = await db.habitEvent.findFirst({
          where: { habitId: h.id, completedAt: { gte: todayStart } },
        });
        return !!event;
      })
    );

    if (habitsWithToday.every(Boolean)) {
      const a = await grantAchievement(profileId, 'all_habits_day');
      if (a) granted.push(a);
    }
  }

  return granted;
}

export async function checkHabitCreated(profileId: number): Promise<any | null> {
  const count = await db.habit.count({ where: { profileId } });
  if (count === 1) {
    return grantAchievement(profileId, 'first_habit');
  }
  return null;
}

export async function checkFocusMilestones(profileId: number): Promise<any[]> {
  const granted: any[] = [];

  const sessionCount = await db.focusSession.count({
    where: { profileId, completed: true },
  });

  if (sessionCount === 1) {
    const a = await grantAchievement(profileId, 'first_focus');
    if (a) granted.push(a);
  }

  // Total focus hours
  const sessions = await db.focusSession.findMany({
    where: { profileId, completed: true, duration: { not: null } },
    select: { duration: true },
  });
  const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration ?? 0), 0);
  const totalHours = totalMinutes / 60;

  if (totalHours >= 1) {
    const a = await grantAchievement(profileId, 'focus_1h');
    if (a) granted.push(a);
  }

  return granted;
}

export async function checkTodoMilestones(profileId: number): Promise<any | null> {
  const count = await db.todo.count({ where: { profileId, completed: true } });
  if (count === 1) {
    return grantAchievement(profileId, 'first_todo');
  }
  return null;
}

// API endpoint to get uncelebrated achievements
export async function getUncelebratedAchievements(profileId: number) {
  return db.achievement.findMany({
    where: { profileId, celebrated: false },
    orderBy: { unlockedAt: 'desc' },
  });
}

export async function markCelebrated(achievementId: string) {
  return db.achievement.update({
    where: { id: achievementId },
    data: { celebrated: true },
  });
}
