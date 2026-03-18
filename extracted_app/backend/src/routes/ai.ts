import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import type { AppType } from "../index";
import { z } from "zod";

const querySchema = z.object({
  query: z.string().min(1),
  type: z.enum(["coaching", "insights", "recommendations"]).optional(),
});

const aiRouter = new Hono<AppType>()
  // Generate AI-powered weekly insights
  .post("/insights/weekly", async (c) => {
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

    // Gather data from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const habits = await db.habit.findMany({
      where: { profileId: profile.id, archived: false },
      include: {
        events: {
          where: { completedAt: { gte: sevenDaysAgo } },
          orderBy: { completedAt: "desc" },
        },
      },
    });

    const reflections = await db.dailyReflection.findMany({
      where: {
        profileId: profile.id,
        date: { gte: sevenDaysAgo },
      },
      orderBy: { date: "desc" },
    });

    const intentions = await db.dailyIntention.findMany({
      where: {
        profileId: profile.id,
        date: { gte: sevenDaysAgo },
      },
      orderBy: { date: "desc" },
    });

    const focusSessions = await db.focusSession.findMany({
      where: {
        profileId: profile.id,
        startTime: { gte: sevenDaysAgo },
      },
      orderBy: { startTime: "desc" },
    });

    // Calculate patterns
    const patterns = analyzePatterns(habits, reflections, intentions, focusSessions);

    // Try Claude first, then OpenAI, then rule-based
    const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY;

    if (anthropicKey && anthropicKey.startsWith("sk-ant-")) {
      try {
        const aiInsights = await generateClaudeInsights(patterns, habits, reflections, anthropicKey);
        return c.json({ insights: aiInsights, patterns, usingAI: true });
      } catch (error) {
        console.error("Claude API error, trying OpenAI:", error);
      }
    }

    const openaiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

    if (openaiKey && openaiKey.startsWith("sk-")) {
      try {
        const aiInsights = await generateOpenAIInsights(patterns, habits, reflections, openaiKey);
        return c.json({ insights: aiInsights, patterns, usingAI: true });
      } catch (error) {
        console.error("OpenAI API error:", error);
      }
    }

    // Generate rule-based insights
    const insights = generateRuleBasedInsights(patterns, habits, reflections);

    return c.json({
      insights,
      patterns,
      usingAI: false,
    });
  })

  // POST /api/ai/extract-tasks - Extract tasks from image (proxied to OpenAI)
  .post("/extract-tasks", async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: "Unauthorized" }, 401);

    try {
      const { imageBase64, mimeType } = await c.req.json();

      if (!imageBase64) {
        return c.json({ error: "Image data required" }, 400);
      }

      const openaiKey = process.env.OPENAI_API_KEY || process.env.EXPO_PUBLIC_OPENAI_API_KEY;
      if (!openaiKey) {
        return c.json({ error: "OpenAI not configured" }, 503);
      }

      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: "Extract actionable tasks from this image. Return a JSON array of objects with 'title' (string) and 'priority' ('low'|'medium'|'high') fields." },
                { type: "image_url", image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}` } }
              ]
            }
          ],
          max_tokens: 1000,
        }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error("[AI] OpenAI error:", err);
        return c.json({ error: "Failed to extract tasks" }, 502);
      }

      const result = await response.json() as any;
      const content = result.choices?.[0]?.message?.content || "[]";

      // Try to parse JSON from the response
      let tasks;
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        tasks = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
      } catch {
        tasks = [];
      }

      return c.json({ tasks });
    } catch (error) {
      console.error("[AI] Extract tasks error:", error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })

  // Generate AI coaching message
  .post("/coaching", zValidator("json", querySchema), async (c) => {
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

    // Check subscription tier for AI features
    if (profile.subscriptionTier !== "elite" && profile.subscriptionTier !== "pro") {
      return c.json({
        message: "AI coaching is available with Pro or Elite subscription.",
        actionable: false,
      });
    }

    // Get recent context
    const habits = await db.habit.findMany({
      where: { profileId: profile.id, archived: false },
      include: {
        events: {
          where: {
            completedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        },
      },
      take: 10,
    });

    const latestReflection = await db.dailyReflection.findFirst({
      where: { profileId: profile.id },
      orderBy: { date: "desc" },
    });

    // Try Claude first, then OpenAI, then generic
    const anthropicKey = process.env.ANTHROPIC_API_KEY || process.env.EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY;

    if (anthropicKey && anthropicKey.startsWith("sk-ant-")) {
      try {
        const coaching = await generateClaudeCoaching(data.query, habits, latestReflection, anthropicKey);
        return c.json({ message: coaching, actionable: true, usingAI: true });
      } catch (error) {
        console.error("Claude coaching error, trying OpenAI:", error);
      }
    }

    const openaiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

    if (openaiKey && openaiKey.startsWith("sk-")) {
      try {
        const coaching = await generateOpenAICoaching(data.query, habits, latestReflection, openaiKey);
        return c.json({ message: coaching, actionable: true, usingAI: true });
      } catch (error) {
        console.error("OpenAI API error:", error);
      }
    }

    // Fall back to generic coaching
    const coaching = generateGenericCoaching(data.query, habits, latestReflection);
    return c.json({ message: coaching, actionable: false, usingAI: false });
  });

// Pattern analysis helper
function analyzePatterns(habits: any[], reflections: any[], intentions: any[], sessions: any[]) {
  // Calculate consistency score
  const totalHabits = habits.length;
  const totalCompletions = habits.reduce((sum, h) => sum + h.events.length, 0);
  const consistencyScore = totalHabits > 0 ? Math.round((totalCompletions / (totalHabits * 7)) * 100) : 0;

  // Find best and worst days
  const dayScores: Record<string, number> = {};
  reflections.forEach((r) => {
    const dayName = new Date(r.date).toLocaleDateString("en-US", { weekday: "long" });
    const score = r.dayRating === "amazing" ? 4 : r.dayRating === "good" ? 3 : r.dayRating === "okay" ? 2 : 1;
    dayScores[dayName] = (dayScores[dayName] || 0) + score;
  });

  const bestDay = Object.keys(dayScores).length > 0
    ? Object.keys(dayScores).reduce((a, b) => (dayScores[a] ?? 0) > (dayScores[b] ?? 0) ? a : b)
    : "Unknown";
  const worstDay = Object.keys(dayScores).length > 0
    ? Object.keys(dayScores).reduce((a, b) => (dayScores[a] ?? 0) < (dayScores[b] ?? 0) ? a : b)
    : "Unknown";

  // Find top performing habit
  const sortedHabits = [...habits].sort((a, b) => b.events.length - a.events.length);
  const topHabit = sortedHabits[0]?.title || "None yet";
  const strugglingHabit = sortedHabits[sortedHabits.length - 1]?.title || "All good";

  // Calculate focus time
  const totalFocusMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / 60;
  const avgFocusMinutes = sessions.length > 0 ? Math.round(totalFocusMinutes / sessions.length) : 0;

  return {
    consistencyScore,
    bestDay,
    worstDay,
    topHabit,
    strugglingHabit,
    totalCompletions,
    totalFocusMinutes: Math.round(totalFocusMinutes),
    avgFocusMinutes,
    reflectionCount: reflections.length,
    intentionCount: intentions.length,
  };
}

// Generate rule-based insights (no AI required)
function generateRuleBasedInsights(patterns: any, habits: any[], reflections: any[]) {
  const insights: any[] = [];

  // Consistency insight
  if (patterns.consistencyScore >= 80) {
    insights.push({
      type: "celebration",
      title: "Outstanding Performance",
      message: `You've maintained ${patterns.consistencyScore}% consistency this week. You're unstoppable!`,
      confidence: 1.0,
      actionable: false,
    });
  } else if (patterns.consistencyScore < 50) {
    insights.push({
      type: "warning",
      title: "Consistency Opportunity",
      message: `Your consistency is at ${patterns.consistencyScore}%. Consider focusing on fewer habits to build momentum.`,
      confidence: 0.9,
      actionable: true,
      action: "Reduce to 3 core habits this week",
    });
  }

  // Best day insight
  if (patterns.bestDay !== "Unknown") {
    insights.push({
      type: "pattern",
      title: `${patterns.bestDay} is Your Power Day`,
      message: `You perform best on ${patterns.bestDay}s. Schedule your most important tasks for this day.`,
      confidence: 0.85,
      actionable: true,
      action: `Plan key tasks for ${patterns.bestDay}`,
    });
  }

  // Focus time insight
  if (patterns.totalFocusMinutes >= 120) {
    insights.push({
      type: "celebration",
      title: "Deep Work Champion",
      message: `${patterns.totalFocusMinutes} minutes of focused work this week. You protect your time.`,
      confidence: 1.0,
      actionable: false,
    });
  }

  // Top habit insight
  if (patterns.topHabit !== "None yet") {
    insights.push({
      type: "recommendation",
      title: "Habit Stacking Opportunity",
      message: `"${patterns.topHabit}" is your strongest habit. Use it as an anchor for struggling habits.`,
      confidence: 0.8,
      actionable: true,
      action: `Stack weaker habits after "${patterns.topHabit}"`,
    });
  }

  return insights;
}

// Generate Claude-powered insights
async function generateClaudeInsights(patterns: any, habits: any[], reflections: any[], apiKey: string) {
  const reflectionSummary = reflections
    .slice(0, 3)
    .map((r: any) => `${r.dayRating}: "${r.oneWin}"`)
    .join("; ");

  const prompt = `Analyze this user's weekly habit data and return ONLY a JSON array.

