import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { AppType } from "../index";
import { db } from "../db";
import { z } from "zod";

// Request schemas
const recordMissedItemSchema = z.object({
  itemType: z.enum(["habit", "todo"]),
  itemId: z.string(),
  itemTitle: z.string(),
  scheduledTime: z.string().optional(), // ISO datetime
  weatherContext: z.string().optional(),
  locationContext: z.string().optional(),
});

const respondToMissedItemSchema = z.object({
  responseType: z.enum(["skip_once", "reschedule", "adjust_time", "remove", "completed_late"]),
  responseNote: z.string().optional(),
});

const adaptiveRouter = new Hono<AppType>()
  // =================================
  // MISSED ITEM DETECTION
  // =================================

  // Detect and record missed items (called by background service)
  .post("/detect-missed", async (c) => {
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
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Get all habits with reminders enabled
    const habits = await db.habit.findMany({
      where: {
        profileId: profile.id,
        archived: false,
        reminderEnabled: true,
      },
      include: {
        events: {
          where: {
            completedAt: { gte: today },
          },
        },
      },
    });

    // Get all todos with reminders that are not completed
    const todos = await db.todo.findMany({
      where: {
        profileId: profile.id,
        completed: false,
        archived: false,
        reminderEnabled: true,
        dueDate: { lte: now },
      },
    });

    const missedItems = [];

    // Check habits
    for (const habit of habits) {
      const completedToday = habit.events.length >= habit.targetCount;

      if (!completedToday && habit.reminderTime) {
        const [hours, minutes] = habit.reminderTime.split(":").map(Number);
        const reminderTime = new Date(today);
        reminderTime.setHours(hours ?? 0, minutes ?? 0, 0, 0);

        // If reminder time has passed and habit not completed
        if (now > reminderTime && (now.getTime() - reminderTime.getTime()) > 30 * 60 * 1000) { // 30 min grace period
          // Check if we already recorded this miss today
          const existingMiss = await db.missedItem.findFirst({
            where: {
              profileId: profile.id,
              itemType: "habit",
              itemId: habit.id,
              detectedAt: { gte: today },
            },
          });

          if (!existingMiss) {
            const missed = await db.missedItem.create({
              data: {
                profileId: profile.id,
                itemType: "habit",
                itemId: habit.id,
                itemTitle: habit.title,
                scheduledTime: reminderTime,
                dayOfWeek: now.getDay(),
                hourOfDay: now.getHours(),
              },
            });
            missedItems.push(missed);
          }
        }
      }
    }

    // Check todos
    for (const todo of todos) {
      if (todo.dueDate && todo.dueDate < now) {
        // Check if we already recorded this miss
        const existingMiss = await db.missedItem.findFirst({
          where: {
            profileId: profile.id,
            itemType: "todo",
            itemId: todo.id,
            detectedAt: { gte: today },
          },
        });

        if (!existingMiss) {
          const missed = await db.missedItem.create({
            data: {
              profileId: profile.id,
              itemType: "todo",
              itemId: todo.id,
              itemTitle: todo.title,
              scheduledTime: todo.dueDate,
              dayOfWeek: now.getDay(),
              hourOfDay: now.getHours(),
            },
          });
          missedItems.push(missed);
        }
      }
    }

    return c.json({
      missedItems: missedItems.map(m => ({
        ...m,
        scheduledTime: m.scheduledTime?.toISOString(),
        detectedAt: m.detectedAt.toISOString(),
        respondedAt: m.respondedAt?.toISOString(),
        followUpSentAt: m.followUpSentAt?.toISOString(),
        createdAt: m.createdAt.toISOString(),
      })),
      count: missedItems.length,
    });
  })

  // Get today's missed items for user
  .get("/missed-items/today", async (c) => {
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
    today.setHours(0, 0, 0, 0);

    const missedItems = await db.missedItem.findMany({
      where: {
        profileId: profile.id,
        detectedAt: { gte: today },
      },
      orderBy: { detectedAt: "desc" },
    });

    return c.json({
      missedItems: missedItems.map(m => ({
        ...m,
        scheduledTime: m.scheduledTime?.toISOString(),
        detectedAt: m.detectedAt.toISOString(),
        respondedAt: m.respondedAt?.toISOString(),
        followUpSentAt: m.followUpSentAt?.toISOString(),
        createdAt: m.createdAt.toISOString(),
      })),
    });
  })

  // Record user's response to missed item
  .post("/missed-items/:id/respond", zValidator("json", respondToMissedItemSchema), async (c) => {
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

    const missedItemId = c.req.param("id");
    const data = c.req.valid("json");

    const missedItem = await db.missedItem.findFirst({
      where: {
        id: missedItemId,
        profileId: profile.id,
      },
    });

    if (!missedItem) {
      return c.json({ error: "Missed item not found" }, 404);
    }

    // Update missed item with response
    const updated = await db.missedItem.update({
      where: { id: missedItemId },
      data: {
        responded: true,
        responseType: data.responseType,
        responseNote: data.responseNote,
        respondedAt: new Date(),
      },
    });

    // Update skip pattern
    await updateSkipPattern(profile.id, missedItem, data.responseType, data.responseNote);

    return c.json({
      missedItem: {
        ...updated,
        scheduledTime: updated.scheduledTime?.toISOString(),
        detectedAt: updated.detectedAt.toISOString(),
        respondedAt: updated.respondedAt?.toISOString(),
        followUpSentAt: updated.followUpSentAt?.toISOString(),
        createdAt: updated.createdAt.toISOString(),
      },
    });
  })

  // =================================
  // SKIP PATTERN ANALYSIS
  // =================================

  // Get skip patterns for a specific item
  .get("/patterns/:itemType/:itemId", async (c) => {
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

    const itemType = c.req.param("itemType");
    const itemId = c.req.param("itemId");

    if (itemType !== "habit" && itemType !== "todo") {
      return c.json({ error: "Invalid item type" }, 400);
    }

    const pattern = await db.skipPattern.findUnique({
      where: {
        profileId_itemType_itemId: {
          profileId: profile.id,
          itemType,
          itemId,
        },
      },
    });

    if (!pattern) {
      return c.json({ pattern: null });
    }

    return c.json({
      pattern: {
        ...pattern,
        lastUpdated: pattern.lastUpdated.toISOString(),
        createdAt: pattern.createdAt.toISOString(),
      },
    });
  })

  // Get all patterns for user (to show insights)
  .get("/patterns", async (c) => {
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

    const patterns = await db.skipPattern.findMany({
      where: {
        profileId: profile.id,
        skipRate: { gt: 0.3 }, // Only show patterns with >30% skip rate
      },
      orderBy: { skipRate: "desc" },
    });

    return c.json({
      patterns: patterns.map(p => ({
        ...p,
        lastUpdated: p.lastUpdated.toISOString(),
        createdAt: p.createdAt.toISOString(),
      })),
    });
  })

  // =================================
  // ADAPTIVE NOTIFICATIONS
  // =================================

  // Get pending adaptive notifications
  .get("/notifications/pending", async (c) => {
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

    const notifications = await db.adaptiveNotification.findMany({
      where: {
        profileId: profile.id,
        scheduledFor: { lte: now },
        sentAt: null,
      },
      orderBy: { scheduledFor: "asc" },
      take: 10,
    });

    return c.json({
      notifications: notifications.map(n => ({
        ...n,
        scheduledFor: n.scheduledFor.toISOString(),
        sentAt: n.sentAt?.toISOString(),
        openedAt: n.openedAt?.toISOString(),
        actionTakenAt: n.actionTakenAt?.toISOString(),
        createdAt: n.createdAt.toISOString(),
      })),
    });
  })

  // Mark notification as sent
  .post("/notifications/:id/sent", async (c) => {
    const notificationId = c.req.param("id");

    const notification = await db.adaptiveNotification.update({
      where: { id: notificationId },
      data: { sentAt: new Date() },
    });

    return c.json({
      notification: {
        ...notification,
        scheduledFor: notification.scheduledFor.toISOString(),
        sentAt: notification.sentAt?.toISOString(),
        openedAt: notification.openedAt?.toISOString(),
        actionTakenAt: notification.actionTakenAt?.toISOString(),
        createdAt: notification.createdAt.toISOString(),
      },
    });
  })

  // Mark notification as opened
  .post("/notifications/:id/opened", async (c) => {
    const notificationId = c.req.param("id");

    const notification = await db.adaptiveNotification.update({
      where: { id: notificationId },
      data: {
        opened: true,
        openedAt: new Date(),
      },
    });

    return c.json({
      notification: {
        ...notification,
        scheduledFor: notification.scheduledFor.toISOString(),
        sentAt: notification.sentAt?.toISOString(),
        openedAt: notification.openedAt?.toISOString(),
        actionTakenAt: notification.actionTakenAt?.toISOString(),
        createdAt: notification.createdAt.toISOString(),
      },
    });
  })

  // Record action taken on notification
  .post("/notifications/:id/action", zValidator("json", z.object({
    actionTaken: z.string(),
    wasHelpful: z.boolean().optional(),
  })), async (c) => {
    const notificationId = c.req.param("id");
    const data = c.req.valid("json");

    const notification = await db.adaptiveNotification.update({
      where: { id: notificationId },
      data: {
        actionTaken: data.actionTaken,
        actionTakenAt: new Date(),
        wasHelpful: data.wasHelpful,
      },
    });

    return c.json({
      notification: {
        ...notification,
        scheduledFor: notification.scheduledFor.toISOString(),
        sentAt: notification.sentAt?.toISOString(),
        openedAt: notification.openedAt?.toISOString(),
        actionTakenAt: notification.actionTakenAt?.toISOString(),
        createdAt: notification.createdAt.toISOString(),
      },
    });
  });

