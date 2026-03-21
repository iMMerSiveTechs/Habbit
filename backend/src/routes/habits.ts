import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import type { AppType } from "../index";
import {
  createHabitRequestSchema,
  updateHabitRequestSchema,
  completeHabitRequestSchema,
  logHabitRequestSchema,
} from "../../../shared/contracts";
import { calculateHabitStreak } from "../utils/streakCalculator";
import { getLimits } from "../tierGuard";

// Helper: parse completionHistory JSON string into an array of date strings
function parseCompletionHistory(history: string | null): string[] {
  if (!history) return [];
  try {
    const parsed = JSON.parse(history);
    if (Array.isArray(parsed)) return parsed as string[];
    return [];
  } catch {
    return [];
  }
}

// Helper: calculate the best (longest) streak from an array of YYYY-MM-DD date strings
function calculateBestStreakFromDates(dates: string[]): number {
  if (dates.length === 0) return 0;
  const sorted = [...dates].sort();
  let best = 1;
  let current = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] as string);
    const curr = new Date(sorted[i] as string);
    const diffMs = curr.getTime() - prev.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      current++;
      best = Math.max(best, current);
    } else if (diffDays > 1) {
      current = 1;
    }
    // diffDays === 0 means same day duplicate, skip
  }
  return best;
}

// Helper function for date keys
function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Category metadata
const CATEGORY_METADATA: { [key: string]: { label: string; emoji: string } } = {
  health: { label: "Health", emoji: "💪" },
  mind: { label: "Mind", emoji: "🧠" },
  work: { label: "Work", emoji: "💼" },
  growth: { label: "Growth", emoji: "🌱" },
  fitness: { label: "Fitness", emoji: "🏃" },
  mindfulness: { label: "Mindfulness", emoji: "🧘" },
  social: { label: "Social", emoji: "👥" },
  leisure: { label: "Leisure", emoji: "🎮" },
  general: { label: "General", emoji: "📌" },
};

