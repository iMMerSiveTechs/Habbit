/**
 * Notification Action Handler
 * Handles user actions from interactive notifications (Complete, Skip)
 * Also handles tapping the notification itself to view habit details
 */

import * as Notifications from "expo-notifications";
import { api } from "@/lib/habitApi";
import { AdaptiveIntelligenceService } from "./adaptiveIntelligence";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createNavigationContainerRef } from "@react-navigation/native";
import type { RootStackParamList } from "@/navigation/types";

// Create a navigation ref that can be used outside React components
export const navigationRef = createNavigationContainerRef<RootStackParamList>();

const SKIP_TRACKING_KEY = "habit_skip_tracking";

interface SkipEvent {
  habitId: string;
  skippedAt: string;
  reason?: string;
}

interface SkipTracking {
  [habitId: string]: SkipEvent[];
}

export class NotificationActionHandler {
  private static listener: Notifications.Subscription | null = null;

  /**
   * Initialize the notification action listener
   */
  static initialize() {
    // Remove existing listener if any
    if (this.listener) {
      this.listener.remove();
    }

    // Listen for notification responses (button taps)
    this.listener = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        const { notification, actionIdentifier } = response;
        const { data } = notification.request.content;

        console.log("📲 Notification action received:", actionIdentifier, "data:", data);

        // Handle habit reminder actions (both old "habit_reminder" and new smart notifications)
        const isHabitNotification = data?.type === "habit_reminder" ||
                                   (typeof data?.type === "string" && data.type.startsWith("smart_")) ||
                                   data?.habitId;

        if (isHabitNotification && data?.habitId) {
          const { habitId, habitTitle } = data;

          if (actionIdentifier === "COMPLETE") {
            await this.handleCompleteAction(habitId as string, habitTitle as string);
          } else if (actionIdentifier === "SKIP") {
            await this.handleSkipAction(habitId as string, habitTitle as string);
          } else if (actionIdentifier === "DEFAULT" || actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
            // User tapped the notification itself (not the action buttons)
            console.log("👆 User tapped smart notification, navigating to habit:", habitId);
            await this.handleDefaultAction(habitId as string);
          }
        }
      }
    );

    console.log("✅ Notification action handler initialized");
  }

  /**
   * Handle "Default" action (tapping the notification itself)
   * Navigate to the habit detail screen
   */
  private static async handleDefaultAction(habitId: string) {
    try {
      console.log("👆 User tapped notification, navigating to habit detail:", habitId);

      // Navigate to HabitDetailScreen if navigation is ready
      if (navigationRef.isReady()) {
        navigationRef.navigate("HabitDetailScreen", { habitId });
      } else {
        console.log("⚠️ Navigation not ready yet");
      }
    } catch (error) {
      console.error("❌ Failed to navigate to habit detail:", error);
    }
  }

  /**
   * Handle "Complete" action from notification
   */
  private static async handleCompleteAction(habitId: string, habitTitle: string) {
    try {
      console.log("✓ Completing habit from notification:", habitTitle);

      // Complete the habit via API
      await api.completeHabit(habitId);

      // Log engagement event for smart notifications
      AdaptiveIntelligenceService.logHabitComplete(habitId);

      // Show success notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "🎉 Great job!",
          body: `${habitTitle} completed! Keep the momentum going!`,
        },
        trigger: null,
      });

      console.log("✅ Habit completed successfully");
    } catch (error) {
      console.error("❌ Failed to complete habit:", error);

      // Show error notification
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Oops!",
          body: "Failed to complete habit. Please try again in the app.",
        },
        trigger: null,
      });
    }
  }

  /**
   * Handle "Skip" action from notification
   */
  private static async handleSkipAction(habitId: string, habitTitle: string) {
    try {
      console.log("⏭️ Skipping habit from notification:", habitTitle);

      // Track the skip locally
      await this.trackSkip(habitId);

      // Send skip to backend so it can be tracked server-side
      try {
        await api.skipHabit(habitId);
      } catch {
        // Backend unavailable, skip recorded locally only
      }

      // Check skip patterns and show suggestions
      const skipCount = await this.getConsecutiveSkips(habitId);

      if (skipCount === 3) {
        // 3 skips in a row - gentle suggestion
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Having trouble? 🤔",
            body: `You've skipped ${habitTitle} 3 times. Want to try a different time?`,
          },
          trigger: { seconds: 5, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
        });
      } else if (skipCount === 5) {
        // 5 skips - stronger suggestion
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Let's adjust 📅",
            body: `${habitTitle} might be too frequent. Consider reducing to 2x/day?`,
          },
          trigger: { seconds: 5, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
        });
      } else if (skipCount === 7) {
        // 7 skips - pause suggestion
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "Need a break? 😌",
            body: `Want to pause ${habitTitle} for a week and come back refreshed?`,
          },
          trigger: { seconds: 5, type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL },
        });
      } else {
        // Regular skip acknowledgment
        await Notifications.scheduleNotificationAsync({
          content: {
            title: "No worries! 👍",
            body: `${habitTitle} skipped. Tomorrow is a new day!`,
          },
          trigger: null,
        });
      }

      console.log("✅ Skip tracked successfully");
    } catch (error) {
      console.error("❌ Failed to track skip:", error);
    }
  }

  /**
   * Track a skip event locally
   */
  private static async trackSkip(habitId: string) {
    try {
      const tracking = await this.getSkipTracking();

      if (!tracking[habitId]) {
        tracking[habitId] = [];
      }

      tracking[habitId].push({
        habitId,
        skippedAt: new Date().toISOString(),
      });

      // Keep only last 30 days of skips
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      tracking[habitId] = tracking[habitId].filter(
        (skip) => new Date(skip.skippedAt) > thirtyDaysAgo
      );

      await AsyncStorage.setItem(SKIP_TRACKING_KEY, JSON.stringify(tracking));
    } catch (error) {
      console.error("Failed to track skip:", error);
    }
  }

  /**
   * Get consecutive skips for a habit
   */
  private static async getConsecutiveSkips(habitId: string): Promise<number> {
    try {
      const tracking = await this.getSkipTracking();
      const skips = tracking[habitId] || [];

      if (skips.length === 0) return 0;

      // Count consecutive skips from most recent
      const now = new Date();
      let consecutiveCount = 0;

      for (let i = skips.length - 1; i >= 0; i--) {
        const skipDate = new Date(skips[i].skippedAt);
        const daysDiff = Math.floor((now.getTime() - skipDate.getTime()) / (1000 * 60 * 60 * 24));

        // If skip is within last 2 days, count it as consecutive
        if (daysDiff <= 2) {
          consecutiveCount++;
        } else {
          break;
        }
      }

      return consecutiveCount;
    } catch (error) {
      console.error("Failed to get consecutive skips:", error);
      return 0;
    }
  }

  /**
   * Get all skip tracking data
   */
  private static async getSkipTracking(): Promise<SkipTracking> {
    try {
      const data = await AsyncStorage.getItem(SKIP_TRACKING_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error("Failed to get skip tracking:", error);
      return {};
    }
  }

  /**
   * Get skip stats for a habit
   */
  static async getSkipStats(habitId: string): Promise<{
    totalSkips: number;
    consecutiveSkips: number;
    lastSkipDate?: string;
    skipRate: number;
  }> {
    try {
      const tracking = await this.getSkipTracking();
      const skips = tracking[habitId] || [];

      const consecutiveSkips = await this.getConsecutiveSkips(habitId);
      const lastSkip = skips.length > 0 ? skips[skips.length - 1] : null;

      // Calculate skip rate (skips in last 30 days / 30)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentSkips = skips.filter(
        (skip) => new Date(skip.skippedAt) > thirtyDaysAgo
      );

      return {
        totalSkips: skips.length,
        consecutiveSkips,
        lastSkipDate: lastSkip?.skippedAt,
        skipRate: (recentSkips.length / 30) * 100,
      };
    } catch (error) {
      console.error("Failed to get skip stats:", error);
      return {
        totalSkips: 0,
        consecutiveSkips: 0,
        skipRate: 0,
      };
    }
  }

  /**
   * Clear skip tracking for a habit
   */
  static async clearSkipTracking(habitId: string) {
    try {
      const tracking = await this.getSkipTracking();
      delete tracking[habitId];
      await AsyncStorage.setItem(SKIP_TRACKING_KEY, JSON.stringify(tracking));
    } catch (error) {
      console.error("Failed to clear skip tracking:", error);
    }
  }

  /**
   * Clean up listener
   */
  static cleanup() {
    if (this.listener) {
      this.listener.remove();
      this.listener = null;
    }
  }
}