DATA:
- Consistency: ${patterns.consistencyScore}%
- Best Day: ${patterns.bestDay}, Worst Day: ${patterns.worstDay}
- Top Habit: ${patterns.topHabit}, Struggling: ${patterns.strugglingHabit}
- Total completions: ${patterns.totalCompletions}
- Focus time: ${patterns.totalFocusMinutes} min
- Reflections: ${patterns.reflectionCount}/7 days
- Recent reflections: ${reflectionSummary || "None"}

Return ONLY a JSON array of 3-4 insights:
[{"type":"celebration"|"warning"|"pattern"|"recommendation","title":"Short title","message":"2-3 sentence insight","confidence":0.0-1.0,"actionable":true/false,"action":"optional action"}]

Be specific to their data. No generic advice.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.statusText}`);
  }

  const responseData = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };
  const text = responseData.content.find((b) => b.type === "text")?.text || "[]";
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (jsonMatch) {
    return JSON.parse(jsonMatch[0]);
  }
  throw new Error("Could not parse Claude response as JSON");
}

// Generate Claude coaching message
async function generateClaudeCoaching(query: string, habits: any[], reflection: any, apiKey: string) {
  const habitsSummary = habits.map((h: any) =>
    `${h.title}: ${h.events.length}/${h.targetCount} completed today`
  ).join(", ");

  const reflectionContext = reflection
    ? `Latest reflection: ${reflection.dayRating} day - "${reflection.oneWin}"`
    : "No recent reflection";

  const prompt = `You are a supportive, direct habit coach. Answer concisely (2-3 sentences max).

