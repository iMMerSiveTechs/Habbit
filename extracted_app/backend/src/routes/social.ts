import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { db } from "../db";
import type { AppType } from "../index";
import { z } from "zod";

const sendBuddyRequestSchema = z.object({
  buddyProfileId: z.number(),
});

const socialRouter = new Hono<AppType>()
  // Send buddy request
  .post("/buddy/request", zValidator("json", sendBuddyRequestSchema), async (c) => {
    try {
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

      // Check if already buddies or request exists
      const existing = await db.buddy.findFirst({
        where: {
          OR: [
            { profileId: profile.id, buddyId: data.buddyProfileId },
            { profileId: data.buddyProfileId, buddyId: profile.id },
          ],
        },
      });

      if (existing) {
        return c.json({ error: "Request already exists or already buddies" }, 400);
      }

      const buddy = await db.buddy.create({
        data: {
          profileId: profile.id,
          buddyId: data.buddyProfileId,
          status: "pending",
        },
      });

      return c.json({ buddy });
    } catch (error) {
      console.error(`[Social] Error:`, error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })

  // Accept buddy request
  .post("/buddy/:id/accept", async (c) => {
    try {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const buddyId = c.req.param("id");

      const profile = await db.profile.findUnique({
        where: { userId: user.id },
      });

      if (!profile) {
        return c.json({ error: "Profile not found" }, 404);
      }

      const buddy = await db.buddy.findFirst({
        where: {
          id: buddyId,
          buddyId: profile.id,
          status: "pending",
        },
      });

      if (!buddy) {
        return c.json({ error: "Buddy request not found" }, 404);
      }

      const updated = await db.buddy.update({
        where: { id: buddyId },
        data: { status: "accepted" },
      });

      return c.json({ buddy: updated });
    } catch (error) {
      console.error(`[Social] Error:`, error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })

  // Get buddies
  .get("/buddies", async (c) => {
    try {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const profile = await db.profile.findUnique({
        where: { userId: user.id },
        include: {
          buddies: {
            where: { status: "accepted" },
          },
        },
      });

      if (!profile) {
        return c.json({ buddies: [] });
      }

      // Get buddy profiles
      const buddyIds = profile.buddies.map(b => b.buddyId);
      const buddyProfiles = await db.profile.findMany({
        where: { id: { in: buddyIds } },
        include: { user: true },
      });

      const buddies = profile.buddies.map(b => {
        const buddyProfile = buddyProfiles.find(p => p.id === b.buddyId);
        return {
          id: b.id,
          buddyId: b.buddyId,
          name: buddyProfile?.user.name || "User",
          handle: buddyProfile?.handle || "",
          streak: b.streak,
          lastNudge: b.lastNudge,
        };
      });

      return c.json({ buddies });
    } catch (error) {
      console.error(`[Social] Error:`, error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })

  // Send nudge to buddy
  .post("/buddy/:id/nudge", async (c) => {
    try {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const buddyId = c.req.param("id");

      const profile = await db.profile.findUnique({
        where: { userId: user.id },
      });

      if (!profile) {
        return c.json({ error: "Profile not found" }, 404);
      }

      const buddy = await db.buddy.findFirst({
        where: {
          id: buddyId,
          profileId: profile.id,
          status: "accepted",
        },
      });

      if (!buddy) {
        return c.json({ error: "Buddy not found" }, 404);
      }

      // Check cooldown (1 hour)
      if (buddy.lastNudge) {
        const hoursSinceNudge = (Date.now() - buddy.lastNudge.getTime()) / (1000 * 60 * 60);
        if (hoursSinceNudge < 1) {
          return c.json({ error: "Please wait before nudging again" }, 429);
        }
      }

      const updated = await db.buddy.update({
        where: { id: buddyId },
        data: { lastNudge: new Date() },
      });

      // TODO: Send push notification to buddy

      return c.json({ success: true, buddy: updated });
    } catch (error) {
      console.error(`[Social] Error:`, error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })

  // Get groups
  .get("/groups", async (c) => {
    try {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const profile = await db.profile.findUnique({
        where: { userId: user.id },
        include: {
          groupMemberships: {
            include: {
              group: {
                include: {
                  members: true,
                },
              },
            },
          },
        },
      });

      if (!profile) {
        return c.json({ groups: [] });
      }

      const groups = profile.groupMemberships.map(m => ({
        id: m.group.id,
        name: m.group.name,
        description: m.group.description,
        topic: m.group.topic,
        memberCount: m.group.members.length,
        maxMembers: m.group.maxMembers,
        role: m.role,
        joinedAt: m.joinedAt,
      }));

      return c.json({ groups });
    } catch (error) {
      console.error(`[Social] Error:`, error);
      return c.json({ error: "Internal server error" }, 500);
    }
  })

  // Discover groups
  .get("/groups/discover", async (c) => {
    try {
      const user = c.get("user");
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const profile = await db.profile.findUnique({
        where: { userId: user.id },
      });

      if (!profile) {
        return c.json({ groups: [] });
      }

      // Get public groups that user is not a member of
      const groups = await db.group.findMany({
        where: {
          isPrivate: false,
          members: {
            none: {
              profileId: profile.id,
            },
          },
        },
        include: {
          members: true,
        },
        take: 20,
      });

      const discover = groups.map(g => ({
        id: g.id,
        name: g.name,
        description: g.description,
        topic: g.topic,
        memberCount: g.members.length,
        maxMembers: g.maxMembers,
        isFull: g.members.length >= g.maxMembers,
      }));

      return c.json({ groups: discover });
    } catch (error) {
      console.error(`[Social] Error:`, error);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

export default socialRouter;
