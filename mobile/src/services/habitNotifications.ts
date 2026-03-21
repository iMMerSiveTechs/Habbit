/**
 * Habit Notification Scheduler
 * Manages scheduling and canceling notifications for habits
 */

import { NotificationService } from "./notificationService";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HABIT_NOTIFICATIONS_KEY = "habit_notifications";

interface HabitNotificationMapping {
  [habitId: string]: string; // habitId -> notificationId
}

/**
 * Schedule a notification for a habit with reminder enabled
 */
export async function scheduleHabitNotification(
  habitId: string,
  habitTitle: string,
  reminderTime: string,
  recurringType?: string
): Promise<void> {
  try {
    // Check if notifications are enabled
    const hasPermissions = await NotificationService.hasPermissions();
    if (!hasPermissions) {
      console.log("⚠️ Cannot schedule notification - permissions not granted");
      return;
    }

    // Cancel existing notification for this habit
    await cancelHabitNotification(habitId);

    // Parse reminder time (HH:MM format)
    const [hours, minutes] = reminderTime.split(":").map(Number);

    // Calculate seconds until next occurrence
    const now = new Date();
    const reminderDate = new Date();
    reminderDate.setHours(hours, minutes, 0, 0);

    // If time has passed today, schedule for tomorrow
    if (reminderDate <= now) {
      reminderDate.setDate(reminderDate.getDate() + 1);
    }

    const secondsUntilReminder = Math.floor((reminderDate.getTime() - now.getTime()) / 1000);

    // Schedule the notification
    const notificationId = await NotificationService.scheduleHabitReminder(
      habitId,
      habitTitle,
      secondsUntilReminder
    );

    // Save notification ID mapping
    const mappings = await getHabitNotificationMappings();
    mappings[habitId] = notificationId;
    await AsyncStorage.setItem(HABIT_NOTIFICATIONS_KEY, JSON.stringify(mappings));

    console.log(`✅ Scheduled notification for "${habitTitle}" at ${reminderTime} (ID: ${notificationId})`);
  } catch (error) {
    console.error("Failed to schedule habit notification:", error);
  }
}

/**
 * Cancel a scheduled notification for a habit
 */
export async function cancelHabitNotification(habitId: string): Promise<void> {
  try {
    const mappings = await getHabitNotificationMappings();
    const notificationId = mappings[habitId];

    if (notificationId) {
      await NotificationService.cancelNotification(notificationId);
      delete mappings[habitId];
      await AsyncStorage.setItem(HABIT_NOTIFICATIONS_KEY, JSON.stringify(mappings));
      console.log(`🔕 Canceled notification for habit ${habitId}`);
    }
  } catch (error) {
    console.error("Failed to cancel habit notification:", error);
  }
}

/**
 * Reschedule notifications for all habits
 * Call this on app startup or when reminders are updated
 */
export async function rescheduleAllHabitNotifications(
  habits: Array<{
    id: string;
    title: string;
    reminderEnabled: boolean;
    reminderTime?: string | null;
    recurringType?: string | null;
  }>
): Promise<void> {
  try {
    console.log(`🔄 Rescheduling notifications for ${habits.length} habits...`);

    // Cancel all existing notifications
    await NotificationService.cancelAllNotifications();
    await AsyncStorage.removeItem(HABIT_NOTIFICATIONS_KEY);

    // Schedule notifications for habits with reminders enabled
    for (const habit of habits) {
      if (habit.reminderEnabled && habit.reminderTime) {
        await scheduleHabitNotification(
          habit.id,
          habit.title,
          habit.reminderTime,
          habit.recurringType || undefined
        );
      }
    }

    console.log("✅ All habit notifications rescheduled");
  } catch (error) {
    console.error("Failed to reschedule habit notifications:", error);
  }
}

/**
 * Get habit notification ID mappings
 */
async function getHabitNotificationMappings(): Promise<HabitNotificationMapping> {
  try {
    const data = await AsyncStorage.getItem(HABIT_NOTIFICATIONS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error("Failed to get habit notification mappings:", error);
    return {};
  }
}

/**
 * Schedule daily briefing notification (8am default)
 */
export async function scheduleDailyBriefing(hour: number = 8, minute: number = 0): Promise<void> {
  try {
    const hasPermissions = await NotificationService.hasPermissions();
    if (!hasPermissions) return;

    await NotificationService.scheduleDailyBriefing(hour, minute);
    console.log(`✅ Scheduled daily briefing at ${hour}:${minute.toString().padStart(2, "0")}`);
  } catch (error) {
    console.error("Failed to schedule daily briefing:", error);
  }
}