const habitsRouter = new Hono<AppType>()
  // Get all habits for current user
  .get("/", async (c) => {
    const user = c.get("user");

    // Allow unauthenticated access with demo data
    if (!user) {
      return c.json({
        habits: [
          {
            id: "demo-1",
            title: "Morning Meditation",
            description: "Start your day with mindfulness",
            icon: "meditation",
            color: "#00D4FF",
            category: "mindfulness",
            frequency: "daily",
            targetCount: 1,
            order: 0,
            completedToday: false,
            streak: 0,
          },
          {
            id: "demo-2",
            title: "Exercise",
            description: "30 minutes of physical activity",
            icon: "dumbbell",
            color: "#FF00E5",
            category: "fitness",
            frequency: "daily",
            targetCount: 1,
            order: 1,
            completedToday: false,
            streak: 0,
          },
          {
            id: "demo-3",
            title: "Read for 30 mins",
            description: "Expand your knowledge",
            icon: "book",
            color: "#8B5CF6",
            category: "mind",
            frequency: "daily",
            targetCount: 1,
            order: 2,
            completedToday: false,
            streak: 0,
          },
        ],
      });
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
      include: {
        habits: {
          where: { archived: false },
          orderBy: { order: "asc" },
          include: {
            events: {
              where: {
                completedAt: {
                  gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
                },
              },
              orderBy: { completedAt: "desc" },
            },
          },
        },
      },
    });

    if (!profile) {
      return c.json({ habits: [] });
    }

    const habits = profile.habits.map((habit) => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEvents = habit.events.filter(e => e.completedAt >= todayStart);

      return {
      id: habit.id,
      title: habit.title,
      description: habit.description,
      icon: habit.icon,
      color: habit.color,
      frequency: habit.frequency,
      targetCount: habit.targetCount,
      order: habit.order,
      archived: habit.archived,
      recurringType: habit.recurringType,
      recurringInterval: habit.recurringInterval,
      recurringDays: habit.recurringDays,
      reminderTime: habit.reminderTime,
      reminderEnabled: habit.reminderEnabled,
      createdAt: habit.createdAt.toISOString(),
      updatedAt: habit.updatedAt.toISOString(),
      completedToday: todayEvents.length >= habit.targetCount,
      todayCount: todayEvents.length,
      currentStreak: calculateHabitStreak(habit.events, habit.targetCount),
      // Protocol fields
      habitType: habit.habitType,
      protocolTarget: habit.protocolTarget,
      protocolWindowDays: habit.protocolWindowDays,
      protocolStartDate: habit.protocolStartDate,
      protocolStatus: habit.protocolStatus,
      bestStreak: habit.bestStreak,
      };
    });

    return c.json({ habits });
  })

  // Get single habit by ID
  .get("/:id", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const habitId = c.req.param("id");
    const profile = await db.profile.findUnique({ where: { userId: user.id } });
    if (!profile) return c.json({ error: "Profile not found" }, 404);

    const habit = await db.habit.findFirst({
      where: { id: habitId, profileId: profile.id },
      include: {
        events: {
          where: {
            completedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          },
        },
      },
    });

    if (!habit) return c.json({ error: "Habit not found" }, 404);

    return c.json({
      habit: {
        id: habit.id,
        title: habit.title,
        description: habit.description,
        icon: habit.icon,
        color: habit.color,
        frequency: habit.frequency,
        targetCount: habit.targetCount,
        order: habit.order,
        archived: habit.archived,
        recurringType: habit.recurringType,
        recurringInterval: habit.recurringInterval,
        recurringDays: habit.recurringDays,
        reminderTime: habit.reminderTime,
        reminderEnabled: habit.reminderEnabled,
        createdAt: habit.createdAt.toISOString(),
        updatedAt: habit.updatedAt.toISOString(),
        completedToday: habit.events.length >= habit.targetCount,
        todayCount: habit.events.length,
        habitType: habit.habitType,
        protocolTarget: habit.protocolTarget,
        protocolWindowDays: habit.protocolWindowDays,
        protocolStartDate: habit.protocolStartDate,
        protocolStatus: habit.protocolStatus,
        bestStreak: habit.bestStreak,
      },
    });
  })

  // Create new habit
  .post("/", zValidator("json", createHabitRequestSchema), async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    // Tier gate: check habit creation limit
    const limits = getLimits(profile.subscriptionTier || "free");
    if (limits.maxHabits !== -1) {
      const currentCount = await db.habit.count({
        where: { profileId: profile.id, archived: false },
      });
      if (currentCount >= limits.maxHabits) {
        return c.json(
          {
            error: "upgrade_required",
            message: `You've reached your limit of ${limits.maxHabits} habits. Upgrade to Core or higher to create more.`,
            requiredTier: "core",
          },
          403,
        );
      }
    }

    const data = c.req.valid("json");

    const maxOrder = await db.habit.findFirst({
      where: { profileId: profile.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const habit = await db.habit.create({
      data: {
        profileId: profile.id,
        title: data.title,
        description: data.description || null,
        icon: data.icon || null,
        color: data.color || "#00D4FF",
        frequency: data.frequency || "daily",
        targetCount: data.targetCount || 1,
        order: (maxOrder?.order || 0) + 1,
        recurringType: data.recurringType || null,
        recurringInterval: data.recurringInterval || null,
        recurringDays: data.recurringDays ? JSON.stringify(data.recurringDays) : null,
        reminderTime: data.reminderTime || null,
        reminderEnabled: data.reminderEnabled || false,
        // Protocol fields
        habitType: data.habitType || "standard",
        protocolTarget: data.protocolTarget || null,
        protocolWindowDays: data.protocolWindowDays || null,
        protocolStartDate: data.protocolStartDate || null,
        protocolStatus: data.protocolStatus || null,
      },
    });

    return c.json({
      habit: {
        id: habit.id,
        title: habit.title,
        description: habit.description,
        icon: habit.icon,
        color: habit.color,
        frequency: habit.frequency,
        targetCount: habit.targetCount,
        order: habit.order,
        archived: habit.archived,
        recurringType: habit.recurringType,
        recurringInterval: habit.recurringInterval,
        recurringDays: habit.recurringDays,
        reminderTime: habit.reminderTime,
        reminderEnabled: habit.reminderEnabled,
        createdAt: habit.createdAt.toISOString(),
        updatedAt: habit.updatedAt.toISOString(),
        // Protocol fields
        habitType: habit.habitType,
        protocolTarget: habit.protocolTarget,
        protocolWindowDays: habit.protocolWindowDays,
        protocolStartDate: habit.protocolStartDate,
        protocolStatus: habit.protocolStatus,
        bestStreak: habit.bestStreak,
      },
    });
  })

  // Update habit
  .patch("/:id", zValidator("json", updateHabitRequestSchema), async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const habitId = c.req.param("id");
    const data = c.req.valid("json");

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const habit = await db.habit.findFirst({
      where: { id: habitId, profileId: profile.id },
    });

    if (!habit) {
      return c.json({ error: "Habit not found" }, 404);
    }

    const updated = await db.habit.update({
      where: { id: habitId },
      data: {
        title: data.title,
        description: data.description,
        icon: data.icon,
        color: data.color,
        frequency: data.frequency,
        targetCount: data.targetCount,
        order: data.order,
        archived: data.archived,
        recurringType: data.recurringType || null,
        recurringInterval: data.recurringInterval || null,
        recurringDays: data.recurringDays ? JSON.stringify(data.recurringDays) : null,
        reminderTime: data.reminderTime || null,
        reminderEnabled: data.reminderEnabled !== undefined ? data.reminderEnabled : false,
      },
    });

    return c.json({
      habit: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        icon: updated.icon,
        color: updated.color,
        frequency: updated.frequency,
        targetCount: updated.targetCount,
        order: updated.order,
        archived: updated.archived,
        recurringType: updated.recurringType,
        recurringInterval: updated.recurringInterval,
        recurringDays: updated.recurringDays,
        reminderTime: updated.reminderTime,
        reminderEnabled: updated.reminderEnabled,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  })

  // Delete habit
  .delete("/:id", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const habitId = c.req.param("id");

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const habit = await db.habit.findFirst({
      where: { id: habitId, profileId: profile.id },
    });

    if (!habit) {
      return c.json({ error: "Habit not found" }, 404);
    }

    await db.habit.delete({
      where: { id: habitId },
    });

    return c.json({ success: true });
  })

  // Complete habit
  .post("/:id/complete", zValidator("json", completeHabitRequestSchema), async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const habitId = c.req.param("id");
    const data = c.req.valid("json");

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const habit = await db.habit.findFirst({
      where: { id: habitId, profileId: profile.id },
    });

    if (!habit) {
      return c.json({ error: "Habit not found" }, 404);
    }

    // Generate a stable clientEventId for today if none provided,
    // so that duplicate calls on the same day are idempotent
    const today = new Date().toISOString().split("T")[0];
    const clientEventId = data.clientEventId ?? `complete-${habitId}-${today}`;

    // Idempotency check: if this clientEventId was already recorded, return existing state
    const existing = await db.habitEvent.findFirst({
      where: { habitId, clientEventId },
    });

    if (existing) {
      const allEvents = await db.habitEvent.findMany({
        where: { habitId, completedAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
        orderBy: { completedAt: "desc" },
      });
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEvents = allEvents.filter((e) => e.completedAt >= todayStart);
      return c.json({
        event: {
          id: existing.id,
          habitId: existing.habitId,
          completedAt: existing.completedAt.toISOString(),
          note: existing.note,
          mood: existing.mood,
        },
        alreadyRecorded: true,
        todayCount: todayEvents.length,
        completedToday: todayEvents.length >= habit.targetCount,
      });
    }

    // Create the event with the dedup key
    const targetDate = new Date();
    targetDate.setHours(12, 0, 0, 0);

    const event = await db.habitEvent.create({
      data: {
        habitId: habit.id,
        completedAt: targetDate,
        note: data.note ?? null,
        mood: data.mood ?? null,
        clientEventId,
      },
    });

    // Update bestStreak if needed
    const allEvents = await db.habitEvent.findMany({
      where: { habitId, completedAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
      orderBy: { completedAt: "desc" },
    });
    const currentStreak = calculateHabitStreak(allEvents, habit.targetCount);
    const newBestStreak = Math.max(habit.bestStreak, currentStreak);
    if (newBestStreak > habit.bestStreak) {
      await db.habit.update({ where: { id: habitId }, data: { bestStreak: newBestStreak } });
    }

    return c.json({
      event: {
        id: event.id,
        habitId: event.habitId,
        completedAt: event.completedAt.toISOString(),
        note: event.note,
        mood: event.mood,
      },
    });
  })

  // Get habit events
  .get("/:id/events", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const habitId = c.req.param("id");

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const habit = await db.habit.findFirst({
      where: { id: habitId, profileId: profile.id },
    });

    if (!habit) {
      return c.json({ error: "Habit not found" }, 404);
    }

    const events = await db.habitEvent.findMany({
      where: { habitId: habit.id },
      orderBy: { completedAt: "desc" },
      take: 100,
    });

    return c.json({
      events: events.map((e) => ({
        id: e.id,
        habitId: e.habitId,
        completedAt: e.completedAt.toISOString(),
        note: e.note,
        mood: e.mood,
      })),
    });
  })

  // Get habit streak
  .get("/:id/streak", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const habitId = c.req.param("id");

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const habit = await db.habit.findFirst({
      where: { id: habitId, profileId: profile.id },
    });

    if (!habit) {
      return c.json({ error: "Habit not found" }, 404);
    }

    // Get all events with full details
    const events = await db.habitEvent.findMany({
      where: { habitId: habit.id },
      orderBy: { completedAt: "desc" },
    });

    // Calculate current streak
    const currentStreak = calculateHabitStreak(
      events.map(e => ({ completedAt: e.completedAt })),
      habit.targetCount
    );

    // Calculate longest streak
    let longestStreak = 0;
    let tempStreak = 0;
    const eventsByDate = new Map<string, number>();

    events.forEach((event) => {
      const dateKey = getDateKey(event.completedAt);
      eventsByDate.set(dateKey, (eventsByDate.get(dateKey) || 0) + 1);
    });

    const sortedDates = Array.from(eventsByDate.keys()).sort().reverse();

    for (let i = 0; i < sortedDates.length; i++) {
      const dateKey = sortedDates[i] as string;
      const count = eventsByDate.get(dateKey) || 0;

      if (count >= habit.targetCount) {
        tempStreak++;
        longestStreak = Math.max(longestStreak, tempStreak);
      } else {
        tempStreak = 0;
      }

      // Check for consecutive days
      if (i < sortedDates.length - 1) {
        const currentDate = new Date(dateKey);
        const nextDate = new Date(sortedDates[i + 1] as string);
        const diffDays = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays > 1) {
          tempStreak = 0;
        }
      }
    }

    // Return completions with details
    const completions = events.map(e => ({
      id: e.id,
      completedAt: e.completedAt.toISOString(),
      mood: e.mood,
      note: e.note,
    }));

    return c.json({
      currentStreak,
      longestStreak,
      completions,
    });
  })

  // Get all reminders for a habit
  .get("/:id/reminders", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const habitId = c.req.param("id");
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const habit = await db.habit.findFirst({
      where: {
        id: habitId,
        profileId: profile.id,
      },
      include: {
        reminders: {
          orderBy: { reminderTime: "asc" },
        },
      },
    });

    if (!habit) {
      return c.json({ error: "Habit not found" }, 404);
    }

    return c.json({ reminders: habit.reminders });
  })

  // Create a new reminder for a habit
  .post("/:id/reminders", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const habitId = c.req.param("id");
    const data = await c.req.json();

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const habit = await db.habit.findFirst({
      where: {
        id: habitId,
        profileId: profile.id,
      },
    });

    if (!habit) {
      return c.json({ error: "Habit not found" }, 404);
    }

    const reminder = await db.habitReminder.create({
      data: {
        habitId,
        reminderTime: data.reminderTime,
        recurringType: data.recurringType || "daily",
        recurringInterval: data.recurringInterval,
        recurringDays: data.recurringDays,
        enabled: data.enabled !== undefined ? data.enabled : true,
      },
    });

    return c.json({ reminder });
  })

  // Update a reminder
  .patch("/:habitId/reminders/:reminderId", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const habitId = c.req.param("habitId");
    const reminderId = c.req.param("reminderId");
    const data = await c.req.json();

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const habit = await db.habit.findFirst({
      where: {
        id: habitId,
        profileId: profile.id,
      },
    });

    if (!habit) {
      return c.json({ error: "Habit not found" }, 404);
    }

    const reminder = await db.habitReminder.update({
      where: { id: reminderId },
      data: {
        reminderTime: data.reminderTime,
        recurringType: data.recurringType,
        recurringInterval: data.recurringInterval,
        recurringDays: data.recurringDays,
        enabled: data.enabled,
      },
    });

    return c.json({ reminder });
  })

  // Delete a reminder
  .delete("/:habitId/reminders/:reminderId", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const habitId = c.req.param("habitId");
    const reminderId = c.req.param("reminderId");

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const habit = await db.habit.findFirst({
      where: {
        id: habitId,
        profileId: profile.id,
      },
    });

    if (!habit) {
      return c.json({ error: "Habit not found" }, 404);
    }

    await db.habitReminder.delete({
      where: { id: reminderId },
    });

    return c.json({ success: true });
  })

  // Protocol-style logging for a habit
  .post("/:id/log", zValidator("json", logHabitRequestSchema), async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const habitId = c.req.param("id");
    const data = c.req.valid("json");

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const habit = await db.habit.findFirst({
      where: { id: habitId, profileId: profile.id },
    });

    if (!habit) {
      return c.json({ error: "Habit not found" }, 404);
    }

    const completionHistory = parseCompletionHistory(habit.completionHistory);
    const dateStr = data.date; // YYYY-MM-DD

    if (data.quality === "undo") {
      // Remove the date from completionHistory
      const updatedHistory = completionHistory.filter((d) => d !== dateStr);

      // Delete today's HabitEvent(s) for this date
      const startOfDay = new Date(dateStr + "T00:00:00.000Z");
      const endOfDay = new Date(dateStr + "T23:59:59.999Z");
      await db.habitEvent.deleteMany({
        where: {
          habitId: habit.id,
          completedAt: {
            gte: startOfDay,
            lte: endOfDay,
          },
        },
      });

      const newBestStreak = calculateBestStreakFromDates(updatedHistory);

      const updatedHabit = await db.habit.update({
        where: { id: habit.id },
        data: {
          completionHistory: JSON.stringify(updatedHistory),
          bestStreak: Math.max(newBestStreak, 0),
        },
      });

      return c.json({
        success: true,
        habit: {
          id: updatedHabit.id,
          completionHistory: updatedHistory,
          bestStreak: updatedHabit.bestStreak,
          protocolStatus: updatedHabit.protocolStatus,
          habitType: updatedHabit.habitType,
        },
        event: null,
      });
    }

    // For "verified", "partial", or "skipped"
    let event: { id: string; habitId: string; completedAt: Date; note: string | null; mood: number | null } | null = null;

    if (data.quality === "verified" || data.quality === "partial") {
      // Add date to completionHistory if not already present
      if (!completionHistory.includes(dateStr)) {
        completionHistory.push(dateStr);
      }

      // Create a HabitEvent
      event = await db.habitEvent.create({
        data: {
          habitId: habit.id,
          completedAt: new Date(dateStr + "T12:00:00.000Z"),
          note: data.quality === "partial" ? "partial" : "verified",
        },
      });
    }
    // "skipped": record but don't count toward progress -- no completionHistory update, no event

    // Check if protocol should be promoted to "core"
    let newProtocolStatus = habit.protocolStatus;
    let newHabitType = habit.habitType;
    if (
      habit.habitType === "protocol" &&
      habit.protocolStatus === "active" &&
      habit.protocolTarget !== null &&
      habit.protocolTarget !== undefined
    ) {
      if (completionHistory.length >= habit.protocolTarget) {
        newProtocolStatus = "promoted";
        newHabitType = "core";
      }
    }

    const newBestStreak = calculateBestStreakFromDates(completionHistory);

    const updatedHabit = await db.habit.update({
      where: { id: habit.id },
      data: {
        completionHistory: JSON.stringify(completionHistory),
        bestStreak: Math.max(newBestStreak, habit.bestStreak),
        protocolStatus: newProtocolStatus,
        habitType: newHabitType,
      },
    });

    return c.json({
      success: true,
      habit: {
        id: updatedHabit.id,
        completionHistory: completionHistory,
        bestStreak: updatedHabit.bestStreak,
        protocolStatus: updatedHabit.protocolStatus,
        habitType: updatedHabit.habitType,
      },
      event: event
        ? {
            id: event.id,
            habitId: event.habitId,
            completedAt: event.completedAt.toISOString(),
            note: event.note,
            mood: event.mood,
          }
        : null,
    });
  })

  // Daily integrity audit -- check all active protocols past their window,
  // archive completed intentions, and reward perfect days
  .post("/audit", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const today = new Date();
    const todayStr = getDateKey(today);
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);

    // --- 1. Archive completed intentions from previous days ---
    // Find intentions that were completed (have events) before today
    const completedIntentions = await db.habit.findMany({
      where: {
        profileId: profile.id,
        habitType: "intention",
        archived: false,
      },
      include: {
        events: true,
      },
    });

    let archivedIntentions = 0;
    for (const intention of completedIntentions) {
      // Check if the intention has any events from before today
      const hasPreTodayEvents = intention.events.some(
        (e) => e.completedAt < startOfToday
      );
      if (hasPreTodayEvents && intention.events.length > 0) {
        await db.habit.update({
          where: { id: intention.id },
          data: { archived: true },
        });
        archivedIntentions++;
      }
    }

    // --- 2. Check active protocols past their window ---
    const activeProtocols = await db.habit.findMany({
      where: {
        profileId: profile.id,
        habitType: "protocol",
        protocolStatus: "active",
        archived: false,
      },
    });

    const failed: Array<{ habitId: string; title: string; reason: string }> = [];

    for (const habit of activeProtocols) {
      if (!habit.protocolStartDate || !habit.protocolWindowDays) {
        continue;
      }

      const startDate = new Date(habit.protocolStartDate);
      const deadlineDate = new Date(startDate);
      deadlineDate.setDate(deadlineDate.getDate() + habit.protocolWindowDays);

      if (today > deadlineDate) {
        const completionHistory = parseCompletionHistory(habit.completionHistory);
        const target = habit.protocolTarget ?? 0;

        if (completionHistory.length < target) {
          await db.habit.update({
            where: { id: habit.id },
            data: { protocolStatus: "failed" },
          });

          failed.push({
            habitId: habit.id,
            title: habit.title,
            reason: `Window expired: ${completionHistory.length}/${target} completions in ${habit.protocolWindowDays} days`,
          });
        }
      }
    }

    // --- 3. Perfect day check: integrity regeneration ---
    // Get all active non-intention habits for this profile
    const activeNonIntentionHabits = await db.habit.findMany({
      where: {
        profileId: profile.id,
        archived: false,
        habitType: { not: "intention" },
      },
      include: {
        events: {
          where: {
            completedAt: {
              gte: startOfToday,
            },
          },
        },
      },
    });

    let perfectDay = false;
    let integrityGained = 0;

    if (activeNonIntentionHabits.length > 0) {
      // Perfect day = every active non-intention habit has at least one event today
      perfectDay = activeNonIntentionHabits.every(
        (habit) => habit.events.length > 0
      );

      if (perfectDay) {
        integrityGained = 2;
      }
    }

    // --- 4. Apply penalties and bonuses, update lastAuditDate ---
    const integrityPenalty = failed.length * 10;
    const xpPenalty = failed.length * 250;

    let newIntegrity = profile.integrity - integrityPenalty + integrityGained;
    newIntegrity = Math.max(0, Math.min(100, newIntegrity));

    const updatedProfile = await db.profile.update({
      where: { id: profile.id },
      data: {
        integrity: newIntegrity,
        xp: Math.max(0, profile.xp - xpPenalty),
        lastAuditDate: todayStr,
      },
    });

    return c.json({
      audited: activeProtocols.length,
      failed,
      archivedIntentions,
      integrityGained,
      perfectDay,
      integrityAfter: updatedProfile.integrity,
      xpAfter: updatedProfile.xp,
      auditDate: todayStr,
    });
  })

  // Get all archived habits AND failed protocol habits
  .get("/archived", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    // Archived habits OR failed protocol habits (may not be archived yet)
    const habits = await db.habit.findMany({
      where: {
        profileId: profile.id,
        OR: [
          { archived: true },
          { habitType: "protocol", protocolStatus: "failed" },
        ],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        events: {
          where: {
            completedAt: {
              gte: new Date(new Date().setHours(0, 0, 0, 0)),
            },
          },
        },
      },
    });

    return c.json({
      habits: habits.map((habit) => ({
        id: habit.id,
        title: habit.title,
        description: habit.description,
        icon: habit.icon,
        color: habit.color,
        category: habit.category as string,
        frequency: habit.frequency,
        targetCount: habit.targetCount,
        order: habit.order,
        archived: habit.archived,
        recurringType: habit.recurringType,
        recurringInterval: habit.recurringInterval,
        recurringDays: habit.recurringDays,
        reminderTime: habit.reminderTime,
        reminderEnabled: habit.reminderEnabled,
        createdAt: habit.createdAt.toISOString(),
        updatedAt: habit.updatedAt.toISOString(),
        completedToday: habit.events.length >= habit.targetCount,
        todayCount: habit.events.length,
        currentStreak: 0,
        habitType: habit.habitType,
        protocolTarget: habit.protocolTarget,
        protocolWindowDays: habit.protocolWindowDays,
        protocolStartDate: habit.protocolStartDate,
        protocolStatus: habit.protocolStatus,
        bestStreak: habit.bestStreak,
      })),
    });
  })

  // Restore an archived habit (or reset a failed protocol to standard)
  .post("/:id/restore", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const habitId = c.req.param("id");

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const habit = await db.habit.findFirst({
      where: { id: habitId, profileId: profile.id },
    });

    if (!habit) {
      return c.json({ error: "Habit not found" }, 404);
    }

    // If it was a failed protocol, reset to standard type
    const isFailedProtocol =
      habit.habitType === "protocol" && habit.protocolStatus === "failed";

    const updated = await db.habit.update({
      where: { id: habitId },
      data: {
        archived: false,
        protocolStatus: isFailedProtocol ? null : habit.protocolStatus,
        habitType: isFailedProtocol ? "standard" : habit.habitType,
      },
    });

    return c.json({
      success: true,
      habit: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        icon: updated.icon,
        color: updated.color,
        category: updated.category as string,
        frequency: updated.frequency,
        targetCount: updated.targetCount,
        order: updated.order,
        archived: updated.archived,
        recurringType: updated.recurringType,
        recurringInterval: updated.recurringInterval,
        recurringDays: updated.recurringDays,
        reminderTime: updated.reminderTime,
        reminderEnabled: updated.reminderEnabled,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        habitType: updated.habitType,
        protocolTarget: updated.protocolTarget,
        protocolWindowDays: updated.protocolWindowDays,
        protocolStartDate: updated.protocolStartDate,
        protocolStatus: updated.protocolStatus,
        bestStreak: updated.bestStreak,
      },
    });
  })

  // Permanently delete a habit and all its events
  .delete("/:id/permanent", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const habitId = c.req.param("id");

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const habit = await db.habit.findFirst({
      where: { id: habitId, profileId: profile.id },
    });

    if (!habit) {
      return c.json({ error: "Habit not found" }, 404);
    }

    // Count events before deletion for the response
    const eventCount = await db.habitEvent.count({
      where: { habitId: habit.id },
    });

    // Cascade delete handles events and reminders via schema relations
    await db.habit.delete({
      where: { id: habit.id },
    });

    return c.json({
      success: true,
      deletedEvents: eventCount,
    });
  })

  // Get category analytics
  .get("/analytics/categories", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
      include: {
        habits: {
          where: { archived: false },
          include: {
            events: {
              where: {
                completedAt: {
                  gte: new Date(new Date().setHours(0, 0, 0, 0)),
                },
              },
            },
          },
        },
      },
    });

    if (!profile) {
      return c.json({ categories: [] });
    }

    // Group habits by category
    const categoryStats: { [key: string]: any } = {};

    for (const habit of profile.habits) {
      const category = habit.category || "general";

      if (!categoryStats[category]) {
        categoryStats[category] = {
          category,
          label: CATEGORY_METADATA[category]?.label || category,
          emoji: CATEGORY_METADATA[category]?.emoji || "📌",
          totalHabits: 0,
          completedToday: 0,
          targetToday: 0,
          totalStreakDays: 0,
        };
      }

      categoryStats[category].totalHabits++;
      categoryStats[category].targetToday += habit.targetCount;

      // Count today's completions
      const todayCompletions = habit.events?.length || 0;
      if (todayCompletions >= habit.targetCount) {
        categoryStats[category].completedToday++;
      }

      // Calculate streak for this habit
      const allEvents = await db.habitEvent.findMany({
        where: { habitId: habit.id },
        orderBy: { completedAt: "desc" },
      });

      const streak = calculateHabitStreak(
        allEvents.map(e => ({ completedAt: e.completedAt })),
        habit.targetCount
      );

      categoryStats[category].totalStreakDays += streak;
    }

    // Calculate completion rates
    const categories = Object.values(categoryStats).map((cat: any) => ({
      ...cat,
      completionRate: cat.totalHabits > 0
        ? Math.round((cat.completedToday / cat.totalHabits) * 100)
        : 0,
    }));

    // Sort by completion rate
    categories.sort((a, b) => b.completionRate - a.completionRate);

    // Overall stats
    const totalHabits = profile.habits.length;
    const completedToday = categories.reduce((sum, cat) => sum + cat.completedToday, 0);
    const overallCompletionRate = totalHabits > 0
      ? Math.round((completedToday / totalHabits) * 100)
      : 0;

    return c.json({
      overall: {
        totalHabits,
        completedToday,
        remainingToday: totalHabits - completedToday,
        completionRate: overallCompletionRate,
      },
      categories,
    });
  })

  // Skip a habit (MVP: no DB persistence, just validate auth and return success)
  .post("/:habitId/skip", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const habitId = c.req.param("habitId");

    let body: { reason?: string; skippedAt?: string } = {};
    try {
      body = await c.req.json();
    } catch {
      // Body is optional, default to empty object
    }

    const { reason, skippedAt } = body;
    const resolvedSkippedAt = skippedAt ?? new Date().toISOString();

    const profile = await db.profile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    // Verify the habit belongs to this user
    const habit = await db.habit.findFirst({
      where: { id: habitId, profileId: profile.id },
    });
    if (!habit) {
      return c.json({ error: "Habit not found" }, 404);
    }

    console.log(
      `[skip] habitId=${habitId} profileId=${profile.id} skippedAt=${resolvedSkippedAt}${reason ? ` reason="${reason}"` : ""}`
    );

    return c.json({
      success: true,
      habitId,
      skippedAt: resolvedSkippedAt,
    });
  })

  // Canonical mark endpoint: complete, undo, or skip a habit for a given date
  .post("/:id/mark", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const habitId = c.req.param("id");

    let body: { action: string; date?: string; mood?: number; note?: string; clientEventId?: string };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON body" }, 400);
    }

    const { action, date, mood, note, clientEventId } = body;

    if (!action || !["complete", "undo", "skip"].includes(action)) {
      return c.json({ error: "action must be 'complete', 'undo', or 'skip'" }, 400);
    }

    const profile = await db.profile.findUnique({ where: { userId: user.id } });
    if (!profile) return c.json({ error: "Profile not found" }, 404);

    const habit = await db.habit.findFirst({
      where: { id: habitId, profileId: profile.id },
    });
    if (!habit) return c.json({ error: "Habit not found" }, 404);

    // Resolve the target date (default: today, noon local time to avoid tz edge cases)
    const targetDate = date ? new Date(date + "T12:00:00") : new Date();
    targetDate.setHours(12, 0, 0, 0);
    const dateKey = getDateKey(targetDate);

    if (action === "complete") {
      // Idempotency: check by clientEventId if provided
      if (clientEventId) {
        const existing = await db.habitEvent.findFirst({
          where: { habitId, clientEventId },
        });
        if (existing) {
          // Already recorded — return current state
          const allEvents = await db.habitEvent.findMany({
            where: { habitId, completedAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
            orderBy: { completedAt: "desc" },
          });
          const todayStart = new Date();
          todayStart.setHours(0, 0, 0, 0);
          const todayEvents = allEvents.filter(e => e.completedAt >= todayStart);
          const currentStreak = calculateHabitStreak(allEvents, habit.targetCount);
          return c.json({
            habitId,
            date: dateKey,
            todayCount: todayEvents.length,
            completedToday: todayEvents.length >= habit.targetCount,
            currentStreak,
            bestStreak: habit.bestStreak,
            alreadyRecorded: true,
          });
        }
      }

      await db.habitEvent.create({
        data: {
          habitId,
          completedAt: targetDate,
          mood: mood ?? null,
          note: note ?? null,
          clientEventId: clientEventId ?? null,
        },
      });
    } else if (action === "undo") {
      // Remove one completion event for the target date (or by clientEventId)
      const toDelete = clientEventId
        ? await db.habitEvent.findFirst({ where: { habitId, clientEventId } })
        : await db.habitEvent.findFirst({
            where: {
              habitId,
              completedAt: {
                gte: new Date(dateKey + "T00:00:00"),
                lte: new Date(dateKey + "T23:59:59"),
              },
            },
            orderBy: { completedAt: "desc" },
          });

      if (toDelete) {
        await db.habitEvent.delete({ where: { id: toDelete.id } });
      }
    }
    // action === "skip": no-op for now, just return current state

    // Recompute streaks from the last 90 days
    const allEvents = await db.habitEvent.findMany({
      where: { habitId, completedAt: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) } },
      orderBy: { completedAt: "desc" },
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEvents = allEvents.filter(e => e.completedAt >= todayStart);
    const currentStreak = calculateHabitStreak(allEvents, habit.targetCount);
    const newBestStreak = Math.max(habit.bestStreak, currentStreak);

    // Persist improved bestStreak
    if (newBestStreak > habit.bestStreak) {
      await db.habit.update({ where: { id: habitId }, data: { bestStreak: newBestStreak } });
    }

    return c.json({
      habitId,
      date: dateKey,
      todayCount: todayEvents.length,
      completedToday: todayEvents.length >= habit.targetCount,
      currentStreak,
      bestStreak: newBestStreak,
    });
  });

export default habitsRouter;
