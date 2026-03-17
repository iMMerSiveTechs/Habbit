import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import type { AppType } from "../index";
import { z } from "zod";

const createGeofenceSchema = z.object({
  name: z.string(),
  category: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  radius: z.number().default(100),
  linkedHabits: z.array(z.string()).optional(),
  linkedTodos: z.array(z.string()).optional(),
  onEnter: z.string().optional(),
  onExit: z.string().optional(),
  weatherConditions: z.array(z.enum(["sunny", "rainy", "cloudy", "snowy"])).optional(),
});

const createReminderSchema = z.object({
  geofenceId: z.string().optional(),
  title: z.string(),
  message: z.string(),
  triggerType: z.enum(["on_enter", "on_exit", "on_stay", "nearby"]),
  stayDuration: z.number().optional(),
  repeatType: z.enum(["always", "once", "daily", "weekdays"]).default("always"),
  isActive: z.boolean().optional(),
  linkedHabitId: z.string().optional(),
  linkedTodoId: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});

const recordVisitSchema = z.object({
  geofenceId: z.string(),
  arrivedAt: z.string().optional(),
  departedAt: z.string().optional(),
  moodBefore: z.number().optional(),
  moodAfter: z.number().optional(),
  productivity: z.number().optional(),
});

const locationRouter = new Hono<AppType>()
  // Create geofence
  .post("/geofences", zValidator("json", createGeofenceSchema), async (c) => {
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

    const geofence = await db.locationGeofence.create({
      data: {
        profileId: profile.id,
        name: data.name,
        category: data.category,
        latitude: data.latitude,
        longitude: data.longitude,
        radius: data.radius,
        linkedHabits: data.linkedHabits ? JSON.stringify(data.linkedHabits) : null,
        linkedTodos: data.linkedTodos ? JSON.stringify(data.linkedTodos) : null,
        onEnter: data.onEnter || null,
        onExit: data.onExit || null,
        weatherConditions: data.weatherConditions ? JSON.stringify(data.weatherConditions) : null,
      },
    });

    return c.json({ geofence });
  })

  // Get all geofences
  .get("/geofences", async (c) => {
    const user = c.get("user");

    // Allow unauthenticated access with demo data
    if (!user) {
      return c.json({
        geofences: [
          {
            id: "demo-home",
            name: "Home",
            category: "home",
            latitude: 37.7749,
            longitude: -122.4194,
            radius: 100,
            linkedHabits: [],
            onEnter: "Welcome home! Time to wind down.",
            onExit: "Have a great day!",
            isActive: true,
            visitCount: 0,
          },
          {
            id: "demo-gym",
            name: "Gym",
            category: "fitness",
            latitude: 37.7849,
            longitude: -122.4094,
            radius: 150,
            linkedHabits: [],
            onEnter: "Time to work out! 💪",
            onExit: "Great workout!",
            isActive: true,
            visitCount: 0,
          },
        ],
      });
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
      include: {
        geofences: {
          where: { isActive: true },
          orderBy: { visitCount: "desc" },
        },
      },
    });

    if (!profile) {
      return c.json({ geofences: [] });
    }

    return c.json({ geofences: profile.geofences });
  })

  // Record visit
  .post("/visits", zValidator("json", recordVisitSchema), async (c) => {
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

    // Update geofence visit count
    await db.locationGeofence.update({
      where: { id: data.geofenceId },
      data: {
        visitCount: { increment: 1 },
        lastVisit: new Date(),
      },
    });

    const visit = await db.locationVisit.create({
      data: {
        geofenceId: data.geofenceId,
        profileId: profile.id,
        arrivedAt: data.arrivedAt ? new Date(data.arrivedAt) : new Date(),
        departedAt: data.departedAt ? new Date(data.departedAt) : null,
        moodBefore: data.moodBefore || null,
        moodAfter: data.moodAfter || null,
        productivity: data.productivity || null,
      },
    });

    return c.json({ visit });
  })

  // Detect patterns
  .get("/patterns", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ patterns: [] });
    }

    // Get patterns sorted by confidence
    const patterns = await db.locationPattern.findMany({
      where: { profileId: profile.id },
      orderBy: { confidence: "desc" },
      take: 20,
    });

    // Filter to suggest only high-confidence unseen patterns
    const suggestions = patterns.filter((p) => p.confidence > 0.7 && !p.suggested);

    return c.json({ patterns, suggestions });
  })

  // Get mood map
  .get("/mood-map", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ moodMap: [] });
    }

    const moodMap = await db.locationMoodMap.findMany({
      where: { profileId: profile.id },
      orderBy: { avgMood: "desc" },
    });

    return c.json({ moodMap });
  })

  // Delete geofence
  .delete("/geofences/:id", async (c) => {
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

    const geofenceId = c.req.param("id");

    // Soft delete by setting isActive to false
    await db.locationGeofence.update({
      where: { id: geofenceId, profileId: profile.id },
      data: { isActive: false },
    });

    return c.json({ success: true });
  })

  // Update geofence
  .patch("/geofences/:id", zValidator("json", createGeofenceSchema.partial()), async (c) => {
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

    const geofenceId = c.req.param("id");
    const data = c.req.valid("json");

    const geofence = await db.locationGeofence.update({
      where: { id: geofenceId, profileId: profile.id },
      data: {
        name: data.name,
        category: data.category,
        latitude: data.latitude,
        longitude: data.longitude,
        radius: data.radius,
        linkedHabits: data.linkedHabits ? JSON.stringify(data.linkedHabits) : undefined,
        linkedTodos: data.linkedTodos ? JSON.stringify(data.linkedTodos) : undefined,
        onEnter: data.onEnter,
        onExit: data.onExit,
        weatherConditions: data.weatherConditions ? JSON.stringify(data.weatherConditions) : undefined,
      },
    });

    return c.json({ geofence });
  })

  // Get nearby insights (mock implementation - would use actual location in production)
  .get("/nearby", async (c) => {
    const lat = parseFloat(c.req.query("lat") || "0");
    const lng = parseFloat(c.req.query("lng") || "0");

    // In production, this would query a location database
    // For now, return mock insights
    const insights = [
      {
        type: "productivity",
        name: "City Library",
        distance: 0.5,
        rating: 4.8,
        insight: "87% of Habit users report high focus here",
      },
      {
        type: "wellness",
        name: "Central Park",
        distance: 1.2,
        rating: 4.9,
        insight: "Popular for morning meditation",
      },
    ];

    return c.json({ insights });
  })

  // Location Reminders
  .get("/reminders", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ reminders: [] });
    }

    const reminders = await db.locationReminder.findMany({
      where: { profileId: profile.id, isActive: true },
      orderBy: { createdAt: "desc" },
    });

    return c.json({ reminders });
  })

  .post("/reminders", zValidator("json", createReminderSchema), async (c) => {
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

    const reminder = await db.locationReminder.create({
      data: {
        profileId: profile.id,
        geofenceId: data.geofenceId || null,
        title: data.title,
        message: data.message,
        triggerType: data.triggerType,
        stayDuration: data.stayDuration || null,
        repeatType: data.repeatType,
        linkedHabitId: data.linkedHabitId || null,
        linkedTodoId: data.linkedTodoId || null,
        priority: data.priority,
      },
    });

    return c.json({ reminder });
  })

  .patch("/reminders/:id", zValidator("json", createReminderSchema.partial()), async (c) => {
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

    const reminderId = c.req.param("id");
    const data = c.req.valid("json");

    const reminder = await db.locationReminder.update({
      where: { id: reminderId, profileId: profile.id },
      data: {
        title: data.title,
        message: data.message,
        triggerType: data.triggerType,
        stayDuration: data.stayDuration,
        repeatType: data.repeatType,
        isActive: data.isActive,
        linkedHabitId: data.linkedHabitId,
        linkedTodoId: data.linkedTodoId,
        priority: data.priority,
      },
    });

    return c.json({ reminder });
  })

  .delete("/reminders/:id", async (c) => {
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

    const reminderId = c.req.param("id");

    await db.locationReminder.delete({
      where: { id: reminderId, profileId: profile.id },
    });

    return c.json({ success: true });
  })

  // Location Suggestions
  .get("/suggestions", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ suggestions: [] });
    }

    const suggestions = await db.locationSuggestion.findMany({
      where: {
        profileId: profile.id,
        dismissed: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } },
        ],
      },
      orderBy: { confidence: "desc" },
      take: 10,
    });

    return c.json({ suggestions });
  })

  .post("/suggestions/:id/dismiss", async (c) => {
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

    const suggestionId = c.req.param("id");

    const suggestion = await db.locationSuggestion.update({
      where: { id: suggestionId, profileId: profile.id },
      data: { dismissed: true },
    });

    return c.json({ suggestion });
  })

  .post("/suggestions/:id/accept", async (c) => {
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

    const suggestionId = c.req.param("id");
    const body = await c.req.json().catch(() => ({}));

    const suggestion = await db.locationSuggestion.findUnique({
      where: { id: suggestionId, profileId: profile.id },
    });

    if (!suggestion) {
      return c.json({ error: "Suggestion not found" }, 404);
    }

    // Create geofence from suggestion
    const geofence = await db.locationGeofence.create({
      data: {
        profileId: profile.id,
        name: body.name || suggestion.name,
        category: body.category || suggestion.category,
        latitude: suggestion.latitude,
        longitude: suggestion.longitude,
        radius: body.radius || 100,
      },
    });

    // Mark suggestion as accepted
    await db.locationSuggestion.update({
      where: { id: suggestionId },
      data: {
        accepted: true,
        createdGeofenceId: geofence.id,
      },
    });

    return c.json({ geofence, suggestion });
  })

  // Generate intelligent suggestions based on patterns
  .post("/suggestions/generate", async (c) => {
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

    // Get location patterns
    const patterns = await db.locationPattern.findMany({
      where: {
        profileId: profile.id,
        confidence: { gte: 0.7 },
        suggested: false,
      },
      orderBy: { frequency: "desc" },
      take: 5,
    });

    // Create suggestions from high-confidence patterns
    const suggestions = await Promise.all(
      patterns.map(async (pattern) => {
        const suggestion = await db.locationSuggestion.create({
          data: {
            profileId: profile.id,
            latitude: pattern.latitude,
            longitude: pattern.longitude,
            name: pattern.suggestedName || "Frequent Location",
            category: pattern.category || "productivity",
            reason: `You visit this location ${pattern.frequency} times. Would you like to set up reminders?`,
            confidence: pattern.confidence,
            basedOn: JSON.stringify({
              frequency: pattern.frequency,
              avgDuration: pattern.avgDuration,
              commonDays: pattern.commonDays,
              commonHours: pattern.commonHours,
            }),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          },
        });

        // Mark pattern as suggested
        await db.locationPattern.update({
          where: { id: pattern.id },
          data: { suggested: true },
        });

        return suggestion;
      })
    );

    return c.json({ suggestions, generated: suggestions.length });
  });

export default locationRouter;
