import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import type { AppType } from "../index";
import { db } from "../db";
import {
  createWorkScheduleRequestSchema,
  createMorningRoutineRequestSchema,
  completeMorningRoutineRequestSchema,
  getTravelTimeRequestSchema,
} from "../../../shared/contracts";

const scheduleRouter = new Hono<AppType>();

// ==================== WORK SCHEDULES ====================

// GET /api/schedule/work - Get all work schedules
scheduleRouter.get("/work", async (c) => {
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

  const schedules = await db.workSchedule.findMany({
    where: { profileId: profile.id },
    orderBy: { dayOfWeek: "asc" },
  });

  return c.json({
    schedules: schedules.map((s) => ({
      ...s,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    })),
  });
});

// POST /api/schedule/work - Create work schedule
scheduleRouter.post(
  "/work",
  zValidator("json", createWorkScheduleRequestSchema),
  async (c) => {
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

    // Check if schedule already exists for this day
    const existing = await db.workSchedule.findFirst({
      where: {
        profileId: profile.id,
        dayOfWeek: data.dayOfWeek,
      },
    });

    if (existing) {
      // Update existing schedule
      const updated = await db.workSchedule.update({
        where: { id: existing.id },
        data: {
          startTime: data.startTime,
          endTime: data.endTime || existing.endTime,
          workLocationName: data.workLocationName,
          workLatitude: data.workLatitude,
          workLongitude: data.workLongitude,
          workAddress: data.workAddress,
          homeLatitude: data.homeLatitude,
          homeLongitude: data.homeLongitude,
          homeAddress: data.homeAddress,
          prepTimeMinutes: data.prepTimeMinutes,
        },
      });

      return c.json({
        schedule: {
          ...updated,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
        },
      });
    }

    // Create new schedule
    const schedule = await db.workSchedule.create({
      data: {
        profileId: profile.id,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime || "17:00",
        workLocationName: data.workLocationName,
        workLatitude: data.workLatitude,
        workLongitude: data.workLongitude,
        workAddress: data.workAddress,
        homeLatitude: data.homeLatitude,
        homeLongitude: data.homeLongitude,
        homeAddress: data.homeAddress,
        prepTimeMinutes: data.prepTimeMinutes,
      },
    });

    return c.json({
      schedule: {
        ...schedule,
        createdAt: schedule.createdAt.toISOString(),
        updatedAt: schedule.updatedAt.toISOString(),
      },
    });
  }
);

// DELETE /api/schedule/work/:id - Delete work schedule
scheduleRouter.delete("/work/:id", async (c) => {
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

  const scheduleId = c.req.param("id");

  const existing = await db.workSchedule.findFirst({
    where: { id: scheduleId, profileId: profile.id },
  });

  if (!existing) {
    return c.json({ error: "Schedule not found" }, 404);
  }

  await db.workSchedule.delete({
    where: { id: scheduleId },
  });

  return c.json({ success: true });
});

// ==================== TRAVEL TIME ====================

// POST /api/schedule/travel-time - Calculate travel time
scheduleRouter.post(
  "/travel-time",
  zValidator("json", getTravelTimeRequestSchema),
  async (c) => {
    const data = c.req.valid("json");

    // Calculate distance using Haversine formula
    const R = 6371; // Earth's radius in km
    const dLat = ((data.toLatitude - data.fromLatitude) * Math.PI) / 180;
    const dLon = ((data.toLongitude - data.fromLongitude) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((data.fromLatitude * Math.PI) / 180) *
        Math.cos((data.toLatitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c_dist = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c_dist; // Distance in km

    // Estimate travel time (average speed 50 km/h in city, 80 km/h highway)
    const avgSpeed = distance > 20 ? 70 : 45; // km/h
    const estimatedMinutes = Math.round((distance / avgSpeed) * 60);

    // Add traffic factor (10-30% extra time)
    const hour = new Date().getHours();
    let trafficFactor = 1.1; // Light traffic
    if ((hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 18)) {
      trafficFactor = 1.3; // Rush hour
    } else if (hour >= 12 && hour <= 14) {
      trafficFactor = 1.15; // Lunch hour
    }

    const withTrafficMinutes = Math.round(estimatedMinutes * trafficFactor);

    return c.json({
      estimatedMinutes: withTrafficMinutes,
      distance: Math.round(distance * 10) / 10,
      withTraffic: trafficFactor > 1.1,
    });
  }
);

// ==================== MORNING ROUTINES ====================

// GET /api/schedule/routines - Get all morning routines
scheduleRouter.get("/routines", async (c) => {
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

  const routines = await db.morningRoutine.findMany({
    where: { profileId: profile.id },
    orderBy: { order: "asc" },
  });

  // Check if completed today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const completions = await db.morningRoutineCompletion.findMany({
    where: {
      profileId: profile.id,
      completedAt: {
        gte: today,
      },
    },
  });

  const completionMap = new Map(completions.map((c) => [c.routineId, true]));

  return c.json({
    routines: routines.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      completedToday: completionMap.has(r.id),
    })),
  });
});

