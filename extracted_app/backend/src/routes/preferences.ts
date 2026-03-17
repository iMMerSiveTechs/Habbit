import { Hono } from "hono";
import type { AppType } from "../index";
import { db } from "../db";
import {
  getUserPreferencesResponseSchema,
  updateUserPreferencesRequestSchema,
} from "../../../shared/contracts";

const app = new Hono<AppType>();

// GET /api/preferences - Get user's music taste preferences
app.get("/", async (c) => {
  const session = c.get("session");
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await db.profile.findUnique({
    where: { userId: session.userId },
  });

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  // Get or create preferences
  let prefs = await db.userPreference.findUnique({
    where: { profileId: profile.id },
  });

  if (!prefs) {
    prefs = await db.userPreference.create({
      data: { profileId: profile.id },
    });
  }

  return c.json({
    weightLyricism: prefs.weightLyricism,
    weightProduction: prefs.weightProduction,
    weightVocals: prefs.weightVocals,
    weightFlow: prefs.weightFlow,
    weightVibe: prefs.weightVibe,
    discoverySensitivity: prefs.discoverySensitivity,
  });
});

// PATCH /api/preferences - Update user's music taste preferences
app.patch("/", async (c) => {
  const session = c.get("session");
  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await db.profile.findUnique({
    where: { userId: session.userId },
  });

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  const body = await c.req.json();
  const data = updateUserPreferencesRequestSchema.parse(body);

  // Get or create preferences
  let prefs = await db.userPreference.findUnique({
    where: { profileId: profile.id },
  });

  if (!prefs) {
    prefs = await db.userPreference.create({
      data: { profileId: profile.id },
    });
  }

  // Update preferences
  const updated = await db.userPreference.update({
    where: { profileId: profile.id },
    data,
  });

  return c.json({
    weightLyricism: updated.weightLyricism,
    weightProduction: updated.weightProduction,
    weightVocals: updated.weightVocals,
    weightFlow: updated.weightFlow,
    weightVibe: updated.weightVibe,
    discoverySensitivity: updated.discoverySensitivity,
  });
});

export default app;
