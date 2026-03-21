import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { Platform } from "react-native";

export interface NotificationContent {
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: boolean;
  categoryIdentifier?: string;
}

// Notification categories with actions
const HABIT_REMINDER_CATEGORY = "HABIT_REMINDER";

export class NotificationService {
  private static _configured = false;

  /**
   * Initialize notification categories with actions
   */
  static async initializeCategories() {
    // Set up habit reminder category with Complete and Skip actions
    await Notifications.setNotificationCategoryAsync(HABIT_REMINDER_CATEGORY, [
      {
        identifier: "COMPLETE",
        buttonTitle: "✓ Complete",
        options: {
          opensAppToForeground: false, // Complete in background
        },
      },
      {
        identifier: "SKIP",
        buttonTitle: "Skip This One",
        options: {
          opensAppToForeground: false,
        },
      },
    ]);

    console.log("✅ Notification categories initialized");
  }

  /**
   * Configure notification handler behavior
   */
  static configure() {
    if (NotificationService._configured) return;
    NotificationService._configured = true;

    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Initialize categories on configure
    this.initializeCategories();
  }

  /**
   * Request notification permissions
   */
  static async requestPermissions(): Promise<boolean> {
    if (!Device.isDevice) {
      console.log("Must use physical device for Push Notifications");
      return false;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.log("Failed to get push notification permissions");
      return false;
    }

    return true;
  }

  /**
   * Check if notifications are enabled
   */
  static async hasPermissions(): Promise<boolean> {
    const { status } = await Notifications.getPermissionsAsync();
    return status === "granted";
  }

  /**
   * Schedule a notification with optional trigger
   */
  static async scheduleNotification(
    content: NotificationContent,
    trigger?: Notifications.NotificationTriggerInput | null
  ): Promise<string> {
    const hasPermissions = await this.hasPermissions();
    if (!hasPermissions) {
      throw new Error("Notification permissions not granted");
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        data: content.data || {},
        sound: content.sound !== false,
        ...(content.categoryIdentifier ? { categoryIdentifier: content.categoryIdentifier } : {}),
      },
      trigger: trigger ?? null,
    });

    return notificationId;
  }

  /**
   * Schedule a habit reminder with interactive actions
   */
  static async scheduleHabitReminder(
    habitId: string,
    habitTitle: string,
    seconds: number
  ): Promise<string> {
    const trigger: Notifications.NotificationTriggerInput = {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, seconds),
    };
    return this.scheduleNotification(
      {
        title: "Time for your habit! 🎯",
        body: `${habitTitle} - Complete or skip?`,
        data: {
          type: "habit_reminder",
          habitId,
          habitTitle,
        },
        categoryIdentifier: HABIT_REMINDER_CATEGORY,
      },
      trigger
    );
  }

  /**
   * Schedule a focus session reminder
   */
  static async scheduleFocusReminder(taskName: string, _minutes: number): Promise<string> {
    return this.scheduleNotification({
      title: "Focus Session Complete",
      body: `Great work on "${taskName}"! Time for a break.`,
      data: { type: "focus_complete", taskName },
    });
  }

  /**
   * Schedule a daily briefing notification
   */
  static async scheduleDailyBriefing(_hour: number = 8, _minute: number = 0): Promise<string> {
    return this.scheduleNotification({
      title: "Your Daily Briefing",
      body: "Check out your focus blocks for today",
      data: { type: "daily_briefing" },
    });
  }

  /**
   * Schedule a smart notification at a specific date/time
   */
  static async scheduleSmartNotification(
    content: NotificationContent,
    sendAt: Date
  ): Promise<string> {
    const hasPerms = await this.hasPermissions();
    if (!hasPerms) {
      throw new Error("Notification permissions not granted");
    }

    const now = new Date();
    const diffMs = sendAt.getTime() - now.getTime();

    // If in the past or less than 5 seconds from now, send immediately
    if (diffMs < 5000) {
      return Notifications.scheduleNotificationAsync({
        content: {
          title: content.title,
          body: content.body,
          data: content.data || {},
          sound: content.sound !== false,
        },
        trigger: null,
      });
    }

    // Use time interval trigger (seconds from now)
    const seconds = Math.max(1, Math.floor(diffMs / 1000));
    return Notifications.scheduleNotificationAsync({
      content: {
        title: content.title,
        body: content.body,
        data: content.data || {},
        sound: content.sound !== false,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
      },
    });
  }

  /**
   * Send immediate notification
   */
  static async sendNotification(content: NotificationContent): Promise<string> {
    return this.scheduleNotification(content, null);
  }

  /**
   * Cancel a scheduled notification
   */
  static async cancelNotification(notificationId: string): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  }

  /**
   * Cancel all scheduled notifications
   */
  static async cancelAllNotifications(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }

  /**
   * Get all scheduled notifications
   */
  static async getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
    return await Notifications.getAllScheduledNotificationsAsync();
  }

  /**
   * Add notification received listener
   */
  static addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }

  /**
   * Add notification response listener (when user taps notification)
   */
  static addNotificationResponseListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }
}
