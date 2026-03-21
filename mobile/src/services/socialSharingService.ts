/**
 * Social Sharing Service
 *
 * Allows users to share their progress, achievements, and insights
 * Uses expo-sharing for native share sheet
 */

import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import { captureRef } from "react-native-view-shot";

export interface ShareContent {
  title: string;
  message: string;
  url?: string;
}

export interface ShareImageOptions {
  viewRef: any;
  filename?: string;
  format?: "png" | "jpg";
  quality?: number;
}

export class SocialSharingService {
  /**
   * Check if sharing is available on this device
   */
  static async isAvailable(): Promise<boolean> {
    try {
      return await Sharing.isAvailableAsync();
    } catch (error) {
      console.error("Failed to check sharing availability:", error);
      return false;
    }
  }

  /**
   * Share text content
   */
  static async shareText(content: ShareContent): Promise<boolean> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        console.log("Sharing not available on this device");
        return false;
      }

      // Create a temporary file with the content
      const filename = `${FileSystem.cacheDirectory}share_${Date.now()}.txt`;
      await FileSystem.writeAsStringAsync(filename, `${content.title}\n\n${content.message}`);

      await Sharing.shareAsync(filename, {
        mimeType: "text/plain",
        dialogTitle: content.title,
      });

      // Clean up
      await FileSystem.deleteAsync(filename, { idempotent: true });

      return true;
    } catch (error) {
      console.error("Failed to share text:", error);
      return false;
    }
  }

  /**
   * Share a screenshot/image
   */
  static async shareImage(options: ShareImageOptions): Promise<boolean> {
    try {
      const available = await this.isAvailable();
      if (!available) {
        console.log("Sharing not available on this device");
        return false;
      }

      // Capture the view as an image
      const uri = await captureRef(options.viewRef, {
        format: options.format || "png",
        quality: options.quality || 1.0,
      });

      await Sharing.shareAsync(uri, {
        mimeType: options.format === "jpg" ? "image/jpeg" : "image/png",
        dialogTitle: "Share your progress",
      });

      return true;
    } catch (error) {
      console.error("Failed to share image:", error);
      return false;
    }
  }

  /**
   * Share habit completion achievement
   */
  static async shareHabitCompletion(habitTitle: string, streak: number): Promise<boolean> {
    const content: ShareContent = {
      title: "Habit Streak! 🔥",
      message: `I just completed "${habitTitle}" for ${streak} day${streak > 1 ? "s" : ""} in a row! Building better habits with HABIT.`,
    };

    return await this.shareText(content);
  }

  /**
   * Share weekly progress
   */
  static async shareWeeklyProgress(
    completionRate: number,
    totalCompletions: number,
    focusMinutes: number
  ): Promise<boolean> {
    const content: ShareContent = {
      title: "Weekly Progress Report 📊",
      message: `This week's stats:\n\n✅ ${completionRate}% completion rate\n🎯 ${totalCompletions} habits completed\n⏱️ ${Math.round(focusMinutes / 60)} hours of focused work\n\nBuilding consistency with HABIT!`,
    };

    return await this.shareText(content);
  }

  /**
   * Share achievement unlock
   */
  static async shareAchievement(
    title: string,
    description: string,
    habitTitle?: string
  ): Promise<boolean> {
    const content: ShareContent = {
      title: "Achievement Unlocked! 🏆",
      message: `${title}\n\n${description}${habitTitle ? `\n\nHabit: ${habitTitle}` : ""}\n\nTransforming my life with HABIT!`,
    };

    return await this.shareText(content);
  }

  /**
   * Share daily reflection
   */
  static async shareDailyReflection(
    dayRating: "amazing" | "good" | "okay" | "rough",
    oneWin: string,
    completedHabits: number
  ): Promise<boolean> {
    const ratingEmoji = {
      amazing: "✨",
      good: "⭐",
      okay: "👍",
      rough: "💪",
    };

    const content: ShareContent = {
      title: `Today was ${dayRating}! ${ratingEmoji[dayRating]}`,
      message: `My win today: ${oneWin}\n\nCompleted ${completedHabits} habits.\n\nReflecting daily with HABIT!`,
    };

    return await this.shareText(content);
  }

  /**
   * Share focus session
   */
  static async shareFocusSession(task: string, durationMinutes: number): Promise<boolean> {
    const content: ShareContent = {
      title: "Deep Work Session Complete! 🧠",
      message: `Just completed ${durationMinutes} minutes of focused work on "${task}".\n\nStaying in the zone with HABIT!`,
    };

    return await this.shareText(content);
  }

  /**
   * Share category performance
   */
  static async shareCategoryStats(
    category: string,
    completionRate: number,
    totalHabits: number
  ): Promise<boolean> {
    const categoryEmojis: { [key: string]: string } = {
      health: "💪",
      mind: "🧠",
      work: "💼",
      growth: "🌱",
      fitness: "🏃",
      mindfulness: "🧘",
      social: "👥",
      general: "📌",
    };

    const emoji = categoryEmojis[category] || "📌";

    const content: ShareContent = {
      title: `${category.charAt(0).toUpperCase() + category.slice(1)} Progress ${emoji}`,
      message: `${completionRate}% completion rate across ${totalHabits} ${category} habits.\n\nTracking my progress with HABIT!`,
    };

    return await this.shareText(content);
  }

  /**
   * Share milestone (100 days, 1 year, etc.)
   */
  static async shareMilestone(habitTitle: string, days: number): Promise<boolean> {
    let milestoneText = "";
    let emoji = "🎉";

    if (days === 7) {
      milestoneText = "1 week";
      emoji = "🔥";
    } else if (days === 30) {
      milestoneText = "1 month";
      emoji = "🌟";
    } else if (days === 100) {
      milestoneText = "100 days";
      emoji = "💯";
    } else if (days === 365) {
      milestoneText = "1 YEAR";
      emoji = "🏆";
    } else if (days === 1000) {
      milestoneText = "1000 DAYS";
      emoji = "👑";
    } else {
      milestoneText = `${days} days`;
      emoji = "🎯";
    }

    const content: ShareContent = {
      title: `${milestoneText} streak! ${emoji}`,
      message: `I just hit a ${milestoneText} streak on "${habitTitle}"!\n\nConsistency is key. Building better habits with HABIT!`,
    };

    return await this.shareText(content);
  }

  /**
   * Share all-time stats
   */
  static async shareAllTimeStats(
    totalCompletions: number,
    longestStreak: number,
    totalFocusHours: number,
    daysActive: number
  ): Promise<boolean> {
    const content: ShareContent = {
      title: "My All-Time Stats 📈",
      message: `🎯 ${totalCompletions} total habit completions\n🔥 ${longestStreak} day longest streak\n⏱️ ${totalFocusHours} hours of deep work\n📅 ${daysActive} days of building better habits\n\nTransforming my life with HABIT!`,
    };

    return await this.shareText(content);
  }

  /**
   * Generate shareable insight text
   */
  static generateInsightText(
    type: "pattern" | "productivity" | "consistency",
    data: any
  ): string {
    switch (type) {
      case "pattern":
        return `🔍 Pattern Detected:\n\nI complete the most habits on ${data.bestDay} at ${data.bestTime}.\n\nDiscovering my rhythm with HABIT!`;

      case "productivity":
        return `⚡ Productivity Insight:\n\nMy best performing habit is "${data.topHabit}" with a ${data.rate}% completion rate.\n\nStaying consistent with HABIT!`;

      case "consistency":
        return `📊 Consistency Report:\n\n${data.score}/100 consistency score\n${data.completedDays} days active this month\n\nBuilding momentum with HABIT!`;

      default:
        return "Building better habits with HABIT!";
    }
  }
}
