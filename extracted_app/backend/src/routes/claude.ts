import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import type { AppType } from "../types";
import {
  claudeChatRequestSchema,
  type ClaudeChatMessage,
} from "../../../shared/contracts";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-20250514";

function getAnthropicKey(): string | null {
  const key = process.env.ANTHROPIC_API_KEY || process.env.EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY;
  if (!key || !key.startsWith("sk-ant-")) return null;
  return key;
}

// Build system prompt with user context
function buildSystemPrompt(
  userName: string,
  habits: any[],
  recentReflection: any | null,
  integrity: number,
  xp: number,
  context?: string,
): string {
  const completedToday = habits.filter((h: any) => h.completedToday).length;
  const totalHabits = habits.length;
  const protocolHabits = habits.filter((h: any) => h.habitType === "protocol");
  const coreHabits = habits.filter((h: any) => h.habitType === "core");

  const habitList = habits
    .slice(0, 10)
    .map((h: any) => `- ${h.title} (${h.category || "general"}, ${h.completedToday ? "done" : "not done"}, streak: ${h.currentStreak || 0})`)
    .join("\n");

  const reflectionContext = recentReflection
    ? `Latest reflection: ${recentReflection.dayRating} day. Win: "${recentReflection.oneWin}"${recentReflection.oneLearning ? `. Learning: "${recentReflection.oneLearning}"` : ""}${recentReflection.gratitude ? `. Grateful for: "${recentReflection.gratitude}"` : ""}`
    : "No recent reflection.";

  return `You are Cerebra, the AI coach inside Habit OS -- a personal transformation operating system. You speak with ${userName}.

PERSONALITY:
- Direct, no fluff. Every word earns its place.
- Warm but not soft. You care deeply but won't coddle.
- Pattern-aware. You notice what the user doesn't.
- Action-biased. End responses with something concrete when possible.
- Speak like a trusted mentor, not a corporate chatbot.
- Keep responses concise -- 2-4 sentences for quick questions, up to a short paragraph for deeper ones.
- Never use bullet points or numbered lists unless the user asks for them.

USER STATE:
- Name: ${userName}
- Integrity Score: ${integrity}%
- XP: ${xp}
- Habits completed today: ${completedToday}/${totalHabits}
- Active protocols: ${protocolHabits.length}
- Core habits: ${coreHabits.length}

HABITS:
${habitList || "No habits yet."}

${reflectionContext}

${context === "habits" ? "The user is asking about their habits specifically. Reference their actual habit data." : ""}
${context === "focus" ? "The user is asking about focus and deep work. Help them optimize their focus sessions." : ""}
${context === "reflection" ? "The user is in a reflective mood. Be thoughtful and help them process." : ""}
${context === "motivation" ? "The user needs a push. Be encouraging but real -- no empty platitudes." : ""}
${context === "planning" ? "The user wants to plan. Help them prioritize based on their data." : ""}

RULES:
- Reference their actual data when relevant. Don't make up stats.
- If they've done well, acknowledge it specifically.
- If they're struggling, be honest but supportive.
- Don't explain what Habit OS is -- they already know.
- If you suggest an action, frame it as something they can do right now.`;
}

// Call Claude API
async function callClaude(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  apiKey: string,
): Promise<string> {
  const response = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 512,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Claude API error:", response.status, errText);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };
  const textBlock = data.content.find((b) => b.type === "text");
  return textBlock?.text || "I'm having trouble thinking right now. Try again in a moment.";
}

// Fallback response when Claude is not available
function generateFallbackResponse(
  message: string,
  habits: any[],
  reflection: any | null,
  integrity: number,
): string {
  const completedToday = habits.filter((h: any) => h.completedToday).length;
  const total = habits.length;
  const lowerMsg = message.toLowerCase();

  if (lowerMsg.includes("how am i doing") || lowerMsg.includes("progress") || lowerMsg.includes("status")) {
    if (completedToday === total && total > 0) {
      return `All ${total} habits done today. Integrity at ${integrity}%. You're locked in -- keep that energy.`;
    }
    if (completedToday === 0 && total > 0) {
      return `${total} habits waiting. Pick the easiest one and knock it out right now. Momentum starts with one.`;
    }
    return `${completedToday}/${total} habits done today. Integrity at ${integrity}%. Solid progress -- finish strong.`;
  }

  if (lowerMsg.includes("motivat") || lowerMsg.includes("push") || lowerMsg.includes("struggle")) {
    if (reflection?.dayRating === "rough") {
      return "Rough days test what you're building. You don't need to be perfect today -- just don't quit. Show up for one thing.";
    }
    return "Discipline isn't about feeling ready. It's about showing up when you don't. What's the one thing you can do right now?";
  }

  if (lowerMsg.includes("habit") || lowerMsg.includes("what should")) {
    const incomplete = habits.filter((h: any) => !h.completedToday);
    if (incomplete.length > 0) {
      return `Start with "${incomplete[0].title}" -- that's your next move. Don't overthink it, just begin.`;
    }
    return "All habits done today. Use this momentum -- stack something new or deepen an existing practice.";
  }

  if (lowerMsg.includes("focus") || lowerMsg.includes("deep work")) {
    return "Block 25 minutes. One task. No phone. That's it. You can do anything for 25 minutes.";
  }

  return `${completedToday}/${total} habits done, integrity at ${integrity}%. What specifically can I help you with -- habits, focus, or planning?`;
}

