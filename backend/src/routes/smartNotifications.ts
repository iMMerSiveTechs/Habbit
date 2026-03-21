import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { AppType } from "../types";
import { db } from "../db";
import { z } from "zod";
import { calculateHabitStreak } from "../utils/streakCalculator";

// =============================================================================
// MESSAGE TEMPLATES
// =============================================================================

interface MessageContext {
  habitTitle?: string;
  streakCount?: number;
  completionRate?: number;
  daysAway?: number;
  protocolTarget?: number;
  completedCount?: number;
}

interface GeneratedMessage {
  title: string;
  message: string;
}

const FALLBACK_MSG: GeneratedMessage = {
  title: "Heads up",
  message: "You have something to check on.",
};

function pickRandom(variants: GeneratedMessage[]): GeneratedMessage {
  if (variants.length === 0) return FALLBACK_MSG;
  const idx = Math.floor(Math.random() * variants.length);
  const picked = variants[idx];
  return picked !== undefined ? picked : FALLBACK_MSG;
}

function parseTimeString(timeStr: string): [number, number] {
  const parts = timeStr.split(":");
  const h = parts[0] !== undefined ? Number(parts[0]) : 0;
  const m = parts[1] !== undefined ? Number(parts[1]) : 0;
  return [h, m];
}

function generateMessage(
  type: string,
  tonePref: string,
  context: MessageContext
): GeneratedMessage {
  const tone = tonePref || "motivational";

  switch (type) {
    case "morning_nudge":
      return generateMorningNudge(tone, context);
    case "missed_habit":
      return generateMissedHabit(tone, context);
    case "streak_risk":
      return generateStreakRisk(tone, context);
    case "protocol_risk":
      return generateProtocolRisk(tone, context);
    case "evening_reflection":
      return generateEveningReflection(tone, context);
    case "encouragement":
      return generateEncouragement(tone, context);
    case "comeback":
      return generateComeback(tone, context);
    default:
      return FALLBACK_MSG;
  }
}

function generateMorningNudge(
  tone: string,
  context: MessageContext
): GeneratedMessage {
  const hasStreaks = (context.streakCount ?? 0) > 0;

  if (tone === "motivational") {
    if (hasStreaks) {
      return pickRandom([
        {
          title: "Your streaks are waiting",
          message: "Your streaks are calling! Keep the momentum going today.",
        },
        {
          title: "Rise and build",
          message: "You've got active streaks to protect. Make today count.",
        },
        {
          title: "Momentum is everything",
          message: "Don't let yesterday's effort go to waste. Show up again today.",
        },
      ]);
    }
    return pickRandom([
      {
        title: "A new day begins",
        message: "Every day is a chance to build something. Start now.",
      },
      {
        title: "Time to show up",
        message: "The best version of you starts with one small action today.",
      },
      {
        title: "Your day is waiting",
        message: "Great things start with showing up. Open your habits and begin.",
      },
    ]);
  }

  if (tone === "casual") {
    if (hasStreaks) {
      return pickRandom([
        {
          title: "Good morning",
          message: "You've got streaks running. Let's keep them alive today.",
        },
        {
          title: "Hey, streaks check",
          message: "Your habits miss you already. Quick check-in?",
        },
        {
          title: "Morning vibes",
          message: "Streaks don't build themselves. Pop in when you're ready.",
        },
      ]);
    }
    return pickRandom([
      {
        title: "Hey there",
        message: "New day, fresh start. What's first?",
      },
      {
        title: "Morning",
        message: "Your habits are waiting whenever you're ready.",
      },
      {
        title: "Rise and shine",
        message: "No pressure, but today's a good day to get things done.",
      },
    ]);
  }

  // direct
  if (hasStreaks) {
    return pickRandom([
      {
        title: "Streak reminder",
        message: "You have active streaks. Open the app to keep them going.",
      },
      {
        title: "Don't break the chain",
        message: "Your streaks need attention today. Check in now.",
      },
      {
        title: "Daily check-in",
        message: "Streaks are on the line. Time to get started.",
      },
    ]);
  }
  return pickRandom([
    {
      title: "Daily reminder",
      message: "You haven't opened the app yet. Your habits are waiting.",
    },
    {
      title: "Check in",
      message: "Start your day right. Open up and log your first habit.",
    },
    {
      title: "Time to begin",
      message: "Your habits won't complete themselves. Get started.",
    },
  ]);
}

