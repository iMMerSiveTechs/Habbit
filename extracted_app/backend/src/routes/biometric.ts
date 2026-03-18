import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import type { AppType } from "../index";
import { z } from "zod";

const biometricSchema = z.object({
  hrv: z.number().min(0).max(300).optional(),
  restingHR: z.number().min(20).max(250).optional(),
  sleepScore: z.number().min(0).max(100).optional(),
  sleepHours: z.number().min(0).max(24).optional(),
  deepSleep: z.number().min(0).max(24).optional(),
  remSleep: z.number().min(0).max(24).optional(),
  stressLevel: z.number().min(0).max(100).optional(),
  energyLevel: z.number().min(0).max(100).optional(),
  activityMins: z.number().min(0).max(1440).optional(),
  steps: z.number().min(0).max(200000).optional(),
  source: z.string().max(50).optional(),
});

const biometricRouter = new Hono<AppType>()
  // Submit biometric data
  .post("/", zValidator("json", biometricSchema), async (c) => {
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

    const biometric = await db.biometricData.create({
      data: {
        profileId: profile.id,
        hrv: data.hrv || null,
        restingHR: data.restingHR || null,
        sleepScore: data.sleepScore || null,
        sleepHours: data.sleepHours || null,
        deepSleep: data.deepSleep || null,
        remSleep: data.remSleep || null,
        stressLevel: data.stressLevel || null,
        energyLevel: data.energyLevel || null,
        activityMins: data.activityMins || null,
        steps: data.steps || null,
        source: data.source || "manual",
      },
    });

    return c.json({ biometric });
  })

  // Get latest biometric data
  .get("/latest", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ biometric: null });
    }

    const biometric = await db.biometricData.findFirst({
      where: { profileId: profile.id },
      orderBy: { timestamp: "desc" },
    });

    return c.json({ biometric });
  })

  // Get biometric trends
  .get("/trends", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const days = parseInt(c.req.query("days") || "7");

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ trends: [] });
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const data = await db.biometricData.findMany({
      where: {
        profileId: profile.id,
        timestamp: { gte: cutoff },
      },
      orderBy: { timestamp: "asc" },
    });

    // Calculate averages
    const avgHRV = data.filter(d => d.hrv).reduce((sum, d) => sum + (d.hrv || 0), 0) / data.filter(d => d.hrv).length || 0;
    const avgSleepScore = data.filter(d => d.sleepScore).reduce((sum, d) => sum + (d.sleepScore || 0), 0) / data.filter(d => d.sleepScore).length || 0;
    const avgStress = data.filter(d => d.stressLevel).reduce((sum, d) => sum + (d.stressLevel || 0), 0) / data.filter(d => d.stressLevel).length || 0;

    return c.json({
      trends: data,
      averages: {
        hrv: Math.round(avgHRV),
        sleepScore: Math.round(avgSleepScore),
        stressLevel: Math.round(avgStress * 10) / 10,
      },
    });
  })

  // Get energy prediction for today
  .get("/prediction", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ prediction: null });
    }

    // Check subscription tier
    if (profile.subscriptionTier !== "elite") {
      return c.json({ error: "Energy prediction requires Elite subscription" }, 403);
    }

    // Get recent biometric data
    const recent = await db.biometricData.findMany({
      where: { profileId: profile.id },
      orderBy: { timestamp: "desc" },
      take: 7,
    });

    // Simple prediction based on recent patterns
    const prediction = generateEnergyPrediction(recent);

    return c.json({ prediction });
  });

function generateEnergyPrediction(recentData: any[]) {
  const now = new Date();
  const hour = now.getHours();

  // Base prediction on typical circadian rhythm
  const baseEnergy = {
    0: 2, 1: 1, 2: 1, 3: 1, 4: 2, 5: 3,
    6: 4, 7: 5, 8: 5, 9: 5, 10: 4, 11: 4,
    12: 3, 13: 3, 14: 3, 15: 4, 16: 4, 17: 4,
    18: 3, 19: 3, 20: 2, 21: 2, 22: 2, 23: 2,
  };

  // Adjust based on recent sleep and stress
  const avgSleep = recentData.filter(d => d.sleepHours).reduce((sum, d) => sum + (d.sleepHours || 0), 0) / recentData.filter(d => d.sleepHours).length || 7;
  const avgStress = recentData.filter(d => d.stressLevel).reduce((sum, d) => sum + (d.stressLevel || 0), 0) / recentData.filter(d => d.stressLevel).length || 3;

  const sleepModifier = avgSleep >= 7 ? 0.2 : -0.3;
  const stressModifier = avgStress <= 2 ? 0.1 : -0.2;

  const blocks = [];
  for (let h = hour; h < 24; h++) {
    const baseScore = baseEnergy[h as keyof typeof baseEnergy] || 3;
    const adjusted = Math.max(1, Math.min(5, baseScore + sleepModifier + stressModifier));

    blocks.push({
      hour: h,
      time: `${h}:00`,
      energy: Math.round(adjusted * 10) / 10,
      recommendation: adjusted >= 4 ? "Ideal for focused work" : adjusted <= 2 ? "Rest or light tasks" : "Moderate tasks",
    });
  }

  return {
    date: now.toISOString(),
    blocks,
    peakHour: blocks.reduce((max, b) => b.energy > (max?.energy ?? -Infinity) ? b : max!, blocks[0])!,
    lowHour: blocks.reduce((min, b) => b.energy < (min?.energy ?? Infinity) ? b : min!, blocks[0])!,
  };
}

export default biometricRouter;
