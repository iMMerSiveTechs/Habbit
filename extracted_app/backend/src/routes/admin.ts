import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import type { AppType } from "../index";
import {
  toggleOnboardingRequestSchema,
  setAdminRequestSchema,
} from "../../../shared/contracts";

const adminRouter = new Hono<AppType>()
  // Get admin status and preferences
  .get("/profile", async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
      select: {
        isAdmin: true,
        skipOnboarding: true,
        handle: true,
      },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    return c.json({
      isAdmin: profile.isAdmin,
      skipOnboarding: profile.skipOnboarding,
      handle: profile.handle,
    });
  })

  // Toggle onboarding preference (admin only)
  .post("/toggle-onboarding", zValidator("json", toggleOnboardingRequestSchema), async (c) => {
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

    if (!profile.isAdmin) {
      return c.json({ error: "Admin access required" }, 403);
    }

    const data = c.req.valid("json");

    const updated = await db.profile.update({
      where: { userId: user.id },
      data: { skipOnboarding: data.skipOnboarding },
    });

    return c.json({
      skipOnboarding: updated.skipOnboarding,
    });
  })

  // Set admin status (for initial setup or debugging)
  .post("/set-admin", zValidator("json", setAdminRequestSchema), async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Never allow in production
    if (process.env.NODE_ENV === "production") {
      return c.json({ error: "Forbidden" }, 403);
    }

    // Always require ADMIN_SETUP_TOKEN header — if the env var is not set, block all requests
    const adminSetupToken = process.env.ADMIN_SETUP_TOKEN;
    if (!adminSetupToken) {
      return c.json({ error: "Forbidden: ADMIN_SETUP_TOKEN is not configured" }, 403);
    }
    const providedToken = c.req.header("x-admin-setup-token");
    if (!providedToken || providedToken !== adminSetupToken) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const profile = await db.profile.findUnique({
      where: { userId: user.id },
    });

    if (!profile) {
      return c.json({ error: "Profile not found" }, 404);
    }

    const data = c.req.valid("json");

    const updated = await db.profile.update({
      where: { userId: user.id },
      data: { isAdmin: data.isAdmin },
    });

    return c.json({
      isAdmin: updated.isAdmin,
      message: data.isAdmin ? "Admin access granted" : "Admin access revoked",
    });
  });

export default adminRouter;
