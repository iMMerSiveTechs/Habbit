import { db } from "../db";
import { type Hono } from "hono";

// ============================================================
// REFLECTION NOTIFICATION SCHEDULER
// ============================================================

/**
 * Checks if user should receive daily reflection reminder
 * Sends at dailyReflectionTime if not already completed today
 */
export async function checkDailyReflectionReminder() {
  try {
    const allProfiles = await db.profile.findMany({
      include: { reflectionSettings: true },
    });

    for (const profile of allProfiles) {
      const settings = profile.reflectionSettings;
      if (!settings || !settings.dailyReflectionEnabled || !settings.notificationsEnabled) {
        continue;
      }

      // Parse the time (HH:MM format)
      const timeParts = settings.dailyReflectionTime.split(":");
      const hours = parseInt(timeParts[0] || "20", 10);
      const minutes = parseInt(timeParts[1] || "0", 10);
      const now = new Date();
      const targetTime = new Date();
      targetTime.setHours(hours, minutes, 0, 0);

      // Check if within 5-minute window (to account for cron job timing)
      const timeDiff = Math.abs(now.getTime() - targetTime.getTime());
      if (timeDiff > 5 * 60 * 1000) continue;

      // Check if already reflected today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const reflection = await db.dailyReflection.findFirst({
        where: {
          profileId: profile.id,
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      if (!reflection) {
        // Queue notification
        console.log(`📬 [Reflection] Queue daily reflection reminder for profile ${profile.id}`);
        // TODO: Send push notification via your notification service
      }
    }
  } catch (error) {
    console.error("❌ [Reflection] Error checking daily reminders:", error);
  }
}

/**
 * Checks if user should receive missed reflection reminder
 * Sends at dailyMissedReminderTime (e.g., 4 PM) if evening reflection not yet done
 */
export async function checkDailyMissedReflectionReminder() {
  try {
    const allProfiles = await db.profile.findMany({
      include: { reflectionSettings: true },
    });

    for (const profile of allProfiles) {
      const settings = profile.reflectionSettings;
      if (!settings || !settings.dailyReflectionEnabled || !settings.notificationsEnabled) {
        continue;
      }

      // Parse the missed reminder time
      const missedTimeParts = settings.dailyMissedReminderTime.split(":");
      const missedHours = parseInt(missedTimeParts[0] || "16", 10);
      const missedMinutes = parseInt(missedTimeParts[1] || "0", 10);
      const now = new Date();
      const targetTime = new Date();
      targetTime.setHours(missedHours, missedMinutes, 0, 0);

      // Check if within 5-minute window
      const timeDiff = Math.abs(now.getTime() - targetTime.getTime());
      if (timeDiff > 5 * 60 * 1000) continue;

      // Check if already reflected today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const reflection = await db.dailyReflection.findFirst({
        where: {
          profileId: profile.id,
          date: {
            gte: today,
            lt: tomorrow,
          },
        },
      });

      if (!reflection) {
        console.log(
          `📬 [Reflection] Queue missed daily reflection reminder for profile ${profile.id}`
        );
        // TODO: Send gentler notification via your notification service
      }
    }
  } catch (error) {
    console.error("❌ [Reflection] Error checking missed reflection reminders:", error);
  }
}

/**
 * Checks if user should receive weekly reflection reminder
 * Sends on specified day at specified time
 */
export async function checkWeeklyReflectionReminder() {
  try {
    const allProfiles = await db.profile.findMany({
      include: { reflectionSettings: true },
    });

    const now = new Date();
    const currentDayOfWeek = now.getDay();

    for (const profile of allProfiles) {
      const settings = profile.reflectionSettings;
      if (!settings || !settings.weeklyReflectionEnabled || !settings.notificationsEnabled) {
        continue;
      }

      // Check if today is the reflection day
      if (currentDayOfWeek !== settings.weeklyReflectionDay) continue;

      // Parse the time
      const weeklyTimeParts = settings.weeklyReflectionTime.split(":");
      const weeklyHours = parseInt(weeklyTimeParts[0] || "18", 10);
      const weeklyMinutes = parseInt(weeklyTimeParts[1] || "0", 10);
      const targetTime = new Date();
      targetTime.setHours(weeklyHours, weeklyMinutes, 0, 0);

      // Check if within 5-minute window
      const timeDiff = Math.abs(now.getTime() - targetTime.getTime());
      if (timeDiff > 5 * 60 * 1000) continue;

      // Get Monday of current week
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diff));
      monday.setHours(0, 0, 0, 0);

      // Check if already reflected this week
      const reflection = await db.weeklyReflection.findFirst({
        where: {
          profileId: profile.id,
          weekStartDate: monday,
        },
      });

      if (!reflection) {
        console.log(
          `📬 [Reflection] Queue weekly reflection reminder for profile ${profile.id}`
        );
        // TODO: Send push notification
      }
    }
  } catch (error) {
    console.error("❌ [Reflection] Error checking weekly reminders:", error);
  }
}

/**
 * Checks if user should receive monthly reflection reminder
 * Sends on specified day at specified time
 */
export async function checkMonthlyReflectionReminder() {
  try {
    const allProfiles = await db.profile.findMany({
      include: { reflectionSettings: true },
    });

    const now = new Date();
    const currentDate = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

    for (const profile of allProfiles) {
      const settings = profile.reflectionSettings;
      if (!settings || !settings.monthlyReflectionEnabled || !settings.notificationsEnabled) {
        continue;
      }

      // Check if today is the reflection day or last day of month
      const isReflectionDay =
        currentDate === settings.monthlyReflectionDay ||
        (settings.monthlyReflectionDay === 31 && currentDate === daysInMonth);

      if (!isReflectionDay) continue;

      // Parse the time
      const monthlyTimeParts = settings.monthlyReflectionTime.split(":");
      const monthlyHours = parseInt(monthlyTimeParts[0] || "18", 10);
      const monthlyMinutes = parseInt(monthlyTimeParts[1] || "0", 10);
      const targetTime = new Date();
      targetTime.setHours(monthlyHours, monthlyMinutes, 0, 0);

      // Check if within 5-minute window
      const timeDiff = Math.abs(now.getTime() - targetTime.getTime());
      if (timeDiff > 5 * 60 * 1000) continue;

      // Check if already reflected this month
      const reflection = await db.monthlyReflection.findFirst({
        where: {
          profileId: profile.id,
          year: now.getFullYear(),
          month: now.getMonth() + 1,
        },
      });

      if (!reflection) {
        console.log(
          `📬 [Reflection] Queue monthly reflection reminder for profile ${profile.id}`
        );
        // TODO: Send push notification
      }
    }
  } catch (error) {
    console.error("❌ [Reflection] Error checking monthly reminders:", error);
  }
}

/**
 * Initializes scheduled tasks for reflection reminders
 * Should be called on server startup
 */
export function initializeReflectionScheduler() {
  console.log("⏰ [Reflection] Initializing reflection scheduler...");

  // Run daily reflection checks every minute (or at specific intervals)
  // In production, use a proper cron job scheduler like node-cron or bull
  // This is a simplified example

  const scheduleInterval = 60 * 1000; // Check every minute

  setInterval(async () => {
    await checkDailyReflectionReminder();
    await checkDailyMissedReflectionReminder();
    await checkWeeklyReflectionReminder();
    await checkMonthlyReflectionReminder();
  }, scheduleInterval);

  console.log(
    "✅ [Reflection] Scheduler initialized - will check every minute for reflection reminders"
  );
}
