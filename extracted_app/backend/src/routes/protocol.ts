import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import type { AppType } from "../index";
import { importDataRequestSchema } from "../../../shared/contracts";

// Helper function for date keys
function getDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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

// Helper: compute integrity grade based on score
function computeGrade(integrity: number): "S" | "A" | "B" | "C" | "D" | "F" {
  if (integrity >= 95) return "S";
  if (integrity >= 80) return "A";
  if (integrity >= 60) return "B";
  if (integrity >= 40) return "C";
  if (integrity >= 20) return "D";
  return "F";
}

const protocolRouter = new Hono<AppType>()
  // GET /integrity - Returns profile integrity score, xp, and grade
  .get("/integrity", async (c) => {
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

    return c.json({
      integrity: profile.integrity,
      xp: profile.xp,
      grade: computeGrade(profile.integrity),
      lastAuditDate: profile.lastAuditDate,
    });
  })

  // GET /weekly-report - Returns 7-day stats
  .get("/weekly-report", async (c) => {
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

    const now = new Date();
    const periodEnd = getDateKey(now);
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const periodStart = getDateKey(sevenDaysAgo);

    // Get all protocol/core habits for this user
    const protocols = await db.habit.findMany({
      where: {
        profileId: profile.id,
        archived: false,
        habitType: { in: ["protocol", "core"] },
      },
    });

    const totalProtocols = protocols.length;
    let activeProtocols = 0;
    let promotedProtocols = 0;
    let failedProtocols = 0;

    // Build a set of all days in the 7-day window that had at least one completion
    const coveredDays = new Set<string>();
    let totalExpectedDays = 0;
    let totalCompletedDays = 0;

    for (const habit of protocols) {
      if (habit.protocolStatus === "active") activeProtocols++;
      else if (habit.protocolStatus === "promoted") promotedProtocols++;
      else if (habit.protocolStatus === "failed") failedProtocols++;

      const history = parseCompletionHistory(habit.completionHistory);

      // Count completions within the 7-day window
      let completionsInWindow = 0;
      for (const dateStr of history) {
        if (dateStr >= periodStart && dateStr <= periodEnd) {
          completionsInWindow++;
          coveredDays.add(dateStr);
        }
      }

      // Each protocol habit expects 7 days of coverage
      totalExpectedDays += 7;
      totalCompletedDays += completionsInWindow;
    }

    const adherencePercent =
      totalExpectedDays > 0
        ? Math.round((totalCompletedDays / totalExpectedDays) * 100)
        : 100;

    const coverageDays = coveredDays.size;

    return c.json({
      adherencePercent,
      coverageDays,
      grade: computeGrade(profile.integrity),
      integrity: profile.integrity,
      xp: profile.xp,
      totalProtocols,
      activeProtocols,
      promotedProtocols,
      failedProtocols,
      periodStart,
      periodEnd,
    });
  })

  // POST /integrity/reset - Resets integrity to 100 (for testing)
  .post("/integrity/reset", async (c) => {
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

    const updatedProfile = await db.profile.update({
      where: { id: profile.id },
      data: {
        integrity: 100,
      },
    });

    return c.json({
      success: true,
      integrity: updatedProfile.integrity,
    });
  })

  // GET /export - Returns the user's complete data as JSON
  .get("/export", async (c) => {
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

    const habits = await db.habit.findMany({
      where: { profileId: profile.id },
      include: {
        events: {
          orderBy: { completedAt: "desc" },
        },
      },
      orderBy: { order: "asc" },
    });

    return c.json({
      profile: {
        handle: profile.handle,
        integrity: profile.integrity,
        xp: profile.xp,
        lastAuditDate: profile.lastAuditDate,
      },
      habits: habits.map((habit) => ({
        id: habit.id,
        title: habit.title,
        description: habit.description,
        icon: habit.icon,
        color: habit.color,
        category: habit.category,
        frequency: habit.frequency,
        targetCount: habit.targetCount,
        order: habit.order,
        archived: habit.archived,
        habitType: habit.habitType,
        protocolTarget: habit.protocolTarget,
        protocolWindowDays: habit.protocolWindowDays,
        protocolStartDate: habit.protocolStartDate,
        protocolStatus: habit.protocolStatus,
        bestStreak: habit.bestStreak,
        completionHistory: habit.completionHistory,
        createdAt: habit.createdAt.toISOString(),
        updatedAt: habit.updatedAt.toISOString(),
        events: habit.events.map((e) => ({
          id: e.id,
          completedAt: e.completedAt.toISOString(),
          note: e.note,
          mood: e.mood,
        })),
      })),
      exportedAt: new Date().toISOString(),
    });
  })

  // POST /import - Accepts a JSON body and restores the user's data
  .post("/import", zValidator("json", importDataRequestSchema), async (c) => {
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
    let profileUpdated = false;
    let habitsUpserted = 0;

    // Update profile integrity/xp if provided
    if (data.profile) {
      const profileUpdateData: { integrity?: number; xp?: number } = {};
      if (data.profile.integrity !== undefined) {
        profileUpdateData.integrity = Math.max(0, Math.min(100, data.profile.integrity));
      }
      if (data.profile.xp !== undefined) {
        profileUpdateData.xp = Math.max(0, data.profile.xp);
      }

      if (Object.keys(profileUpdateData).length > 0) {
        await db.profile.update({
          where: { id: profile.id },
          data: profileUpdateData,
        });
        profileUpdated = true;
      }
    }

    // Upsert habits if provided
    if (data.habits && data.habits.length > 0) {
      for (const habitData of data.habits) {
        const upsertData = {
          title: habitData.title,
          description: habitData.description ?? null,
          icon: habitData.icon ?? null,
          color: habitData.color ?? "#00D4FF",
          category: habitData.category ?? "general",
          frequency: habitData.frequency ?? "daily",
          targetCount: habitData.targetCount ?? 1,
          order: habitData.order ?? 0,
          archived: habitData.archived ?? false,
          habitType: habitData.habitType ?? "standard",
          protocolTarget: habitData.protocolTarget ?? null,
          protocolWindowDays: habitData.protocolWindowDays ?? null,
          protocolStartDate: habitData.protocolStartDate ?? null,
          protocolStatus: habitData.protocolStatus ?? null,
          bestStreak: habitData.bestStreak ?? 0,
          completionHistory: habitData.completionHistory ?? null,
        };

        if (habitData.id) {
          // Try to find existing habit owned by this profile
          const existing = await db.habit.findFirst({
            where: { id: habitData.id, profileId: profile.id },
          });

          if (existing) {
            await db.habit.update({
              where: { id: existing.id },
              data: upsertData,
            });
          } else {
            await db.habit.create({
              data: {
                id: habitData.id,
                profileId: profile.id,
                ...upsertData,
              },
            });
          }
        } else {
          await db.habit.create({
            data: {
              profileId: profile.id,
              ...upsertData,
            },
          });
        }

        habitsUpserted++;
      }
    }

    return c.json({
      success: true,
      habitsUpserted,
      profileUpdated,
    });
  });

export default protocolRouter;