function generateMissedHabit(
  tone: string,
  context: MessageContext
): GeneratedMessage {
  const habit = context.habitTitle || "your habit";
  const streak = context.streakCount ?? 0;
  const hasStreak = streak > 0;

  if (tone === "motivational") {
    if (hasStreak) {
      return pickRandom([
        {
          title: `${habit} is waiting`,
          message: `You've built a ${streak}-day streak on ${habit}. Don't let it slip away.`,
        },
        {
          title: "Protect your progress",
          message: `${streak} days of ${habit} and counting. Keep going.`,
        },
        {
          title: "Almost missed it",
          message: `Your ${streak}-day ${habit} streak is at risk. A quick action saves it.`,
        },
      ]);
    }
    return pickRandom([
      {
        title: `Time for ${habit}`,
        message: `You scheduled ${habit} for earlier. It's not too late to do it.`,
      },
      {
        title: "Don't skip today",
        message: `${habit} is still on your list. Knock it out now.`,
      },
      {
        title: "You planned this",
        message: `${habit} was on your schedule. Follow through and you'll thank yourself.`,
      },
    ]);
  }

  if (tone === "casual") {
    if (hasStreak) {
      return pickRandom([
        {
          title: "Quick reminder",
          message: `Hey, ${habit} is still undone. That's a ${streak}-day streak on the line.`,
        },
        {
          title: "Heads up",
          message: `Your ${streak}-day ${habit} streak needs you. Still time to save it.`,
        },
        {
          title: "Friendly nudge",
          message: `${habit} check -- you've got ${streak} days going. Don't stop now.`,
        },
      ]);
    }
    return pickRandom([
      {
        title: "Hey",
        message: `Looks like ${habit} slipped past you today. Still time to do it.`,
      },
      {
        title: "Forgot something?",
        message: `${habit} is still unchecked. Pop in and knock it out.`,
      },
      {
        title: "Quick one",
        message: `${habit} is waiting for you. No rush, but don't forget.`,
      },
    ]);
  }

  // direct
  if (hasStreak) {
    return pickRandom([
      {
        title: "Streak at risk",
        message: `${streak}-day streak at risk. Complete ${habit} before it resets.`,
      },
      {
        title: `${habit} overdue`,
        message: `You missed your ${habit} window. ${streak}-day streak needs saving.`,
      },
      {
        title: "Action needed",
        message: `${habit}: ${streak}-day streak, not yet done today. Handle it.`,
      },
    ]);
  }
  return pickRandom([
    {
      title: `${habit} missed`,
      message: `You missed ${habit} today. Complete it now or it goes unlogged.`,
    },
    {
      title: "Missed window",
      message: `${habit} is past its scheduled time. Still doable.`,
    },
    {
      title: "Overdue",
      message: `${habit} hasn't been completed today. Take care of it.`,
    },
  ]);
}

function generateStreakRisk(
  tone: string,
  context: MessageContext
): GeneratedMessage {
  const habit = context.habitTitle || "your habit";
  const streak = context.streakCount ?? 0;

  if (tone === "motivational") {
    return pickRandom([
      {
        title: "Protect your streak",
        message: `You've put in ${streak} days of work on ${habit}. Don't stop now!`,
      },
      {
        title: "So close",
        message: `${streak} days of ${habit}. The evening is slipping away -- finish strong.`,
      },
      {
        title: "Your effort matters",
        message: `${streak} consecutive days of ${habit}. That's real discipline. Keep it alive tonight.`,
      },
    ]);
  }

  if (tone === "casual") {
    return pickRandom([
      {
        title: "Evening heads up",
        message: `${streak} days on ${habit} and today isn't logged yet. Still got time.`,
      },
      {
        title: "Before bed",
        message: `Just a reminder: ${habit} is undone. That's ${streak} days you don't want to lose.`,
      },
      {
        title: "Last call",
        message: `${habit} streak check: ${streak} days strong, but not yet today. Squeeze it in?`,
      },
    ]);
  }

  // direct
  return pickRandom([
    {
      title: "Streak warning",
      message: `${streak}-day ${habit} streak breaks at midnight if you don't act now.`,
    },
    {
      title: "Final warning",
      message: `${habit}: ${streak} days on the line. Complete it before the day ends.`,
    },
    {
      title: "Urgent",
      message: `Your ${streak}-day streak on ${habit} ends tonight without action.`,
    },
  ]);
}