// POST /api/schedule/routines - Create morning routine
scheduleRouter.post(
  "/routines",
  zValidator("json", createMorningRoutineRequestSchema),
  async (c) => {
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

    // Get max order
    const maxOrder = await db.morningRoutine.findFirst({
      where: { profileId: profile.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const routine = await db.morningRoutine.create({
      data: {
        profileId: profile.id,
        title: data.title,
        description: data.description,
        order: data.order ?? (maxOrder?.order ?? -1) + 1,
        durationMinutes: data.durationMinutes,
        isRequired: data.isRequired,
        category: data.category,
        linkedHabitId: data.linkedHabitId,
      },
    });

    return c.json({
      routine: {
        ...routine,
        createdAt: routine.createdAt.toISOString(),
        updatedAt: routine.updatedAt.toISOString(),
        completedToday: false,
      },
    });
  }
);

// POST /api/schedule/routines/:id/complete - Complete morning routine
scheduleRouter.post(
  "/routines/:id/complete",
  zValidator("json", completeMorningRoutineRequestSchema),
  async (c) => {
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

    const routineId = c.req.param("id");
    const data = c.req.valid("json");

    // Verify routine belongs to user
    const routine = await db.morningRoutine.findFirst({
      where: { id: routineId, profileId: profile.id },
    });

    if (!routine) {
      return c.json({ error: "Routine not found" }, 404);
    }

    // Check if already completed today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const existingCompletion = await db.morningRoutineCompletion.findFirst({
      where: {
        routineId,
        profileId: profile.id,
        completedAt: {
          gte: today,
        },
      },
    });

    if (existingCompletion) {
      return c.json({
        completion: {
          ...existingCompletion,
          completedAt: existingCompletion.completedAt.toISOString(),
        },
      });
    }

    // Create completion
    const completion = await db.morningRoutineCompletion.create({
      data: {
        routineId,
        profileId: profile.id,
        skipped: data.skipped,
        note: data.note,
      },
    });

    return c.json({
      completion: {
        ...completion,
        completedAt: completion.completedAt.toISOString(),
      },
    });
  }
);

// DELETE /api/schedule/routines/:id - Delete morning routine
scheduleRouter.delete("/routines/:id", async (c) => {
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

  const routineId = c.req.param("id");

  const routine = await db.morningRoutine.findFirst({
    where: { id: routineId, profileId: profile.id },
  });

  if (!routine) {
    return c.json({ error: "Routine not found" }, 404);
  }

  await db.morningRoutine.delete({
    where: { id: routineId },
  });

  return c.json({ success: true });
});

// ==================== MORNING BRIEFING ====================

// GET /api/schedule/morning-briefing - Get intelligent morning briefing
scheduleRouter.get("/morning-briefing", async (c) => {
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
  const dayOfWeek = now.getDay();
  const currentHour = now.getHours();

  // Get today's work schedule
  const workSchedule = await db.workSchedule.findFirst({
    where: {
      profileId: profile.id,
      dayOfWeek,
      isActive: true,
    },
  });

  let greeting = "Good morning";
  if (currentHour >= 12 && currentHour < 17) greeting = "Good afternoon";
  else if (currentHour >= 17) greeting = "Good evening";

  // Get morning routines
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const routines = await db.morningRoutine.findMany({
    where: { profileId: profile.id },
    orderBy: { order: "asc" },
  });

  const completions = await db.morningRoutineCompletion.findMany({
    where: {
      profileId: profile.id,
      completedAt: { gte: today },
    },
  });

  const completionMap = new Map(completions.map((c) => [c.routineId, true]));

  const routinesWithStatus = routines.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    completedToday: completionMap.has(r.id),
  }));

  let travelTime = null;
  let totalPrepTime = 0;
  let suggestedWakeTime = null;

  if (workSchedule) {
    // Calculate travel time
    const R = 6371;
    const dLat =
      ((workSchedule.workLatitude - workSchedule.homeLatitude) * Math.PI) / 180;
    const dLon =
      ((workSchedule.workLongitude - workSchedule.homeLongitude) * Math.PI) /
      180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((workSchedule.homeLatitude * Math.PI) / 180) *
        Math.cos((workSchedule.workLatitude * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c_dist = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c_dist;
    const avgSpeed = distance > 20 ? 70 : 45;
    const baseMinutes = Math.round((distance / avgSpeed) * 60);

    // Traffic factor
    const workHour = parseInt(workSchedule.startTime.split(":")[0]!);
    let trafficFactor = 1.1;
    if (workHour >= 7 && workHour <= 9) trafficFactor = 1.3;

    const estimatedMinutes = Math.round(baseMinutes * trafficFactor);

    // Calculate departure time
    const [workHours, workMinutes] = workSchedule.startTime.split(":").map(Number);
    const workStart = new Date(now);
    workStart.setHours(workHours ?? 0, workMinutes ?? 0, 0, 0);

    const departTime = new Date(workStart.getTime() - estimatedMinutes * 60000);
    const arrivalTime = workStart;

    travelTime = {
      estimatedMinutes,
      departureTime: departTime.toISOString(),
      arrivalTime: arrivalTime.toISOString(),
      trafficStatus:
        trafficFactor >= 1.25 ? "heavy" : trafficFactor >= 1.15 ? "moderate" : "light",
    };

    // Calculate total prep time
    const routineTime = routines.reduce((sum, r) => sum + r.durationMinutes, 0);
    totalPrepTime = routineTime + estimatedMinutes;

    // Suggested wake time
    const wakeTime = new Date(
      departTime.getTime() - routineTime * 60000 - 15 * 60000
    ); // 15 min buffer
    suggestedWakeTime = wakeTime.toISOString();
  }

  // Get today's habits
  const habits = await db.habit.findMany({
    where: { profileId: profile.id, archived: false },
    take: 5,
  });

  // Build message
  let message = `${greeting}! `;
  if (workSchedule) {
    const minutesUntilDepart = travelTime
      ? Math.round(
          (new Date(travelTime.departureTime).getTime() - now.getTime()) / 60000
        )
      : 0;

    if (minutesUntilDepart > 60) {
      message += `You have ${Math.floor(minutesUntilDepart / 60)} hours and ${minutesUntilDepart % 60} minutes until you need to leave for work.`;
    } else if (minutesUntilDepart > 0) {
      message += `You need to leave for work in ${minutesUntilDepart} minutes.`;
    } else if (minutesUntilDepart < 0 && minutesUntilDepart > -60) {
      message += `You should have left ${Math.abs(minutesUntilDepart)} minutes ago!`;
    }

    const incompleteRoutines = routinesWithStatus.filter((r) => !r.completedToday);
    if (incompleteRoutines.length > 0) {
      message += ` You have ${incompleteRoutines.length} morning routine${incompleteRoutines.length > 1 ? "s" : ""} to complete.`;
    }
  } else {
    message += "Ready to tackle your focus blocks?";
  }

  return c.json({
    greeting,
    workSchedule: workSchedule
      ? {
          ...workSchedule,
          createdAt: workSchedule.createdAt.toISOString(),
          updatedAt: workSchedule.updatedAt.toISOString(),
        }
      : null,
    travelTime,
    morningRoutines: routinesWithStatus,
    totalPrepTime,
    suggestedWakeTime,
    habits: habits.map((h) => ({
      id: h.id,
      title: h.title,
      color: h.color,
    })),
    focusSessions: 0,
    message,
  });
});

export default scheduleRouter;
