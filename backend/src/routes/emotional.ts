import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import type { AppType } from "../index";
import { z } from "zod";

const userGoalSchema = z.object({
  purpose: z.string().min(1),
  identity: z.string().optional(),
  bigWhy: z.string().min(1),
});

const dailyIntentionSchema = z.object({
  morningFeeling: z.enum(["energized", "good", "tired", "struggling"]),
  oneBigWin: z.string().min(1),
  date: z.string().optional(),
});

const dailyReflectionSchema = z.object({
  dayRating: z.enum(["amazing", "good", "okay", "rough"]),
  oneWin: z.string().min(1),
  oneLearning: z.string().optional(),
  gratitude: z.string().optional(),
  date: z.string().optional(),
});

const markCelebratedSchema = z.object({
  celebrated: z.boolean(),
});

const emotionalRouter = new Hono<AppType>()
  // USER GOAL ROUTES
  .get("/goal", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
      include: { userGoal: true },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    return c.json({ goal: profile.userGoal });
  })

  .post("/goal", zValidator("json", userGoalSchema), async (c) => {
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

    const goal = await db.userGoal.upsert({
      where: { profileId: profile.id },
      create: {
        profileId: profile.id,
        purpose: data.purpose,
        identity: data.identity,
        bigWhy: data.bigWhy,
      },
      update: {
        purpose: data.purpose,
        identity: data.identity,
        bigWhy: data.bigWhy,
      },
    });

    return c.json({ goal });
  })

  // DAILY INTENTION ROUTES
  .get("/intentions/today", async (c) => {
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

    // Get today's intention
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const intention = await db.dailyIntention.findFirst({
      where: {
        profileId: profile.id,
        date: {
          gte: today,
        },
      },
      orderBy: { date: "desc" },
    });

    return c.json({ intention });
  })

  .post("/intentions", zValidator("json", dailyIntentionSchema), async (c) => {
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
    const date = data.date ? new Date(data.date) : new Date();
    date.setHours(0, 0, 0, 0);

    const intention = await db.dailyIntention.upsert({
      where: {
        profileId_date: {
          profileId: profile.id,
          date,
        },
      },
      create: {
        profileId: profile.id,
        date,
        morningFeeling: data.morningFeeling,
        oneBigWin: data.oneBigWin,
      },
      update: {
        morningFeeling: data.morningFeeling,
        oneBigWin: data.oneBigWin,
      },
    });

    return c.json({ intention });
  })

  .patch("/intentions/:id/complete", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const intentionId = c.req.param("id");

    const intention = await db.dailyIntention.update({
      where: { id: intentionId },
      data: { completed: true },
    });

    return c.json({ intention });
  })

  // DAILY REFLECTION ROUTES
  .get("/reflections/today", async (c) => {
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

    // Get today's reflection
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const reflection = await db.dailyReflection.findFirst({
      where: {
        profileId: profile.id,
        date: {
          gte: today,
        },
      },
      orderBy: { date: "desc" },
    });

    return c.json({ reflection });
  })

  .get("/reflections/recent", async (c) => {
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

    const reflections = await db.dailyReflection.findMany({
      where: { profileId: profile.id },
      orderBy: { date: "desc" },
      take: 7,
    });

    return c.json({ reflections });
  })

  .post("/reflections", zValidator("json", dailyReflectionSchema), async (c) => {
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
    const date = data.date ? new Date(data.date) : new Date();
    date.setHours(0, 0, 0, 0);

    // Get today's habit and focus stats
    const habitsCompleted = await db.habitEvent.count({
      where: {
        habit: { profileId: profile.id },
        completedAt: {
          gte: date,
        },
      },
    });

    const focusSessions = await db.focusSession.findMany({
      where: {
        profileId: profile.id,
        startTime: {
          gte: date,
        },
      },
    });

    const focusMinutes = focusSessions.reduce((total, session) => {
      return total + (session.duration || 0) / 60;
    }, 0);

    const reflection = await db.dailyReflection.upsert({
      where: {
        profileId_date: {
          profileId: profile.id,
          date,
        },
      },
      create: {
        profileId: profile.id,
        date,
        dayRating: data.dayRating,
        oneWin: data.oneWin,
        oneLearning: data.oneLearning,
        gratitude: data.gratitude,
        habitsCompleted,
        focusMinutes: Math.round(focusMinutes),
      },
      update: {
        dayRating: data.dayRating,
        oneWin: data.oneWin,
        oneLearning: data.oneLearning,
        gratitude: data.gratitude,
        habitsCompleted,
        focusMinutes: Math.round(focusMinutes),
      },
    });

    return c.json({ reflection });
  })

  // ACHIEVEMENT ROUTES
  .get("/achievements", async (c) => {
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

    const achievements = await db.achievement.findMany({
      where: { profileId: profile.id },
      orderBy: { unlockedAt: "desc" },
    });

    return c.json({ achievements });
  })

  .get("/achievements/uncelebrated", async (c) => {
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

    const achievements = await db.achievement.findMany({
      where: {
        profileId: profile.id,
        celebrated: false,
      },
      orderBy: { unlockedAt: "asc" },
      take: 1,
    });

    return c.json({ achievement: achievements[0] || null });
  })

  .patch("/achievements/:id/celebrate", zValidator("json", markCelebratedSchema), async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const achievementId = c.req.param("id");
    const data = c.req.valid("json");

    const achievement = await db.achievement.update({
      where: { id: achievementId },
      data: { celebrated: data.celebrated },
    });

    return c.json({ achievement });
  })

  .post("/achievements/create", async (c) => {
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

    const data = await c.req.json();

    // Check if achievement already exists
    const existing = await db.achievement.findFirst({
      where: {
        profileId: profile.id,
        type: data.type,
        habitId: data.habitId || null,
      },
    });

    if (existing) {
      return c.json({ achievement: existing, alreadyExists: true });
    }

    // Create new achievement
    const achievement = await db.achievement.create({
      data: {
        profileId: profile.id,
        type: data.type,
        title: data.title,
        description: data.description,
        habitId: data.habitId || null,
        celebrated: false,
      },
    });

    return c.json({ achievement, alreadyExists: false });
  })

  // IDENTITY STATEMENTS
  .get("/identity", async (c) => {
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

    const statements = await db.identityStatement.findMany({
      where: { profileId: profile.id },
      orderBy: { earnedAt: "desc" },
    });

    return c.json({ statements });
  })

  // DASHBOARD SUMMARY (combines intention + reflection + achievements for today)
  .get("/dashboard", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
      include: {
        userGoal: true,
      },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get today's data
    const [intention, reflection, uncelebratedAchievement, latestStatement] = await Promise.all([
      db.dailyIntention.findFirst({
        where: {
          profileId: profile.id,
          date: { gte: today },
        },
      }),
      db.dailyReflection.findFirst({
        where: {
          profileId: profile.id,
          date: { gte: today },
        },
      }),
      db.achievement.findFirst({
        where: {
          profileId: profile.id,
          celebrated: false,
        },
        orderBy: { unlockedAt: "asc" },
      }),
      db.identityStatement.findFirst({
        where: { profileId: profile.id },
        orderBy: { timesShown: "asc" }, // Show least-shown statement
      }),
    ]);

    // If we have a statement, increment its show count
    if (latestStatement) {
      await db.identityStatement.update({
        where: { id: latestStatement.id },
        data: { timesShown: { increment: 1 } },
      });
    }

    return c.json({
      goal: profile.userGoal,
      intention,
      reflection,
      uncelebratedAchievement,
      identityStatement: latestStatement,
    });
  });

export default emotionalRouter;