function generateProtocolRisk(
  tone: string,
  context: MessageContext
): GeneratedMessage {
  const habit = context.habitTitle || "your protocol";
  const daysAway = context.daysAway ?? 0;
  const target = context.protocolTarget ?? 0;
  const completed = context.completedCount ?? 0;
  const remaining = Math.max(0, target - completed);

  if (tone === "motivational") {
    return pickRandom([
      {
        title: "Protocol deadline approaching",
        message: `${daysAway} days left on ${habit}. You need ${remaining} more completions to hit your target. Push through.`,
      },
      {
        title: "Finish what you started",
        message: `Your ${habit} protocol closes in ${daysAway} days. ${remaining} to go. You've got this.`,
      },
      {
        title: "The clock is ticking",
        message: `${habit} protocol: ${completed}/${target} done, ${daysAway} days remain. Time to accelerate.`,
      },
    ]);
  }

  if (tone === "casual") {
    return pickRandom([
      {
        title: "Protocol check",
        message: `Hey, ${habit} protocol ends in ${daysAway} days. You're at ${completed}/${target}. Might want to pick up the pace.`,
      },
      {
        title: "Heads up on your protocol",
        message: `${daysAway} days left for ${habit}. Still need ${remaining} more. You can do this.`,
      },
      {
        title: "Quick update",
        message: `Your ${habit} protocol is ${completed}/${target} with ${daysAway} days to go. Stay on track.`,
      },
    ]);
  }

  // direct
  return pickRandom([
    {
      title: "Protocol at risk",
      message: `${habit}: ${completed}/${target} completions, ${daysAway} days remaining. You're behind schedule.`,
    },
    {
      title: "Protocol warning",
      message: `${remaining} completions needed in ${daysAway} days for ${habit}. Act now.`,
    },
    {
      title: "Behind on protocol",
      message: `${habit} protocol: ${daysAway} days left, ${remaining} sessions behind. Prioritize this.`,
    },
  ]);
}

function generateEveningReflection(
  tone: string,
  _context: MessageContext
): GeneratedMessage {
  if (tone === "motivational") {
    return pickRandom([
      {
        title: "Reflect on your day",
        message:
          "Take 2 minutes to reflect. Capture what went well and what you learned.",
      },
      {
        title: "End the day strong",
        message:
          "A quick reflection locks in today's lessons. Don't skip this one.",
      },
      {
        title: "Close the loop",
        message:
          "Write down your win for the day. Future you will appreciate it.",
      },
    ]);
  }

  if (tone === "casual") {
    return pickRandom([
      {
        title: "Evening check-in",
        message:
          "How'd today go? Jot down a quick reflection before you wind down.",
      },
      {
        title: "Before you sign off",
        message: "Quick reflection time. What was your win today?",
      },
      {
        title: "Wind down",
        message: "Take a sec to reflect on your day. It only takes a minute.",
      },
    ]);
  }

  // direct
  return pickRandom([
    {
      title: "Daily reflection",
      message: "You haven't done your evening reflection yet. Do it now.",
    },
    {
      title: "Reflection time",
      message: "Log your daily reflection before the day ends.",
    },
    {
      title: "Don't skip reflection",
      message: "Your evening reflection is pending. Complete it.",
    },
  ]);
}

function generateEncouragement(
  tone: string,
  context: MessageContext
): GeneratedMessage {
  const rate = context.completionRate ?? 0;
  const pct = Math.round(rate * 100);

  if (tone === "motivational") {
    return pickRandom([
      {
        title: "Incredible day",
        message: `${pct}% of your habits done today. That's the kind of consistency that changes lives.`,
      },
      {
        title: "You showed up",
        message: `${pct}% completion today. This is what discipline looks like. Be proud.`,
      },
      {
        title: "On fire",
        message: `${pct}% done. Days like this compound into something extraordinary.`,
      },
    ]);
  }

  if (tone === "casual") {
    return pickRandom([
      {
        title: "Nice work",
        message: `${pct}% of your habits knocked out today. Solid.`,
      },
      {
        title: "Crushing it",
        message: `${pct}% done today. That's a great day by any measure.`,
      },
      {
        title: "Look at you go",
        message: `${pct}% completion rate today. Keep riding this wave.`,
      },
    ]);
  }

  // direct
  return pickRandom([
    {
      title: "Strong performance",
      message: `${pct}% habit completion today. Well done.`,
    },
    {
      title: "Daily summary",
      message: `${pct}% of habits completed. Above average. Keep it up.`,
    },
    {
      title: "Good day",
      message: `${pct}% completion. You hit your targets today.`,
    },
  ]);
}

