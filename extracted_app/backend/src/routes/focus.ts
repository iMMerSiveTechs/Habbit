import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import type { AppType } from "../index";
import { z } from "zod";
import {
  startFocusSessionRequestSchema,
  endFocusSessionRequestSchema,
} from "../../../shared/contracts";

// Enhanced schema for rich focus sessions
const startRichFocusSessionSchema = z.object({
  task: z.string(),
  sessionType: z.enum(["creative", "coding", "planning", "design", "maintenance", "learning"]).optional(),
  mood: z.enum(["energized", "focused", "inspired", "in_flow", "calm", "determined"]).optional(),
  energyLevel: z.number().min(1).max(5).optional(),
  goalDescription: z.string().optional(),
  linkedHabitId: z.string().optional(),
  linkedTodoId: z.string().optional(),
  locationName: z.string().optional(),
  locationLat: z.number().optional(),
  locationLon: z.number().optional(),
});

const endRichFocusSessionSchema = z.object({
  id: z.string(),
  completed: z.boolean().optional(),
  productivity: z.number().min(1).max(5).optional(),
  notes: z.string().optional(),
  distractions: z.number().optional(),
  inFlowState: z.boolean().optional(),
});

const focusRouter = new Hono<AppType>()
  // Get active focus session
  .get("/active", async (c) => {
    const user = c.get("user");

    // Allow unauthenticated access
    if (!user) {
      return c.json({ session: null });
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ session: null });
    }

    const session = await db.focusSession.findFirst({
      where: {
        profileId: profile.id,
        endTime: null,
      },
      orderBy: { startTime: "desc" },
    });

    if (!session) {
      return c.json({ session: null });
    }

    return c.json({
      session: {
        id: session.id,
        startTime: session.startTime.toISOString(),
        endTime: session.endTime?.toISOString() || null,
        duration: session.duration,
        task: session.task,
        completed: session.completed,
        interrupted: session.interrupted,
      },
    });
  })

  // Start focus session
  .post("/start", zValidator("json", startFocusSessionRequestSchema), async (c) => {
    const user = c.get("user");

    // Allow unauthenticated access with demo response
    if (!user) {
      return c.json({
        session: {
          id: "demo-session",
          startTime: new Date().toISOString(),
          endTime: null,
          duration: null,
          task: "Focus Session",
          completed: false,
          interrupted: false,
        },
      });
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const data = c.req.valid("json");

    // End any active sessions first
    await db.focusSession.updateMany({
      where: {
        profileId: profile.id,
        endTime: null,
      },
      data: {
        endTime: new Date(),
        interrupted: true,
      },
    });

    const session = await db.focusSession.create({
      data: {
        profileId: profile.id,
        startTime: new Date(),
        task: data.task,
      },
    });

    return c.json({
      session: {
        id: session.id,
        startTime: session.startTime.toISOString(),
        endTime: null,
        duration: null,
        task: session.task,
        completed: false,
        interrupted: false,
      },
    });
  })

  // End focus session
  .post("/end", zValidator("json", endFocusSessionRequestSchema), async (c) => {
    const user = c.get("user");

    // Allow unauthenticated access
    if (!user) {
      return c.json({
        session: {
          id: "demo-session",
          startTime: new Date().toISOString(),
          endTime: new Date().toISOString(),
          duration: 1500,
          task: "Focus Session",
          completed: true,
          interrupted: false,
        },
      });
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const data = c.req.valid("json");

    const session = await db.focusSession.findFirst({
      where: {
        id: data.id,
        profileId: profile.id,
      },
    });

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);

    const updated = await db.focusSession.update({
      where: { id: session.id },
      data: {
        endTime,
        duration,
        completed: data.completed,
      },
    });

    return c.json({
      session: {
        id: updated.id,
        startTime: updated.startTime.toISOString(),
        endTime: updated.endTime!.toISOString(),
        duration: updated.duration,
        task: updated.task,
        completed: updated.completed,
        interrupted: updated.interrupted,
      },
    });
  })

  // Get recent sessions
  .get("/recent", async (c) => {
    const user = c.get("user");

    // Allow unauthenticated access with demo data
    if (!user) {
      return c.json({
        sessions: [
          {
            id: "demo-1",
            startTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            endTime: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
            duration: 1800,
            task: "Deep Work Session",
            completed: true,
            interrupted: false,
          },
          {
            id: "demo-2",
            startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            endTime: new Date(Date.now() - 23.5 * 60 * 60 * 1000).toISOString(),
            duration: 1500,
            task: "Morning Planning",
            completed: true,
            interrupted: false,
          },
          {
            id: "demo-3",
            startTime: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
            endTime: new Date(Date.now() - 47 * 60 * 60 * 1000).toISOString(),
            duration: 2400,
            task: "Creative Work",
            completed: true,
            interrupted: false,
          },
        ],
      });
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ sessions: [] });
    }

    const sessions = await db.focusSession.findMany({
      where: { profileId: profile.id },
      orderBy: { startTime: "desc" },
      take: 20,
    });

    return c.json({
      sessions: sessions.map((s) => ({
        id: s.id,
        startTime: s.startTime.toISOString(),
        endTime: s.endTime?.toISOString() || null,
        duration: s.duration,
        task: s.task,
        completed: s.completed,
        interrupted: s.interrupted,
        sessionType: s.sessionType,
        mood: s.mood,
        energyLevel: s.energyLevel,
        goalDescription: s.goalDescription,
        linkedHabitId: s.linkedHabitId,
        linkedTodoId: s.linkedTodoId,
        productivity: s.productivity,
        inFlowState: s.inFlowState,
        notes: s.notes,
      })),
    });
  })

  // Start rich focus session with full context
  .post("/start-rich", zValidator("json", startRichFocusSessionSchema), async (c) => {
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

    // End any active sessions first
    await db.focusSession.updateMany({
      where: {
        profileId: profile.id,
        endTime: null,
      },
      data: {
        endTime: new Date(),
        interrupted: true,
      },
    });

    const session = await db.focusSession.create({
      data: {
        profileId: profile.id,
        startTime: new Date(),
        task: data.task,
        sessionType: data.sessionType,
        mood: data.mood,
        energyLevel: data.energyLevel,
        goalDescription: data.goalDescription,
        linkedHabitId: data.linkedHabitId,
        linkedTodoId: data.linkedTodoId,
        locationName: data.locationName,
        locationLat: data.locationLat,
        locationLon: data.locationLon,
      },
    });

    return c.json({
      session: {
        id: session.id,
        startTime: session.startTime.toISOString(),
        endTime: null,
        duration: null,
        task: session.task,
        completed: false,
        interrupted: false,
        sessionType: session.sessionType,
        mood: session.mood,
        energyLevel: session.energyLevel,
        goalDescription: session.goalDescription,
        linkedHabitId: session.linkedHabitId,
        linkedTodoId: session.linkedTodoId,
      },
    });
  })

  // End rich focus session with reflection
  .post("/end-rich", zValidator("json", endRichFocusSessionSchema), async (c) => {
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

    const session = await db.focusSession.findFirst({
      where: {
        id: data.id,
        profileId: profile.id,
      },
    });

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - session.startTime.getTime()) / 1000);

    const updated = await db.focusSession.update({
      where: { id: session.id },
      data: {
        endTime,
        duration,
        completed: data.completed !== undefined ? data.completed : true,
        productivity: data.productivity,
        notes: data.notes,
        distractions: data.distractions,
        inFlowState: data.inFlowState !== undefined ? data.inFlowState : false,
      },
    });

    return c.json({
      session: {
        id: updated.id,
        startTime: updated.startTime.toISOString(),
        endTime: updated.endTime!.toISOString(),
        duration: updated.duration,
        task: updated.task,
        completed: updated.completed,
        interrupted: updated.interrupted,
        sessionType: updated.sessionType,
        mood: updated.mood,
        energyLevel: updated.energyLevel,
        productivity: updated.productivity,
        notes: updated.notes,
        distractions: updated.distractions,
        inFlowState: updated.inFlowState,
      },
    });
  })

  // Get flow state analytics
  .get("/flow-analytics", async (c) => {
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

    // Get last 30 days of sessions
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const sessions = await db.focusSession.findMany({
      where: {
        profileId: profile.id,
        startTime: { gte: thirtyDaysAgo },
        endTime: { not: null },
      },
      orderBy: { startTime: "desc" },
    });

    // Calculate analytics
    const flowSessions = sessions.filter(s => s.inFlowState);
    const totalSessions = sessions.length;
    const flowRate = totalSessions > 0 ? (flowSessions.length / totalSessions) * 100 : 0;

    // Average session duration by type
    const durationByType: Record<string, { total: number; count: number }> = {};
    sessions.forEach(s => {
      if (s.sessionType && s.duration) {
        if (!durationByType[s.sessionType]) {
          durationByType[s.sessionType] = { total: 0, count: 0 };
        }
        durationByType[s.sessionType]!.total += s.duration;
        durationByType[s.sessionType]!.count += 1;
      }
    });

    const avgDurationByType = Object.entries(durationByType).map(([type, data]) => ({
      type,
      avgDuration: Math.floor(data.total / data.count),
    }));

    // Best time of day for flow
    const flowByHour: Record<number, number> = {};
    flowSessions.forEach(s => {
      const hour = new Date(s.startTime).getHours();
      flowByHour[hour] = (flowByHour[hour] || 0) + 1;
    });

    const bestFlowHour = Object.entries(flowByHour)
      .sort(([, a], [, b]) => b - a)[0];

    // Most productive session type
    const productivityByType: Record<string, { total: number; count: number }> = {};
    sessions.forEach(s => {
      if (s.sessionType && s.productivity) {
        if (!productivityByType[s.sessionType]) {
          productivityByType[s.sessionType] = { total: 0, count: 0 };
        }
        productivityByType[s.sessionType]!.total += s.productivity;
        productivityByType[s.sessionType]!.count += 1;
      }
    });

    const mostProductiveType = Object.entries(productivityByType)
      .map(([type, data]) => ({
        type,
        avgProductivity: data.total / data.count,
      }))
      .sort((a, b) => b.avgProductivity - a.avgProductivity)[0];

    return c.json({
      analytics: {
        totalSessions,
        flowSessions: flowSessions.length,
        flowRate: Math.round(flowRate),
        avgDurationByType,
        bestFlowHour: bestFlowHour ? {
          hour: parseInt(bestFlowHour[0]),
          count: bestFlowHour[1],
        } : null,
        mostProductiveType: mostProductiveType || null,
      },
    });
  });

export default focusRouter;
