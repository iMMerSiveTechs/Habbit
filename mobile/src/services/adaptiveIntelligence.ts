import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { AppState, type AppStateStatus } from "react-native";
import { NotificationService } from "./notificationService";
import { api } from "@/lib/api";

const SMART_NOTIFICATION_TASK = "smart-notification-evaluate";

interface SmartNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  scheduledFor: string;
  habitId?: string;
}

interface EvaluateResponse {
  notifications: SmartNotification[];
}

interface LogEventResponse {
  logEntry: { id: string; timestamp: string };
}

/**
 * Adaptive Intelligence Service
 * Detects user engagement patterns and sends smart, personalized notifications
 * based on behavior, streaks, missed habits, and daily rhythms.
 */
export class AdaptiveIntelligenceService {
  private static appStateSubscription: ReturnType<
    typeof AppState.addEventListener
  > | null = null;
  private static lastAppOpenLog: string | null = null;

  /**
   * Initialize the adaptive intelligence system
   */
  static async initialize() {
    console.log("🎯 Initializing Adaptive Intelligence Service...");

    await this.registerBackgroundTasks();
    await this.schedulePeriodicChecks();
    this.listenForAppStateChanges();
    await this.logAppOpen();
    await this.evaluateAndSchedule();

    console.log("✅ Adaptive Intelligence Service initialized");
  }