function generateComeback(
  tone: string,
  _context: MessageContext
): GeneratedMessage {
  if (tone === "motivational") {
    return pickRandom([
      {
        title: "We miss you",
        message:
          "It's been a while. The best time to restart is right now. One habit, one step.",
      },
      {
        title: "Come back stronger",
        message:
          "Breaks happen. What matters is coming back. Your habits are still here for you.",
      },
      {
        title: "Pick up where you left off",
        message:
          "Every champion has off days. Today can be your comeback. Start with just one thing.",
      },
    ]);
  }

  if (tone === "casual") {
    return pickRandom([
      {
        title: "Long time no see",
        message:
          "Hey, it's been a couple days. No judgment. Just pop in when you're ready.",
      },
      {
        title: "Missing you",
        message:
          "Your habits are getting dusty. Come back and knock one out, even a small one.",
      },
      {
        title: "Hey stranger",
        message:
          "It's been a bit. No pressure, but your habits are still waiting for you.",
      },
    ]);
  }

  // direct
  return pickRandom([
    {
      title: "Inactive for 2+ days",
      message:
        "You haven't opened the app in over 48 hours. Get back on track today.",
    },
    {
      title: "Time to return",
      message:
        "Extended break detected. Restart now before habits slip further.",
    },
    {
      title: "Come back",
      message: "Your habit streaks have reset. Open the app and rebuild.",
    },
  ]);
}

// =============================================================================
// QUIET HOURS HELPER
// =============================================================================

function isInQuietHours(quietStart: string, quietEnd: string): boolean {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [startH, startM] = parseTimeString(quietStart);
  const [endH, endM] = parseTimeString(quietEnd);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  if (startMinutes <= endMinutes) {
    // Same-day range (e.g., 09:00 to 17:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }
  // Overnight range (e.g., 22:00 to 07:00)
  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}

// =============================================================================
// HELPER: get today midnight
// =============================================================================

function getTodayMidnight(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// =============================================================================
// HELPER: check if a date is today
// =============================================================================

function isToday(date: Date): boolean {
  const today = getTodayMidnight();
  const check = new Date(date);
  check.setHours(0, 0, 0, 0);
  return check.getTime() === today.getTime();
}

// =============================================================================
// HELPER: parse JSON safely
// =============================================================================

function safeParseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

// =============================================================================
// SCHEMAS
// =============================================================================

const logEventSchema = z.object({
  eventType: z.string(),
  metadata: z.string().optional(),
});

const updatePreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  maxPerDay: z.number().int().min(0).max(50).optional(),
  quietHoursStart: z.string().optional(),
  quietHoursEnd: z.string().optional(),
  enabledTypes: z.array(z.string()).optional(),
  tonePref: z.string().optional(),
});

// =============================================================================
// ROUTER
// =============================================================================

