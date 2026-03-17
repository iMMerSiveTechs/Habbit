import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import type { AppType } from "../index";
import { cerebraQueryRequestSchema } from "../../../shared/contracts";

const cerebraRouter = new Hono<AppType>()
  // Query Cerebra AI assistant
  .post("/query", zValidator("json", cerebraQueryRequestSchema), async (c) => {
    const user = c.get("user");
    const data = c.req.valid("json");

    // Allow unauthenticated access with demo response
    if (!user) {
      return c.json({
        response: "I'm analyzing your patterns to provide personalized insights. Start building habits to unlock AI-powered recommendations tailored to your rhythm!",
        suggestion: "Try completing your first habit today",
        actionable: true,
      });
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    // Check subscription tier
    if (profile.subscriptionTier !== "elite" && profile.subscriptionTier !== "pro") {
      return c.json({
        response: "Cerebra AI assistant is available with Pro or Elite subscription. Upgrade to unlock personalized insights and predictive intelligence!",
        suggestion: "Upgrade to Pro for AI-powered coaching",
        actionable: false,
      });
    }

    // Get context data
    const habits = await db.habit.findMany({
      where: { profileId: profile.id, archived: false },
      include: {
        events: {
          where: {
            completedAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
            },
          },
          orderBy: { completedAt: "desc" },
        },
      },
      take: 10,
    });

    const focusSessions = await db.focusSession.findMany({
      where: {
        profileId: profile.id,
        startTime: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
      orderBy: { startTime: "desc" },
      take: 20,
    });

    // Build context for AI
    const context = {
      habitCount: habits.length,
      totalCompletions: habits.reduce((sum, h) => sum + h.events.length, 0),
      avgCompletionRate: habits.length > 0
        ? habits.reduce((sum, h) => sum + (h.events.length / 7), 0) / habits.length
        : 0,
      focusSessionCount: focusSessions.length,
      totalFocusTime: focusSessions.reduce((sum, s) => sum + (s.duration || 0), 0),
      completedSessions: focusSessions.filter(s => s.completed).length,
    };

    // Generate AI response
    const response = generateCerebraResponse(data.query, context, habits, focusSessions);

    return c.json({
      response: response.message,
      suggestion: response.suggestion,
      actionable: response.actionable,
    });
  })

  // Get daily briefing with personalized focus blocks
  .get("/briefing", async (c) => {
    const user = c.get("user");

    // Allow unauthenticated access with demo data
    if (!user) {
      return c.json({
        briefing: {
          date: new Date().toISOString(),
          habitsTotal: 3,
          habitsCompleted: 1,
          habitsRemaining: 2,
          focusBlocks: [
            { time: "9:00 AM - 11:00 AM", task: "Deep Work", color: "#00D4FF", suggested: true },
            { time: "1:00 PM - 2:00 PM", task: "Quick Tasks", color: "#FF00E5", suggested: false },
          ],
          suggestion: "Sign in to get a personalized daily rhythm based on your habits.",
        },
      });
    }

    const profile = await db.profile.findUnique({ where: { userId: user.id } });
    if (!profile) return c.json({ error: "Profile not found" }, 404);

    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const now = new Date();
    const currentHour = now.getHours() + now.getMinutes() / 60;

    // Load user data in parallel
    const [habits, engagementPattern, recentSessions] = await Promise.all([
      db.habit.findMany({
        where: { profileId: profile.id, archived: false },
        include: { events: true },
      }),
      db.engagementPattern.findUnique({ where: { profileId: profile.id } }),
      db.focusSession.findMany({
        where: {
          profileId: profile.id,
          startTime: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
          completed: true,
        },
        orderBy: { startTime: "desc" },
        take: 50,
      }),
    ]);

    // Split today's completions
    const habitsWithToday = habits.map((h) => {
      const todayCount = h.events.filter((e) => new Date(e.completedAt) >= todayMidnight).length;
      return { ...h, todayCount, done: todayCount >= h.targetCount };
    });
    const incomplete = habitsWithToday.filter((h) => !h.done);
    const completedCount = habitsWithToday.filter((h) => h.done).length;

    // Parse avg completion hours per habit from engagement pattern
    let avgCompletionHours: Record<string, number> = {};
    if (engagementPattern?.avgCompletionHours) {
      try { avgCompletionHours = JSON.parse(engagementPattern.avgCompletionHours); } catch { /* ignore */ }
    }

    const userWakeHour = engagementPattern?.avgFirstOpenHour ?? 9;
    const userWindHour = engagementPattern?.avgLastOpenHour ?? 22;

    // --- Build personalized focus blocks from incomplete habits ---
    const COLORS = ["#00D4FF", "#FF00E5", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444"];
    const focusBlocks: Array<{ time: string; task: string; color: string; suggested: boolean; habitId?: string }> = [];

    // Calculate best time for each incomplete habit
    const habitTimes: Array<{ hour: number; id: string; title: string }> = [];
    for (const h of incomplete) {
      // 1st: known avg completion hour from engagement data
      const avgH = avgCompletionHours[h.id];
      if (avgH !== undefined) { habitTimes.push({ hour: avgH, id: h.id, title: h.title }); continue; }

      // 2nd: habit's configured reminder time
      if (h.reminderTime) {
        const parts = h.reminderTime.split(":");
        const rh = Number(parts[0] ?? 9);
        const rm = Number(parts[1] ?? 0);
        habitTimes.push({ hour: rh + rm / 60, id: h.id, title: h.title });
        continue;
      }

      // 3rd: average of historical event times for this habit
      const eventHours = h.events.map((e) => {
        const d = new Date(e.completedAt);
        return d.getHours() + d.getMinutes() / 60;
      });
      if (eventHours.length > 0) {
        const avg = eventHours.reduce((a, b) => a + b, 0) / eventHours.length;
        habitTimes.push({ hour: avg, id: h.id, title: h.title });
      }
    }

    // Sort by hour
    habitTimes.sort((a, b) => a.hour - b.hour);

    // Group nearby habits into focus blocks
    const used = new Set<string>();
    let suggestedSet = false;
    for (let i = 0; i < habitTimes.length; i++) {
      const item = habitTimes[i];
      if (!item || used.has(item.id)) continue;
      used.add(item.id);

      const titles = [item.title];
      for (let j = i + 1; j < habitTimes.length; j++) {
        const next = habitTimes[j];
        if (!next || used.has(next.id)) continue;
        if (Math.abs(next.hour - item.hour) <= 1.5) {
          titles.push(next.title);
          used.add(next.id);
          if (titles.length >= 3) break;
        }
      }

      const startH = Math.max(0, Math.floor(item.hour));
      const endH = Math.min(24, startH + (titles.length > 1 ? 2 : 1));
      const label = titles.length === 1
        ? titles[0]!
        : titles.slice(0, 2).join(" + ") + (titles.length > 2 ? ` +${titles.length - 2}` : "");

      const isSuggested = !suggestedSet && startH >= Math.floor(currentHour);
      if (isSuggested) suggestedSet = true;

      focusBlocks.push({
        time: `${briefingFormatHour(startH)} - ${briefingFormatHour(endH)}`,
        task: label,
        color: COLORS[focusBlocks.length % COLORS.length] ?? "#00D4FF",
        suggested: isSuggested,
        habitId: item.id,
      });
      if (focusBlocks.length >= 5) break;
    }

    // If no habit-based blocks, use peak hours or focus session history
    if (focusBlocks.length === 0) {
      let peakHours: number[] = [];
      if (engagementPattern?.peakHours) {
        try { peakHours = JSON.parse(engagementPattern.peakHours); } catch { /* ignore */ }
      }

      // Build from session start times
      const sessionHourFreq: Record<number, number> = {};
      for (const s of recentSessions) {
        const h = new Date(s.startTime).getHours();
        sessionHourFreq[h] = (sessionHourFreq[h] ?? 0) + 1;
      }
      for (const h of peakHours.slice(0, 3)) {
        sessionHourFreq[h] = (sessionHourFreq[h] ?? 0) + 2; // boost peak hours
      }

      const topHours = Object.entries(sessionHourFreq)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([h]) => parseInt(h))
        .sort((a, b) => a - b);

      if (topHours.length > 0) {
        const labels = ["Deep Work", "Habit Focus", "Review & Reflect"];
        for (let i = 0; i < topHours.length && focusBlocks.length < 3; i++) {
          const h = topHours[i]!;
          const isSugg = !suggestedSet && h >= Math.floor(currentHour);
          if (isSugg) suggestedSet = true;
          focusBlocks.push({
            time: `${briefingFormatHour(h)} - ${briefingFormatHour(h + 2)}`,
            task: labels[i] ?? "Focus Time",
            color: COLORS[i] ?? "#00D4FF",
            suggested: isSugg,
          });
        }
      } else {
        // Absolute fallback using wake/wind times
        const wake = Math.round(userWakeHour);
        const wind = Math.round(userWindHour);
        const mid = Math.round((wake + wind) / 2);
        focusBlocks.push(
          { time: `${briefingFormatHour(wake + 1)} - ${briefingFormatHour(wake + 3)}`, task: "Deep Work", color: "#00D4FF", suggested: currentHour < wake + 3 },
          { time: `${briefingFormatHour(mid)} - ${briefingFormatHour(mid + 1)}`, task: "Habit Check-in", color: "#10B981", suggested: currentHour >= wake + 3 && currentHour < mid + 1 },
          { time: `${briefingFormatHour(wind - 2)} - ${briefingFormatHour(wind - 1)}`, task: "Review & Reflect", color: "#8B5CF6", suggested: currentHour >= mid + 1 },
        );
      }
    }

    // Dynamic suggestion
    let suggestion: string;
    if (incomplete.length === 0 && habitsWithToday.length > 0) {
      suggestion = "All habits completed today. Strong work.";
    } else if (incomplete.length > 0) {
      const nextBlock = focusBlocks.find((b) => b.suggested);
      const nextHint = nextBlock ? ` Next up: ${nextBlock.task}.` : "";
      suggestion = `${incomplete.length} habit${incomplete.length > 1 ? "s" : ""} remaining today.${nextHint}`;
    } else {
      suggestion = "Add some habits to get a personalized daily rhythm.";
    }

    return c.json({
      briefing: {
        date: now.toISOString(),
        habitsTotal: habitsWithToday.length,
        habitsCompleted: completedCount,
        habitsRemaining: incomplete.length,
        focusBlocks,
        suggestion,
      },
    });
  });

// Format hour number to readable time string e.g. 9 -> "9:00 AM", 14 -> "2:00 PM"
function briefingFormatHour(h: number): string {
  const clamped = Math.max(0, Math.min(24, Math.round(h)));
  if (clamped === 0 || clamped === 24) return "12:00 AM";
  if (clamped === 12) return "12:00 PM";
  if (clamped < 12) return `${clamped}:00 AM`;
  return `${clamped - 12}:00 PM`;
}

// Simple AI response generator (can be enhanced with OpenAI later)
function generateCerebraResponse(
  query: string,
  context: any,
  habits: any[],
  sessions: any[]
) {
  const lowerQuery = query.toLowerCase();

  // Check for common queries
  if (lowerQuery.includes("energy") || lowerQuery.includes("productive")) {
    return {
      message: `Based on your recent focus sessions, you're most productive between 8-10 AM, with an average of ${Math.round(context.totalFocusTime / context.focusSessionCount / 60)} minutes per session. I recommend scheduling deep work during this window.`,
      suggestion: "Schedule your most important task for 8 AM tomorrow",
      actionable: true,
    };
  }

  if (lowerQuery.includes("habit") || lowerQuery.includes("progress")) {
    const rate = Math.round(context.avgCompletionRate * 100);
    return {
      message: `You've completed ${context.totalCompletions} habits this week with a ${rate}% completion rate. ${rate >= 80 ? "Excellent consistency!" : "Let's work on building more consistent patterns."}`,
      suggestion: rate < 80 ? "Try focusing on just 3 core habits this week" : undefined,
      actionable: rate < 80,
    };
  }

  if (lowerQuery.includes("break") || lowerQuery.includes("rest")) {
    return {
      message: "Based on your typical energy patterns, you tend to experience a dip around 3 PM. A 15-minute walking break can help restore focus for your afternoon sessions.",
      suggestion: "Schedule a 15-minute break at 3 PM",
      actionable: true,
    };
  }

  // Default response
  return {
    message: "I'm analyzing your patterns to provide personalized insights. You've been consistently working on your habits, which is great! Keep up the rhythm.",
    suggestion: undefined,
    actionable: false,
  };
}

export default cerebraRouter;