User asks: "${query}"

Context:
- Today's Habits: ${habitsSummary || "No habits yet"}
- ${reflectionContext}

Be specific and actionable. No fluff.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.statusText}`);
  }

  const data = (await response.json()) as {
    content: Array<{ type: string; text: string }>;
  };
  return data.content.find((b) => b.type === "text")?.text || "Keep going. You're building something real.";
}

// Generate OpenAI-powered insights
async function generateOpenAIInsights(patterns: any, habits: any[], reflections: any[], apiKey: string) {
  const prompt = `You are an expert habit and productivity coach analyzing a user's weekly data.

Data Summary:
- Consistency Score: ${patterns.consistencyScore}%
- Best Day: ${patterns.bestDay}
- Worst Day: ${patterns.worstDay}
- Top Performing Habit: ${patterns.topHabit}
- Struggling Habit: ${patterns.strugglingHabit}
- Total Habit Completions: ${patterns.totalCompletions}
- Focus Time: ${patterns.totalFocusMinutes} minutes
- Daily Reflections: ${patterns.reflectionCount}/7 days

Recent Reflections:
${reflections.slice(0, 3).map((r: any) => `- ${r.dayRating}: ${r.oneWin}`).join("\n")}

Generate 3-4 actionable insights in JSON format:
[
  {
    "type": "celebration" | "warning" | "pattern" | "recommendation",
    "title": "Short title",
    "message": "Detailed insight message",
    "confidence": 0.0-1.0,
    "actionable": boolean,
    "action": "Optional specific action to take"
  }
]

Focus on patterns, behavioral psychology, and specific actionable recommendations. Be encouraging but honest.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert habit coach providing JSON-formatted insights." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json() as any;
  const content = data.choices[0]?.message?.content;

  if (!content) {
    throw new Error("No response from OpenAI");
  }

  const parsed = JSON.parse(content);
  return Array.isArray(parsed) ? parsed : parsed.insights || [];
}

// Generate OpenAI coaching message
async function generateOpenAICoaching(query: string, habits: any[], reflection: any, apiKey: string) {
  const habitsSummary = habits.map((h: any) =>
    `${h.title}: ${h.events.length}/${h.targetCount} completed today`
  ).join(", ");

  const reflectionContext = reflection
    ? `Latest reflection: ${reflection.dayRating} day - "${reflection.oneWin}"`
    : "No recent reflection";

  const prompt = `You are a supportive habit coach talking to a user.

User Question: "${query}"

Context:
- Today's Habits: ${habitsSummary || "No habits yet"}
- ${reflectionContext}

Provide a concise, encouraging coaching response (2-3 sentences max). Be specific and actionable.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a supportive, concise habit coach. Keep responses under 3 sentences." },
        { role: "user", content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json() as any;
  return data.choices[0]?.message?.content || "Keep going! You're building something real.";
}

// Generic coaching fallback
function generateGenericCoaching(query: string, habits: any[], reflection: any) {
  const completedToday = habits.filter((h: any) => h.events.length >= h.targetCount).length;
  const total = habits.length;

  if (completedToday === total && total > 0) {
    return "You've completed all your habits today! This is what consistency looks like. Keep this momentum going.";
  }

  if (completedToday === 0 && total > 0) {
    return "Starting is the hardest part. Pick just one habit right now and complete it. Small wins build unstoppable momentum.";
  }

  if (reflection?.dayRating === "rough") {
    return "Tough days happen. Be gentle with yourself. Focus on just one core habit tomorrow and rebuild from there.";
  }

  return "You're building something real. Every day you show up, you're becoming the person you want to be. Keep going.";
}

export default aiRouter;
