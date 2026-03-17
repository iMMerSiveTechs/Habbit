import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { type AppType } from "../types";
import { db } from "../db";

const reflectionRouter = new Hono<AppType>();

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const DailyReflectionSchema = z.object({
  dayRating: z.string().min(1, "Day rating is required"),
  oneWin: z.string().min(1, "One win is required"),
  oneLearning: z.string().optional(),
  gratitude: z.string().optional(),
  habitsCompleted: z.number().int().min(0).optional().default(0),
  focusMinutes: z.number().int().min(0).optional().default(0),
});

const WeeklyReflectionSchema = z.object({
  weekStartDate: z.string().datetime(),
  overallRating: z.string().min(1),
  biggestWin: z.string().min(1),
  keyLearning: z.string().optional(),
  areasToImprove: z.string().optional(),
  nextWeekFocus: z.string().optional(),
  habitsConsistency: z.number().int().min(0).max(100).optional().default(0),
  focusHoursLogged: z.number().min(0).optional().default(0),
});

const MonthlyReflectionSchema = z.object({
  year: z.number().int().min(2020),
  month: z.number().int().min(1).max(12),
  overallRating: z.string().min(1),
  biggestAccomplishment: z.string().min(1),
  keyLessonsLearned: z.string().optional(),
  areasForGrowth: z.string().optional(),
  nextMonthPriorities: z.string().optional(), // JSON string
});

const ReflectionSettingsSchema = z.object({
  dailyReflectionEnabled: z.boolean().optional(),
  dailyReflectionTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  dailyMissedReminderTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  weeklyReflectionEnabled: z.boolean().optional(),
  weeklyReflectionDay: z.number().int().min(0).max(6).optional(),
  weeklyReflectionTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  monthlyReflectionEnabled: z.boolean().optional(),
  monthlyReflectionDay: z.number().int().min(1).max(31).optional(),
  monthlyReflectionTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  notificationsEnabled: z.boolean().optional(),
  tonePref: z.enum(["encouraging", "direct", "gentle"]).optional(),
  showInsights: z.boolean().optional(),
});

// ============================================================
// DAILY REFLECTIONS
// ============================================================