const claudeRouter = new Hono<AppType>()

  // POST /api/claude/chat - Main conversational endpoint
  .post("/chat", zValidator("json", claudeChatRequestSchema), async (c) => {
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

    const data = c.req.valid("json");

    // Gather user context
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [habits, latestReflection] = await Promise.all([
      db.habit.findMany({
        where: { profileId: profile.id, archived: false },
        include: {
          events: {
            where: { completedAt: { gte: today } },
          },
        },
        take: 15,
      }),
      db.dailyReflection.findFirst({
        where: { profileId: profile.id },
        orderBy: { date: "desc" },
      }),
    ]);

    // Map habits with completedToday flag
    const habitsWithStatus = habits.map((h) => ({
      ...h,
      completedToday: h.events.length > 0,
    }));

    const userName = profile.handle || "there";
    const integrity = profile.integrity ?? 100;
    const xp = profile.xp ?? 0;

    // Try Claude API
    const apiKey = getAnthropicKey();

    if (apiKey) {
      try {
        const systemPrompt = buildSystemPrompt(
          userName,
          habitsWithStatus,
          latestReflection,
          integrity,
          xp,
          data.context,
        );

        // Build message history
        const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

        if (data.conversationHistory) {
          for (const msg of data.conversationHistory.slice(-10)) {
            messages.push({ role: msg.role, content: msg.content });
          }
        }

        messages.push({ role: "user", content: data.message });

        const reply = await callClaude(systemPrompt, messages, apiKey);

        return c.json({
          reply,
          suggestion: undefined,
          actionType: "none" as const,
          usingAI: true,
        });
      } catch (error) {
        console.error("Claude API error, falling back:", error);
      }
    }

    // Fallback
    const fallback = generateFallbackResponse(
      data.message,
      habitsWithStatus,
      latestReflection,
      integrity,
    );

    return c.json({
      reply: fallback,
      suggestion: undefined,
      actionType: "none" as const,
      usingAI: false,
    });
  })

  // POST /api/claude/insights - Claude-powered weekly insights
  .post("/insights", async (c) => {
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

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [habits, reflections, focusSessions] = await Promise.all([
      db.habit.findMany({
        where: { profileId: profile.id, archived: false },
        include: {
          events: {
            where: { completedAt: { gte: sevenDaysAgo } },
            orderBy: { completedAt: "desc" },
          },
        },
      }),
      db.dailyReflection.findMany({
        where: { profileId: profile.id, date: { gte: sevenDaysAgo } },
        orderBy: { date: "desc" },
      }),
      db.focusSession.findMany({
        where: { profileId: profile.id, startTime: { gte: sevenDaysAgo } },
        orderBy: { startTime: "desc" },
      }),
    ]);

    // Calculate stats
    const totalCompletions = habits.reduce((sum, h) => sum + h.events.length, 0);
    const consistencyScore = habits.length > 0 ? Math.round((totalCompletions / (habits.length * 7)) * 100) : 0;
    const totalFocusMinutes = Math.round(focusSessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60);

    // Day scores from reflections
    const dayScores: Record<string, number> = {};
    reflections.forEach((r) => {
      const dayName = new Date(r.date).toLocaleDateString("en-US", { weekday: "long" });
      const score = r.dayRating === "amazing" ? 4 : r.dayRating === "good" ? 3 : r.dayRating === "okay" ? 2 : 1;
      dayScores[dayName] = (dayScores[dayName] || 0) + score;
    });

    const dayEntries = Object.entries(dayScores);
    const bestDay = dayEntries.length > 0 ? dayEntries.reduce((a, b) => a[1] > b[1] ? a : b)[0] : "Unknown";
    const worstDay = dayEntries.length > 0 ? dayEntries.reduce((a, b) => a[1] < b[1] ? a : b)[0] : "Unknown";

    const sortedHabits = [...habits].sort((a, b) => b.events.length - a.events.length);
    const topHabit = sortedHabits[0]?.title || "None yet";
    const strugglingHabit = sortedHabits.length > 1 ? sortedHabits[sortedHabits.length - 1]?.title || "All good" : "All good";

    const patterns = {
      consistencyScore,
      bestDay,
      worstDay,
      topHabit,
      strugglingHabit,
      totalCompletions,
      totalFocusMinutes,
      reflectionCount: reflections.length,
    };

    const apiKey = getAnthropicKey();

    if (apiKey) {
      try {
        const reflectionSummary = reflections
          .slice(0, 3)
          .map((r) => `${r.dayRating}: "${r.oneWin}"`)
          .join("; ");

        const prompt = `Analyze this user's weekly habit data and return JSON.

DATA:
- Consistency: ${consistencyScore}%
- Best Day: ${bestDay}
- Worst Day: ${worstDay}
- Top Habit: ${topHabit}
- Struggling: ${strugglingHabit}
- Total completions: ${totalCompletions}
- Focus time: ${totalFocusMinutes} min
- Reflections: ${reflections.length}/7 days
- Recent reflections: ${reflectionSummary || "None"}
- Integrity: ${profile.integrity ?? 100}%

Return ONLY a JSON array of 3-4 insights:
[{"type":"celebration"|"warning"|"pattern"|"recommendation"|"challenge","title":"Short title","message":"2-3 sentence insight","confidence":0.0-1.0,"actionable":boolean,"action":"optional action"}]

Be specific to their data. No generic advice.`;

        const response = await fetch(ANTHROPIC_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: MODEL,
            max_tokens: 1024,
            messages: [{ role: "user", content: prompt }],
          }),
        });

        if (response.ok) {
          const responseData = (await response.json()) as {
            content: Array<{ type: string; text: string }>;
          };
          const text = responseData.content.find((b) => b.type === "text")?.text || "[]";

          // Parse JSON from response (handle markdown code blocks)
          const jsonMatch = text.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const insights = JSON.parse(jsonMatch[0]);
            return c.json({ insights, patterns, usingAI: true });
          }
        }
      } catch (error) {
        console.error("Claude insights error:", error);
      }
    }

    // Fallback insights
    const insights: any[] = [];

    if (consistencyScore >= 80) {
      insights.push({
        type: "celebration",
        title: "Outstanding Week",
        message: `${consistencyScore}% consistency. You're not just building habits -- you're building identity.`,
        confidence: 1.0,
        actionable: false,
      });
    } else if (consistencyScore < 50) {
      insights.push({
        type: "warning",
        title: "Momentum Stalled",
        message: `${consistencyScore}% consistency this week. Consider reducing to 3 core habits and nailing those first.`,
        confidence: 0.9,
        actionable: true,
        action: "Reduce to 3 core habits",
      });
    } else {
      insights.push({
        type: "pattern",
        title: "Building Momentum",
        message: `${consistencyScore}% consistency -- solid but not locked in yet. One more strong day and you'll feel the shift.`,
        confidence: 0.85,
        actionable: false,
      });
    }

    if (bestDay !== "Unknown") {
      insights.push({
        type: "pattern",
        title: `${bestDay} is Your Day`,
        message: `You perform best on ${bestDay}s. Front-load your hardest habits there.`,
        confidence: 0.8,
        actionable: true,
        action: `Schedule key tasks on ${bestDay}`,
      });
    }

    if (topHabit !== "None yet") {
      insights.push({
        type: "recommendation",
        title: "Anchor Habit",
        message: `"${topHabit}" is your strongest habit. Stack a weaker one right after it.`,
        confidence: 0.75,
        actionable: true,
        action: `Stack after "${topHabit}"`,
      });
    }

    return c.json({ insights, patterns, usingAI: false });
  })

  // GET /api/claude/status - Check if Claude is configured
  .get("/status", async (c) => {
    const apiKey = getAnthropicKey();
    return c.json({
      configured: !!apiKey,
      model: MODEL,
      provider: "anthropic",
    });
  });

export default claudeRouter;