const smartNotificationsRouter = new Hono<AppType>()

  // ===========================================================================
  // 1. POST /log-event
  // ===========================================================================
  .post("/log-event", zValidator("json", logEventSchema), async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) return c.json({ error: "Profile not found" }, 404);

    const { eventType, metadata } = c.req.valid("json");

    const logEntry = await db.userEngagementLog.create({
      data: {
        profileId: profile.id,
        eventType,
        metadata: metadata ?? null,
      },
    });

    // If it's an app_open event, update engagement pattern
    if (eventType === "app_open") {
      const now = new Date();
      const existing = await db.engagementPattern.findUnique({
        where: { profileId: profile.id },
      });

      if (existing) {
        const lastOpenIsToday =
          existing.lastAppOpen != null && isToday(existing.lastAppOpen);
        await db.engagementPattern.update({
          where: { profileId: profile.id },
          data: {
            lastAppOpen: now,
            appOpensToday: lastOpenIsToday ? existing.appOpensToday + 1 : 1,
          },
        });
      } else {
        await db.engagementPattern.create({
          data: {
            profileId: profile.id,
            lastAppOpen: now,
            appOpensToday: 1,
            totalDataPoints: 0,
            confidenceScore: 0,
          },
        });
      }
    }

    return c.json({
      logEntry: {
        ...logEntry,
        timestamp: logEntry.timestamp.toISOString(),
      },
    });
  })

  // ===========================================================================
  // 2. POST /evaluate -- THE CORE BRAIN
  // ===========================================================================
  .post("/evaluate", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) return c.json({ error: "Profile not found" }, 404);

    const now = new Date();
    const today = getTodayMidnight();
    const currentHour = now.getHours() + now.getMinutes() / 60;

    // ---- Load all data in parallel ----
    const [
      engagementPattern,
      notifPrefs,
      habits,
      todayNotifications,
      _todayIntention,
      reflectionCount,
      todayReflection,
    ] = await Promise.all([
      db.engagementPattern.findUnique({ where: { profileId: profile.id } }),
      db.notificationPreference.findUnique({
        where: { profileId: profile.id },
      }),
      db.habit.findMany({
        where: { profileId: profile.id, archived: false },
        include: {
          events: true,
        },
      }),
      db.smartNotificationLog.findMany({
        where: {
          profileId: profile.id,
          createdAt: { gte: today },
        },
      }),
      db.dailyIntention.findFirst({
        where: {
          profileId: profile.id,
          date: { gte: today },
        },
      }),
      db.dailyReflection.count({
        where: { profileId: profile.id },
      }),
      db.dailyReflection.findFirst({
        where: {
          profileId: profile.id,
          date: { gte: today },
        },
      }),
    ]);

    // ---- Respect preferences ----
    const prefs = notifPrefs || {
      enabled: true,
      maxPerDay: 5,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      enabledTypes:
        '["morning_nudge","missed_habit","streak_risk","protocol_risk","evening_reflection","encouragement","comeback"]',
      tonePref: "motivational",
    };

    if (!prefs.enabled) {
      return c.json({ notifications: [] });
    }

    const enabledTypes: string[] = safeParseJson(prefs.enabledTypes, [
      "morning_nudge",
      "missed_habit",
      "streak_risk",
      "protocol_risk",
      "evening_reflection",
      "encouragement",
      "comeback",
    ]);
    const tonePref = prefs.tonePref || "motivational";
    const todaySentCount = todayNotifications.length;

    if (todaySentCount >= prefs.maxPerDay) {
      return c.json({ notifications: [] });
    }

    // Helper: check if notification of type (optionally for habitId) was already sent today
    function alreadySentToday(type: string, habitId?: string): boolean {
      return todayNotifications.some(
        (n) =>
          n.notificationType === type &&
          (habitId == null || n.habitId === habitId)
      );
    }

    // Separate today's events for each habit
    const habitsWithTodayInfo = habits.map((habit) => {
      const todayEvents = habit.events.filter((e) => isToday(e.completedAt));
      const completedToday = todayEvents.length >= habit.targetCount;
      const streak = calculateHabitStreak(
        habit.events.map((e) => ({ completedAt: new Date(e.completedAt) })),
        habit.targetCount
      );
      return { ...habit, todayEvents, completedToday, streak };
    });

    const notifications: Array<{
      type: string;
      title: string;
      message: string;
      scheduledFor: string;
      habitId?: string;
    }> = [];

    // ---- Rule A: Morning Nudge ----
    if (enabledTypes.includes("morning_nudge")) {
      const avgFirstOpen = engagementPattern?.avgFirstOpenHour ?? 8.5;
      const threshold = avgFirstOpen + 0.5;
      const appOpenedToday =
        engagementPattern != null &&
        engagementPattern.lastAppOpen != null &&
        isToday(engagementPattern.lastAppOpen) &&
        engagementPattern.appOpensToday > 0;
      const anyHabitDoneToday = habitsWithTodayInfo.some(
        (h) => h.completedToday
      );

      if (
        currentHour >= threshold &&
        !anyHabitDoneToday &&
        !appOpenedToday &&
        !alreadySentToday("morning_nudge")
      ) {
        const maxStreak = Math.max(
          0,
          ...habitsWithTodayInfo.map((h) => h.streak)
        );
        const msg = generateMessage("morning_nudge", tonePref, {
          streakCount: maxStreak,
        });
        notifications.push({
          type: "morning_nudge",
          title: msg.title,
          message: msg.message,
          scheduledFor: now.toISOString(),
        });
      }
    }

    // ---- Rule B: Missed Habit Reminders ----
    if (enabledTypes.includes("missed_habit")) {
      for (const habit of habitsWithTodayInfo) {
        if (!habit.reminderEnabled || !habit.reminderTime) continue;
        if (habit.completedToday) continue;
        if (alreadySentToday("missed_habit", habit.id)) continue;

        const [rh, rm] = parseTimeString(habit.reminderTime);
        const reminderHour = rh + rm / 60;
        const graceMinutes = 30;
        const reminderWithGrace = reminderHour + graceMinutes / 60;

        if (currentHour > reminderWithGrace) {
          const msg = generateMessage("missed_habit", tonePref, {
            habitTitle: habit.title,
            streakCount: habit.streak,
          });
          notifications.push({
            type: "missed_habit",
            title: msg.title,
            message: msg.message,
            scheduledFor: now.toISOString(),
            habitId: habit.id,
          });
        }
      }
    }

    // ---- Rule C: Streak Protection ----
    if (enabledTypes.includes("streak_risk")) {
      for (const habit of habitsWithTodayInfo) {
        if (habit.completedToday) continue;
        if (habit.streak < 3) continue;
        if (currentHour < 17) continue;
        if (alreadySentToday("streak_risk", habit.id)) continue;

        const msg = generateMessage("streak_risk", tonePref, {
          habitTitle: habit.title,
          streakCount: habit.streak,
        });
        notifications.push({
          type: "streak_risk",
          title: msg.title,
          message: msg.message,
          scheduledFor: now.toISOString(),
          habitId: habit.id,
        });
      }
    }

    // ---- Rule D: Protocol Risk ----
    if (enabledTypes.includes("protocol_risk")) {
      for (const habit of habitsWithTodayInfo) {
        if (habit.protocolStatus !== "active") continue;
        if (
          !habit.protocolStartDate ||
          !habit.protocolWindowDays ||
          !habit.protocolTarget
        )
          continue;

        const startDate = new Date(habit.protocolStartDate);
        startDate.setHours(0, 0, 0, 0);
        const daysSinceStart = Math.floor(
          (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysRemaining = habit.protocolWindowDays - daysSinceStart;

        if (daysRemaining <= 2) {
          // Count completions since protocol start
          const completionsInWindow = habit.events.filter((e) => {
            const eventDate = new Date(e.completedAt);
            return eventDate >= startDate;
          }).length;

          if (completionsInWindow < habit.protocolTarget) {
            if (!alreadySentToday("protocol_risk", habit.id)) {
              const msg = generateMessage("protocol_risk", tonePref, {
                habitTitle: habit.title,
                daysAway: Math.max(0, daysRemaining),
                protocolTarget: habit.protocolTarget,
                completedCount: completionsInWindow,
              });
              notifications.push({
                type: "protocol_risk",
                title: msg.title,
                message: msg.message,
                scheduledFor: now.toISOString(),
                habitId: habit.id,
              });
            }
          }
        }
      }
    }

    // ---- Rule E: Evening Reflection ----
    if (enabledTypes.includes("evening_reflection")) {
      if (
        currentHour >= 19 &&
        !todayReflection &&
        reflectionCount > 0 &&
        !alreadySentToday("evening_reflection")
      ) {
        const msg = generateMessage("evening_reflection", tonePref, {});
        notifications.push({
          type: "evening_reflection",
          title: msg.title,
          message: msg.message,
          scheduledFor: now.toISOString(),
        });
      }
    }

    // ---- Rule F: Encouragement ----
    if (enabledTypes.includes("encouragement")) {
      const totalActive = habitsWithTodayInfo.length;
      const completedCount = habitsWithTodayInfo.filter(
        (h) => h.completedToday
      ).length;
      const completionRate =
        totalActive > 0 ? completedCount / totalActive : 0;

      if (
        completionRate >= 0.8 &&
        totalActive >= 3 &&
        !alreadySentToday("encouragement")
      ) {
        const msg = generateMessage("encouragement", tonePref, {
          completionRate,
        });
        notifications.push({
          type: "encouragement",
          title: msg.title,
          message: msg.message,
          scheduledFor: now.toISOString(),
        });
      }
    }

    // ---- Rule G: Comeback ----
    if (enabledTypes.includes("comeback")) {
      if (engagementPattern?.lastAppOpen && !alreadySentToday("comeback")) {
        const hoursSinceLastOpen =
          (now.getTime() -
            new Date(engagementPattern.lastAppOpen).getTime()) /
          (1000 * 60 * 60);
        if (hoursSinceLastOpen > 48) {
          const msg = generateMessage("comeback", tonePref, {});
          notifications.push({
            type: "comeback",
            title: msg.title,
            message: msg.message,
            scheduledFor: now.toISOString(),
          });
        }
      }
    }

    // ---- Trim to maxPerDay ----
    const budget = prefs.maxPerDay - todaySentCount;
    const trimmed = notifications.slice(0, Math.max(0, budget));

    // ---- Filter quiet hours ----
    const filtered = trimmed.filter(() => {
      return !isInQuietHours(prefs.quietHoursStart, prefs.quietHoursEnd);
    });

    // ---- Persist to smartNotificationLog ----
    const persisted: Array<{
      type: string;
      title: string;
      message: string;
      scheduledFor: string;
      habitId?: string;
      id: string;
    }> = [];

    for (const notif of filtered) {
      const created = await db.smartNotificationLog.create({
        data: {
          profileId: profile.id,
          notificationType: notif.type,
          habitId: notif.habitId ?? null,
          title: notif.title,
          message: notif.message,
          scheduledFor: new Date(notif.scheduledFor),
        },
      });
      persisted.push({
        id: created.id,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        scheduledFor: created.scheduledFor.toISOString(),
        habitId: notif.habitId,
      });
    }

    return c.json({ notifications: persisted });
  })

  // ===========================================================================
  // 3. GET /preferences
  // ===========================================================================
  .get("/preferences", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) return c.json({ error: "Profile not found" }, 404);

    let prefs = await db.notificationPreference.findUnique({
      where: { profileId: profile.id },
    });

    if (!prefs) {
      prefs = await db.notificationPreference.create({
        data: {
          profileId: profile.id,
        },
      });
    }

    return c.json({
      preferences: {
        ...prefs,
        enabledTypes: safeParseJson<string[]>(prefs.enabledTypes, []),
        createdAt: prefs.createdAt.toISOString(),
        updatedAt: prefs.updatedAt.toISOString(),
      },
    });
  })

  // ===========================================================================
  // 4. PUT /preferences
  // ===========================================================================
  .put(
    "/preferences",
    zValidator("json", updatePreferencesSchema),
    async (c) => {
      const user = c.get("user");
      if (!user) return c.json({ error: "Unauthorized" }, 401);

      const profile = await db.profile.findUnique({
        where: { userId: user.id },
      });
      if (!profile) return c.json({ error: "Profile not found" }, 404);

      const data = c.req.valid("json");

      // Ensure the preference record exists
      const existing = await db.notificationPreference.findUnique({
        where: { profileId: profile.id },
      });

      const updateData: Record<string, unknown> = {};
      if (data.enabled !== undefined) updateData.enabled = data.enabled;
      if (data.maxPerDay !== undefined) updateData.maxPerDay = data.maxPerDay;
      if (data.quietHoursStart !== undefined)
        updateData.quietHoursStart = data.quietHoursStart;
      if (data.quietHoursEnd !== undefined)
        updateData.quietHoursEnd = data.quietHoursEnd;
      if (data.enabledTypes !== undefined)
        updateData.enabledTypes = JSON.stringify(data.enabledTypes);
      if (data.tonePref !== undefined) updateData.tonePref = data.tonePref;

      let prefs;
      if (existing) {
        prefs = await db.notificationPreference.update({
          where: { profileId: profile.id },
          data: updateData,
        });
      } else {
        prefs = await db.notificationPreference.create({
          data: {
            profileId: profile.id,
            ...updateData,
          },
        });
      }

      return c.json({
        preferences: {
          ...prefs,
          enabledTypes: safeParseJson<string[]>(prefs.enabledTypes, []),
          createdAt: prefs.createdAt.toISOString(),
          updatedAt: prefs.updatedAt.toISOString(),
        },
      });
    }
  )

  // ===========================================================================
  // 5. POST /compute-patterns
  // ===========================================================================
  .post("/compute-patterns", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) return c.json({ error: "Profile not found" }, 404);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const logs = await db.userEngagementLog.findMany({
      where: {
        profileId: profile.id,
        timestamp: { gte: thirtyDaysAgo },
      },
      orderBy: { timestamp: "asc" },
    });

    // ---- Compute peak hours from app_open events ----
    const appOpenLogs = logs.filter((l) => l.eventType === "app_open");
    const hourFreq: Record<number, number> = {};
    for (const log of appOpenLogs) {
      const h = new Date(log.timestamp).getHours();
      hourFreq[h] = (hourFreq[h] || 0) + 1;
    }
    const peakHours = Object.entries(hourFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([h]) => parseInt(h));

    // ---- Compute peak days from app_open events ----
    const dayFreq: Record<number, number> = {};
    for (const log of appOpenLogs) {
      const d = new Date(log.timestamp).getDay();
      dayFreq[d] = (dayFreq[d] || 0) + 1;
    }
    const peakDays = Object.entries(dayFreq)
      .sort(([, a], [, b]) => b - a)
      .map(([d]) => parseInt(d));

    // ---- Compute avgFirstOpenHour and avgLastOpenHour ----
    // Group app_open logs by date string, find min/max hour per day
    const opensByDay: Record<string, number[]> = {};
    for (const log of appOpenLogs) {
      const ts = new Date(log.timestamp);
      const dateKey = `${ts.getFullYear()}-${String(ts.getMonth() + 1).padStart(2, "0")}-${String(ts.getDate()).padStart(2, "0")}`;
      const hourDecimal = ts.getHours() + ts.getMinutes() / 60;
      if (!opensByDay[dateKey]) opensByDay[dateKey] = [];
      opensByDay[dateKey]!.push(hourDecimal);
    }

    const dayKeys = Object.keys(opensByDay);
    let avgFirstOpenHour: number | null = null;
    let avgLastOpenHour: number | null = null;

    if (dayKeys.length > 0) {
      let firstSum = 0;
      let lastSum = 0;
      for (const key of dayKeys) {
        const hours = opensByDay[key] ?? [];
        firstSum += Math.min(...hours);
        lastSum += Math.max(...hours);
      }
      avgFirstOpenHour =
        Math.round((firstSum / dayKeys.length) * 100) / 100;
      avgLastOpenHour =
        Math.round((lastSum / dayKeys.length) * 100) / 100;
    }

    // ---- Compute avgCompletionHours from habit_complete events ----
    const habitCompleteLogs = logs.filter(
      (l) => l.eventType === "habit_complete"
    );
    const completionHoursByHabit: Record<string, number[]> = {};
    for (const log of habitCompleteLogs) {
      if (!log.metadata) continue;
      let habitId: string | null = null;
      try {
        const meta = JSON.parse(log.metadata);
        habitId = meta.habitId || null;
      } catch {
        continue;
      }
      if (!habitId) continue;

      const ts = new Date(log.timestamp);
      const hourDecimal = ts.getHours() + ts.getMinutes() / 60;
      if (!completionHoursByHabit[habitId])
        completionHoursByHabit[habitId] = [];
      completionHoursByHabit[habitId]!.push(hourDecimal);
    }

    const avgCompletionHours: Record<string, number> = {};
    for (const [habitId, hours] of Object.entries(completionHoursByHabit)) {
      const sum = hours.reduce((a, b) => a + b, 0);
      avgCompletionHours[habitId] =
        Math.round((sum / hours.length) * 100) / 100;
    }

    // ---- Confidence score ----
    const totalDataPoints = logs.length;
    const confidenceScore = Math.min(1.0, totalDataPoints / 50);

    // ---- Upsert ----
    const pattern = await db.engagementPattern.upsert({
      where: { profileId: profile.id },
      create: {
        profileId: profile.id,
        peakHours: JSON.stringify(peakHours),
        peakDays: JSON.stringify(peakDays),
        avgFirstOpenHour,
        avgLastOpenHour,
        avgCompletionHours: JSON.stringify(avgCompletionHours),
        totalDataPoints,
        confidenceScore,
      },
      update: {
        peakHours: JSON.stringify(peakHours),
        peakDays: JSON.stringify(peakDays),
        avgFirstOpenHour,
        avgLastOpenHour,
        avgCompletionHours: JSON.stringify(avgCompletionHours),
        totalDataPoints,
        confidenceScore,
      },
    });

    return c.json({
      pattern: {
        ...pattern,
        peakHours: safeParseJson<number[]>(pattern.peakHours, []),
        peakDays: safeParseJson<number[]>(pattern.peakDays, []),
        avgCompletionHours: safeParseJson<Record<string, number>>(
          pattern.avgCompletionHours,
          {}
        ),
        lastAppOpen: pattern.lastAppOpen?.toISOString() ?? null,
        createdAt: pattern.createdAt.toISOString(),
        updatedAt: pattern.updatedAt.toISOString(),
      },
    });
  })

  // ===========================================================================
  // 6. GET /stats
  // ===========================================================================
  .get("/stats", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) return c.json({ error: "Profile not found" }, 404);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const allLogs = await db.smartNotificationLog.findMany({
      where: {
        profileId: profile.id,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const totalSent = allLogs.length;
    const opened = allLogs.filter((l) => l.openedAt != null).length;
    const actedOn = allLogs.filter((l) => l.actedOn).length;

    const openRate = totalSent > 0 ? opened / totalSent : 0;
    const actionRate = totalSent > 0 ? actedOn / totalSent : 0;

    // Breakdown by type
    const byType: Record<
      string,
      { total: number; opened: number; actedOn: number }
    > = {};
    for (const log of allLogs) {
      const entry = byType[log.notificationType];
      if (!entry) {
        byType[log.notificationType] = { total: 0, opened: 0, actedOn: 0 };
      }
      const bucket = byType[log.notificationType]!;
      bucket.total++;
      if (log.openedAt != null) bucket.opened++;
      if (log.actedOn) bucket.actedOn++;
    }

    const breakdown = Object.entries(byType).map(([type, stats]) => ({
      type,
      total: stats.total,
      opened: stats.opened,
      actedOn: stats.actedOn,
      openRate: stats.total > 0 ? stats.opened / stats.total : 0,
      actionRate: stats.total > 0 ? stats.actedOn / stats.total : 0,
    }));

    return c.json({
      stats: {
        totalSent,
        opened,
        actedOn,
        openRate: Math.round(openRate * 10000) / 10000,
        actionRate: Math.round(actionRate * 10000) / 10000,
        breakdown,
        periodDays: 30,
      },
    });
  });

export default smartNotificationsRouter;
