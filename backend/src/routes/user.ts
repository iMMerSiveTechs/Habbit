import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { type AppType } from "../types";
import { db } from "../db";

const userRouter = new Hono<AppType>();

// ============================================================
// VALIDATION SCHEMAS
// ============================================================

const DeleteAccountSchema = z.object({
  confirmEmail: z.string().email().optional(),
});

// ============================================================
// ACCOUNT DELETION
// ============================================================

// POST /api/user/delete
// Permanently deletes the authenticated user's account and all associated data.
// Optionally accepts { confirmEmail } in the request body to validate the user
// knows which account they are deleting before the irreversible action executes.
// Deletion order:
//   1. Delete all sessions (signs the user out across all devices)
//   2. Delete the User record — cascades through Account, Profile, and all
//      Profile child tables via the onDelete: Cascade relations in schema.prisma
userRouter.post(
  "/delete",
  zValidator("json", DeleteAccountSchema),
  async (c) => {
    const user = c.get("user");

    if (!user) {
      console.log("[User] Unauthorized account deletion attempt — no session");
      return c.json({ error: "Unauthorized" }, 401);
    }

    const { confirmEmail } = c.req.valid("json");

    // If the caller provided confirmEmail, it must match the authenticated user's email.
    if (confirmEmail !== undefined && confirmEmail !== user.email) {
      console.log(
        `[User] Account deletion aborted — confirmEmail mismatch for user ${user.id}`
      );
      return c.json(
        { error: "Email confirmation does not match your account email" },
        400
      );
    }

    try {
      // Step 1: Invalidate all active sessions
      await db.session.deleteMany({ where: { userId: user.id } });
      console.log(`[User] Sessions invalidated for user ${user.id}`);

      // Step 2: Find the profile to delete its children first
      const profile = await db.profile.findUnique({ where: { userId: user.id } });

      if (profile) {
        // Delete all profile-related data explicitly (SQLite requires proper order)
        await db.achievement.deleteMany({ where: { profileId: profile.id } });
        await db.biometricData.deleteMany({ where: { profileId: profile.id } });
        await db.buddy.deleteMany({ where: { profileId: profile.id } });
        await db.dailyIntention.deleteMany({ where: { profileId: profile.id } });
        await db.dailyReflection.deleteMany({ where: { profileId: profile.id } });
        await db.weeklyReflection.deleteMany({ where: { profileId: profile.id } });
        await db.monthlyReflection.deleteMany({ where: { profileId: profile.id } });
        await db.reflectionSettings.deleteMany({ where: { profileId: profile.id } });
        await db.focusSession.deleteMany({ where: { profileId: profile.id } });
        await db.groupMembership.deleteMany({ where: { profileId: profile.id } });
        await db.identityStatement.deleteMany({ where: { profileId: profile.id } });
        await db.userGoal.deleteMany({ where: { profileId: profile.id } });
        await db.voiceProfile.deleteMany({ where: { profileId: profile.id } });
        await db.prediction.deleteMany({ where: { profileId: profile.id } });
        await db.reflection.deleteMany({ where: { profileId: profile.id } });
        await db.templatePurchase.deleteMany({ where: { profileId: profile.id } });
        await db.trackScore.deleteMany({ where: { profileId: profile.id } });
        await db.userPreference.deleteMany({ where: { profileId: profile.id } });
        await db.playHistory.deleteMany({ where: { profileId: profile.id } });

        // Habits (cascade deletes HabitEvent and HabitReminder)
        const habits = await db.habit.findMany({ where: { profileId: profile.id } });
        for (const habit of habits) {
          await db.habitEvent.deleteMany({ where: { habitId: habit.id } });
          await db.habitReminder.deleteMany({ where: { habitId: habit.id } });
        }
        await db.habit.deleteMany({ where: { profileId: profile.id } });

        // Todos (cascade deletes TodoItem and TodoReminder)
        const todos = await db.todo.findMany({ where: { profileId: profile.id } });
        for (const todo of todos) {
          await db.todoItem.deleteMany({ where: { todoId: todo.id } });
          await db.todoReminder.deleteMany({ where: { todoId: todo.id } });
        }
        await db.todo.deleteMany({ where: { profileId: profile.id } });

        // Geofences (cascade deletes LocationVisit and LocationReminder)
        const geofences = await db.locationGeofence.findMany({ where: { profileId: profile.id } });
        for (const geo of geofences) {
          await db.locationVisit.deleteMany({ where: { geofenceId: geo.id } });
          await db.locationReminder.deleteMany({ where: { geofenceId: geo.id } });
        }
        await db.locationGeofence.deleteMany({ where: { profileId: profile.id } });

        // Delete the profile itself
        await db.profile.delete({ where: { id: profile.id } });
      }

      // Step 3: Delete auth accounts then the User record
      await db.account.deleteMany({ where: { userId: user.id } });
      await db.user.delete({ where: { id: user.id } });
      console.log(`[User] Account permanently deleted for user ${user.id}`);

      return c.json({ success: true, message: "Account deleted" });
    } catch (error) {
      console.error("[User] Error deleting account:", error);
      return c.json({ error: "Failed to delete account" }, 500);
    }
  }
);

export default userRouter;