// =================================
// HELPER FUNCTIONS
// =================================

async function updateSkipPattern(
  profileId: number,
  missedItem: any,
  responseType: string,
  responseNote?: string
) {
  const pattern = await db.skipPattern.findUnique({
    where: {
      profileId_itemType_itemId: {
        profileId,
        itemType: missedItem.itemType,
        itemId: missedItem.itemId,
      },
    },
  });

  // Parse reason from response note if available
  let skipReasons: Record<string, number> = {};
  if (pattern?.skipReasons) {
    try {
      skipReasons = JSON.parse(pattern.skipReasons);
    } catch (e) {
      skipReasons = {};
    }
  }

  // Infer reason from response type and note
  let reason = "unknown";
  if (responseType === "completed_late") {
    reason = "forgot";
  } else if (responseNote) {
    const note = responseNote.toLowerCase();
    if (note.includes("tired") || note.includes("exhausted")) reason = "too_tired";
    else if (note.includes("time") || note.includes("busy")) reason = "no_time";
    else if (note.includes("forgot")) reason = "forgot";
    else if (note.includes("not feeling") || note.includes("unwell")) reason = "not_feeling_well";
    else reason = "other";
  }

  skipReasons[reason] = (skipReasons[reason] || 0) + 1;

  if (pattern) {
    // Update existing pattern
    const totalMisses = pattern.totalMisses + 1;
    const totalScheduled = pattern.totalScheduled + 1;
    const skipRate = totalMisses / totalScheduled;

    // Aggregate skip days
    let commonSkipDays: number[] = [];
    if (pattern.commonSkipDays) {
      try {
        commonSkipDays = JSON.parse(pattern.commonSkipDays);
      } catch (e) {
        commonSkipDays = [];
      }
    }
    commonSkipDays.push(missedItem.dayOfWeek);

    // Aggregate skip hours
    let commonSkipHours: number[] = [];
    if (pattern.commonSkipHours) {
      try {
        commonSkipHours = JSON.parse(pattern.commonSkipHours);
      } catch (e) {
        commonSkipHours = [];
      }
    }
    commonSkipHours.push(missedItem.hourOfDay);

    // Generate suggestions if skip rate is high
    let suggestedTime = pattern.suggestedTime;
    let suggestedDays = pattern.suggestedDays;
    let confidenceScore = pattern.confidenceScore;

    if (skipRate > 0.3 && totalMisses >= 3) {
      // Suggest different time if consistently skipping at certain hours
      const hourCounts = commonSkipHours.reduce((acc, h) => {
        acc[h] = (acc[h] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      const mostSkippedHour = Object.entries(hourCounts)
        .sort(([, a], [, b]) => b - a)[0];

      if (mostSkippedHour && mostSkippedHour[1] >= totalMisses * 0.5) {
        // If skipping > 50% of the time at this hour, suggest different time
        const newHour = (parseInt(mostSkippedHour[0]) + 2) % 24;
        suggestedTime = `${String(newHour).padStart(2, '0')}:00`;
        confidenceScore = 0.7;
      }

      // Suggest different days if consistently skipping on certain days
      const dayCounts = commonSkipDays.reduce((acc, d) => {
        acc[d] = (acc[d] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);

      const problematicDays = Object.entries(dayCounts)
        .filter(([, count]) => count >= totalMisses * 0.4)
        .map(([day]) => parseInt(day));

      if (problematicDays.length > 0) {
        const allDays = [0, 1, 2, 3, 4, 5, 6];
        const betterDays = allDays.filter(d => !problematicDays.includes(d));
        suggestedDays = JSON.stringify(betterDays);
        confidenceScore = Math.max(confidenceScore, 0.6);
      }
    }

    await db.skipPattern.update({
      where: { id: pattern.id },
      data: {
        totalMisses,
        totalScheduled,
        skipRate,
        commonSkipDays: JSON.stringify(commonSkipDays),
        commonSkipHours: JSON.stringify(commonSkipHours),
        skipReasons: JSON.stringify(skipReasons),
        suggestedTime,
        suggestedDays,
        confidenceScore,
        lastUpdated: new Date(),
      },
    });
  } else {
    // Create new pattern
    await db.skipPattern.create({
      data: {
        profileId,
        itemType: missedItem.itemType,
        itemId: missedItem.itemId,
        totalMisses: 1,
        totalScheduled: 1,
        skipRate: 1.0,
        commonSkipDays: JSON.stringify([missedItem.dayOfWeek]),
        commonSkipHours: JSON.stringify([missedItem.hourOfDay]),
        skipReasons: JSON.stringify(skipReasons),
      },
    });
  }
}

export default adaptiveRouter;