  /**
   * Register background task for smart notification evaluation
   */
  private static async registerBackgroundTasks() {
    TaskManager.defineTask(SMART_NOTIFICATION_TASK, async () => {
      try {
        await this.evaluateAndSchedule();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch {
        console.log(
          "ℹ️ Background smart notification check completed with issues"
        );
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });
  }

  /**
   * Schedule periodic background evaluation
   */
  private static async schedulePeriodicChecks() {
    try {
      await BackgroundFetch.registerTaskAsync(SMART_NOTIFICATION_TASK, {
        minimumInterval: 15 * 60, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });
      console.log(
        "⏰ Scheduled periodic checks for missed items and notifications"
      );
    } catch (error) {
      console.log(
        "ℹ️ Could not register background task:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Listen for app state changes to track engagement
   */
  private static listenForAppStateChanges() {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
    }

    this.appStateSubscription = AppState.addEventListener(
      "change",
      (nextState: AppStateStatus) => {
        if (nextState === "active") {
          this.logAppOpen();
          this.evaluateAndSchedule();
        }
      }
    );
  }

  /**
   * Log an app open event (deduplicated per 5-minute window)
   */
  static async logAppOpen() {
    const now = new Date();
    const windowKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${Math.floor(now.getMinutes() / 5)}`;
    if (this.lastAppOpenLog === windowKey) return;
    this.lastAppOpenLog = windowKey;

    try {
      await api.post<LogEventResponse>(
        "/api/smart-notifications/log-event",
        { eventType: "app_open" }
      );
    } catch (error) {
      console.log(
        "ℹ️ Could not log app open:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Log a habit completion event
   */
  static async logHabitComplete(habitId: string) {
    try {
      await api.post<LogEventResponse>(
        "/api/smart-notifications/log-event",
        {
          eventType: "habit_complete",
          metadata: JSON.stringify({ habitId }),
        }
      );
    } catch (error) {
      console.log(
        "ℹ️ Could not log habit completion:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Log a todo completion event
   */
  static async logTodoComplete(todoId: string) {
    try {
      await api.post<LogEventResponse>(
        "/api/smart-notifications/log-event",
        {
          eventType: "todo_complete",
          metadata: JSON.stringify({ todoId }),
        }
      );
    } catch (error) {
      console.log(
        "ℹ️ Could not log todo completion:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Log a notification interaction
   */
  static async logNotificationInteraction(
    notificationId: string,
    action: "opened" | "acted"
  ) {
    try {
      await api.post<LogEventResponse>(
        "/api/smart-notifications/log-event",
        {
          eventType:
            action === "opened" ? "notification_opened" : "notification_acted",
          metadata: JSON.stringify({ notificationId }),
        }
      );
    } catch (error) {
      console.log(
        "ℹ️ Could not log notification interaction:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Core: Call the backend smart evaluation engine and schedule returned notifications
   */
  static async evaluateAndSchedule() {
    try {
      const data = await api.post<EvaluateResponse>(
        "/api/smart-notifications/evaluate"
      );
      const notifications = data.notifications;

      if (notifications.length === 0) return;

      console.log(
        `📬 Smart engine returned ${notifications.length} notification(s)`
      );

      for (const notif of notifications) {
        const sendAt = new Date(notif.scheduledFor);
        try {
          // Extract habit title from notification data if available
          // For missed_habit notifications, title is like "Walk dogs is waiting"
          // For morning_nudge, title is generic but we can get it from notif data
          const habitTitle = notif.habitId ? notif.title : undefined;

          await NotificationService.scheduleSmartNotification(
            {
              title: notif.title,
              body: notif.message,
              data: {
                type: `smart_${notif.type}`,
                smartNotificationId: notif.id,
                habitId: notif.habitId,
                habitTitle: habitTitle,
              },
            },
            sendAt
          );
          console.log(
            `📅 Scheduled smart notification: "${notif.title}" for ${sendAt.toLocaleTimeString()}`
          );
        } catch (error) {
          console.log(
            `ℹ️ Could not schedule notification "${notif.title}":`,
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    } catch (error) {
      console.log(
        "ℹ️ Could not evaluate smart notifications:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Trigger pattern recomputation on the backend
   */
  static async recomputePatterns() {
    try {
      await api.post<unknown>("/api/smart-notifications/compute-patterns");
      console.log("✅ Engagement patterns recomputed");
    } catch (error) {
      console.log(
        "ℹ️ Could not recompute patterns:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Get today's missed items (legacy compat)
   */
  static async getTodaysMissedItems() {
    try {
      const data = await api.get<{ missedItems: unknown[] }>(
        "/api/adaptive/missed-items/today"
      );
      return data.missedItems;
    } catch (error) {
      console.log(
        "ℹ️ Could not get missed items:",
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  /**
   * Respond to a missed item (legacy compat)
   */
  static async respondToMissedItem(
    missedItemId: string,
    responseType:
      | "skip_once"
      | "reschedule"
      | "adjust_time"
      | "remove"
      | "completed_late",
    responseNote?: string
  ) {
    try {
      const data = await api.post<{ missedItem: unknown }>(
        `/api/adaptive/missed-items/${missedItemId}/respond`,
        { responseType, responseNote }
      );
      console.log("✅ Recorded response for missed item");
      return data.missedItem;
    } catch (error) {
      console.error("Error responding to missed item:", error);
      throw error;
    }
  }

  /**
   * Get skip pattern for an item (legacy compat)
   */
  static async getSkipPattern(itemType: "habit" | "todo", itemId: string) {
    try {
      const data = await api.get<{ pattern: unknown }>(
        `/api/adaptive/patterns/${itemType}/${itemId}`
      );
      return data.pattern;
    } catch (error) {
      console.log(
        "ℹ️ Could not get skip pattern:",
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  /**
   * Get all skip patterns (legacy compat)
   */
  static async getAllSkipPatterns() {
    try {
      const data = await api.get<{ patterns: unknown[] }>(
        "/api/adaptive/patterns"
      );
      return data.patterns;
    } catch (error) {
      console.log(
        "ℹ️ Could not get patterns:",
        error instanceof Error ? error.message : String(error)
      );
      return [];
    }
  }

  /**
   * Stop the adaptive intelligence system
   */
  static async stop() {
    try {
      if (this.appStateSubscription) {
        this.appStateSubscription.remove();
        this.appStateSubscription = null;
      }
      await BackgroundFetch.unregisterTaskAsync(SMART_NOTIFICATION_TASK);
      console.log("🛑 Adaptive Intelligence Service stopped");
    } catch (error) {
      console.log(
        "ℹ️ Error stopping Adaptive Intelligence Service:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }
}