// Get today's daily reflection
reflectionRouter.get("/daily/today", async (c) => {
  const session = c.get("session");
  const user = c.get("user");

  if (!session || !user) {
    console.log("❌ [Reflection] Unauthorized daily reflection request");
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const reflection = await db.dailyReflection.findFirst({
      where: {
        profileId: profile.id,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    console.log("✅ [Reflection] Retrieved daily reflection for today");
    return c.json({ reflection });
  } catch (error) {
    console.error("❌ [Reflection] Error fetching daily reflection:", error);
    return c.json({ error: "Failed to fetch reflection" }, 500);
  }
});

// Create or update daily reflection
reflectionRouter.post(
  "/daily",
  zValidator("json", DailyReflectionSchema),
  async (c) => {
    const session = c.get("session");
    const user = c.get("user");

    if (!session || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const profile = await db.profile.findUnique({
        where: { userId: user.id },
      });

      if (!profile) {
        return c.json({ error: "Profile not found" }, 404);
      }

      const data = c.req.valid("json");
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Check if reflection already exists for today
      const existingReflection = await db.dailyReflection.findFirst({
        where: {
          profileId: profile.id,
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      let reflection;

      if (existingReflection) {
        reflection = await db.dailyReflection.update({
          where: { id: existingReflection.id },
          data: {
            dayRating: data.dayRating,
            oneWin: data.oneWin,
            oneLearning: data.oneLearning,
            gratitude: data.gratitude,
            habitsCompleted: data.habitsCompleted,
            focusMinutes: data.focusMinutes,
          },
        });
        console.log("✅ [Reflection] Updated daily reflection");
      } else {
        reflection = await db.dailyReflection.create({
          data: {
            profileId: profile.id,
            date: today,
            ...data,
          },
        });
        console.log("✅ [Reflection] Created daily reflection");
      }

      return c.json({ reflection, success: true });
    } catch (error) {
      console.error("❌ [Reflection] Error creating daily reflection:", error);
      return c.json({ error: "Failed to create reflection" }, 500);
    }
  }
);

// Get daily reflections history
reflectionRouter.get("/daily/history", async (c) => {
  const session = c.get("session");
  const user = c.get("user");

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const daysParam = c.req.query("days") || "30";
    const days = parseInt(daysParam, 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const reflections = await db.dailyReflection.findMany({
      where: {
        profileId: profile.id,
        date: { gte: startDate },
      },
      orderBy: { date: "desc" },
    });

    console.log(
      "✅ [Reflection] Retrieved daily reflections history"
    );
    return c.json({ reflections, count: reflections.length });
  } catch (error) {
    console.error(
      "❌ [Reflection] Error fetching daily reflections history:",
      error
    );
    return c.json({ error: "Failed to fetch history" }, 500);
  }
});

// ============================================================
// WEEKLY REFLECTIONS
// ============================================================

// Get current week's reflection
reflectionRouter.get("/weekly/current", async (c) => {
  const session = c.get("session");
  const user = c.get("user");

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    // Get Monday of current week
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const reflection = await db.weeklyReflection.findFirst({
      where: {
        profileId: profile.id,
        weekStartDate: monday,
      },
    });

    console.log("✅ [Reflection] Retrieved current weekly reflection");
    return c.json({ reflection });
  } catch (error) {
    console.error("❌ [Reflection] Error fetching weekly reflection:", error);
    return c.json({ error: "Failed to fetch reflection" }, 500);
  }
});

// Create or update weekly reflection
reflectionRouter.post(
  "/weekly",
  zValidator("json", WeeklyReflectionSchema),
  async (c) => {
    const session = c.get("session");
    const user = c.get("user");

    if (!session || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const profile = await db.profile.findUnique({
        where: { userId: user.id },
      });

      if (!profile) {
        return c.json({ error: "Profile not found" }, 404);
      }

      const data = c.req.valid("json");
      const weekStart = new Date(data.weekStartDate);
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const existingReflection = await db.weeklyReflection.findFirst({
        where: {
          profileId: profile.id,
          weekStartDate: weekStart,
        },
      });

      let reflection;

      if (existingReflection) {
        reflection = await db.weeklyReflection.update({
          where: { id: existingReflection.id },
          data: {
            overallRating: data.overallRating,
            biggestWin: data.biggestWin,
            keyLearning: data.keyLearning,
            areasToImprove: data.areasToImprove,
            nextWeekFocus: data.nextWeekFocus,
            habitsConsistency: data.habitsConsistency,
            focusHoursLogged: data.focusHoursLogged,
          },
        });
        console.log("✅ [Reflection] Updated weekly reflection");
      } else {
        reflection = await db.weeklyReflection.create({
          data: {
            profileId: profile.id,
            weekStartDate: weekStart,
            weekEndDate: weekEnd,
            overallRating: data.overallRating,
            biggestWin: data.biggestWin,
            keyLearning: data.keyLearning,
            areasToImprove: data.areasToImprove,
            nextWeekFocus: data.nextWeekFocus,
            habitsConsistency: data.habitsConsistency,
            focusHoursLogged: data.focusHoursLogged,
          },
        });
        console.log("✅ [Reflection] Created weekly reflection");
      }

      return c.json({ reflection, success: true });
    } catch (error) {
      console.error("❌ [Reflection] Error creating weekly reflection:", error);
      return c.json({ error: "Failed to create reflection" }, 500);
    }
  }
);

// Get weekly reflections history
reflectionRouter.get("/weekly/history", async (c) => {
  const session = c.get("session");
  const user = c.get("user");

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const weeksParam = c.req.query("weeks") || "12";
    const weeks = parseInt(weeksParam, 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - weeks * 7);
    startDate.setHours(0, 0, 0, 0);

    const reflections = await db.weeklyReflection.findMany({
      where: {
        profileId: profile.id,
        weekStartDate: { gte: startDate },
      },
      orderBy: { weekStartDate: "desc" },
    });

    console.log("✅ [Reflection] Retrieved weekly reflections history");
    return c.json({ reflections, count: reflections.length });
  } catch (error) {
    console.error("❌ [Reflection] Error fetching weekly reflections:", error);
    return c.json({ error: "Failed to fetch history" }, 500);
  }
});

// ============================================================
// MONTHLY REFLECTIONS
// ============================================================

// Get current month's reflection
reflectionRouter.get("/monthly/current", async (c) => {
  const session = c.get("session");
  const user = c.get("user");

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const now = new Date();
    const reflection = await db.monthlyReflection.findFirst({
      where: {
        profileId: profile.id,
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      },
    });

    console.log("✅ [Reflection] Retrieved current monthly reflection");
    return c.json({ reflection });
  } catch (error) {
    console.error("❌ [Reflection] Error fetching monthly reflection:", error);
    return c.json({ error: "Failed to fetch reflection" }, 500);
  }
});

// Create or update monthly reflection
reflectionRouter.post(
  "/monthly",
  zValidator("json", MonthlyReflectionSchema),
  async (c) => {
    const session = c.get("session");
    const user = c.get("user");

    if (!session || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const profile = await db.profile.findUnique({
        where: { userId: user.id },
      });

      if (!profile) {
        return c.json({ error: "Profile not found" }, 404);
      }

      const data = c.req.valid("json");

      const existingReflection = await db.monthlyReflection.findFirst({
        where: {
          profileId: profile.id,
          year: data.year,
          month: data.month,
        },
      });

      let reflection;

      if (existingReflection) {
        reflection = await db.monthlyReflection.update({
          where: { id: existingReflection.id },
          data: {
            overallRating: data.overallRating,
            biggestAccomplishment: data.biggestAccomplishment,
            keyLessonsLearned: data.keyLessonsLearned,
            areasForGrowth: data.areasForGrowth,
            nextMonthPriorities: data.nextMonthPriorities,
          },
        });
        console.log("✅ [Reflection] Updated monthly reflection");
      } else {
        reflection = await db.monthlyReflection.create({
          data: {
            profileId: profile.id,
            year: data.year,
            month: data.month,
            overallRating: data.overallRating,
            biggestAccomplishment: data.biggestAccomplishment,
            keyLessonsLearned: data.keyLessonsLearned,
            areasForGrowth: data.areasForGrowth,
            nextMonthPriorities: data.nextMonthPriorities,
          },
        });
        console.log("✅ [Reflection] Created monthly reflection");
      }

      return c.json({ reflection, success: true });
    } catch (error) {
      console.error("❌ [Reflection] Error creating monthly reflection:", error);
      return c.json({ error: "Failed to create reflection" }, 500);
    }
  }
);

// Get monthly reflections history
reflectionRouter.get("/monthly/history", async (c) => {
  const session = c.get("session");
  const user = c.get("user");

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const monthsParam = c.req.query("months") || "12";
    const months = parseInt(monthsParam, 10);

    const now = new Date();
    const startYear = months > 12 ? now.getFullYear() - 1 : now.getFullYear();
    const startMonth = (now.getMonth() + 1 - months + 12) % 12 || 12;

    const reflections = await db.monthlyReflection.findMany({
      where: {
        profileId: profile.id,
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: months,
    });

    console.log("✅ [Reflection] Retrieved monthly reflections history");
    return c.json({ reflections, count: reflections.length });
  } catch (error) {
    console.error("❌ [Reflection] Error fetching monthly reflections:", error);
    return c.json({ error: "Failed to fetch history" }, 500);
  }
});

// ============================================================
// REFLECTION SETTINGS
// ============================================================

// Get reflection settings
reflectionRouter.get("/settings", async (c) => {
  const session = c.get("session");
  const user = c.get("user");

  if (!session || !user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  try {
    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    let settings = await db.reflectionSettings.findUnique({
      where: { profileId: profile.id },
    });

    // Create default settings if they don't exist
    if (!settings) {
      settings = await db.reflectionSettings.create({
        data: {
          profileId: profile.id,
          dailyReflectionEnabled: true,
          dailyReflectionTime: "20:00",
          dailyMissedReminderTime: "16:00",
          weeklyReflectionEnabled: true,
          weeklyReflectionDay: 0,
          weeklyReflectionTime: "18:00",
          monthlyReflectionEnabled: true,
          monthlyReflectionDay: 1,
          monthlyReflectionTime: "18:00",
          notificationsEnabled: true,
          tonePref: "encouraging",
          showInsights: true,
        },
      });
    }

    console.log("✅ [Reflection] Retrieved reflection settings");
    return c.json({ settings });
  } catch (error) {
    console.error("❌ [Reflection] Error fetching settings:", error);
    return c.json({ error: "Failed to fetch settings" }, 500);
  }
});

// Update reflection settings
reflectionRouter.post(
  "/settings",
  zValidator("json", ReflectionSettingsSchema),
  async (c) => {
    const session = c.get("session");
    const user = c.get("user");

    if (!session || !user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    try {
      const profile = await db.profile.findUnique({
        where: { userId: user.id },
      });

      if (!profile) {
        return c.json({ error: "Profile not found" }, 404);
      }

      const data = c.req.valid("json");

      let settings = await db.reflectionSettings.findUnique({
        where: { profileId: profile.id },
      });

      if (!settings) {
        settings = await db.reflectionSettings.create({
          data: {
            profileId: profile.id,
            ...data,
            dailyReflectionEnabled: data.dailyReflectionEnabled ?? true,
            dailyReflectionTime: data.dailyReflectionTime ?? "20:00",
            dailyMissedReminderTime: data.dailyMissedReminderTime ?? "16:00",
            weeklyReflectionEnabled: data.weeklyReflectionEnabled ?? true,
            weeklyReflectionDay: data.weeklyReflectionDay ?? 0,
            weeklyReflectionTime: data.weeklyReflectionTime ?? "18:00",
            monthlyReflectionEnabled: data.monthlyReflectionEnabled ?? true,
            monthlyReflectionDay: data.monthlyReflectionDay ?? 1,
            monthlyReflectionTime: data.monthlyReflectionTime ?? "18:00",
            notificationsEnabled: data.notificationsEnabled ?? true,
            tonePref: data.tonePref ?? "encouraging",
            showInsights: data.showInsights ?? true,
          },
        });
      } else {
        settings = await db.reflectionSettings.update({
          where: { id: settings.id },
          data,
        });
      }

      console.log("✅ [Reflection] Updated reflection settings");
      return c.json({ settings, success: true });
    } catch (error) {
      console.error("❌ [Reflection] Error updating settings:", error);
      return c.json({ error: "Failed to update settings" }, 500);
    }
  }
);

export { reflectionRouter };
