/**
 * Achievement Detection Service
 * Automatically detects and creates achievements when users hit milestones
 */

import { api } from "@/lib/habitApi";

export interface AchievementTrigger {
  type: "first_completion" | "7_day_streak" | "30_day_streak" | "90_day_streak" | "morning_stack_complete" | "focus_master" | "consistency_king";
  title: string;
  description: string;
  habitId?: string;
}

class AchievementDetectionService {
  /**
   * Check if user has unlocked any achievements after completing a habit
   */
  async checkHabitCompletionAchievements(habitId: string, habitTitle: string): Promise<AchievementTrigger | null> {
    try {
      // Get habit streak data
      const streakData = await api.getHabitStreak(habitId);
      const currentStreak = streakData.currentStreak || 0;

      // Check for first completion
      if (currentStreak === 1) {
        return {
          type: "first_completion",
          title: "First Step",
          description: `You completed "${habitTitle}" for the first time. This is just the beginning.`,
          habitId,
        };
      }

      // Check for 7-day streak
      if (currentStreak === 7) {
        return {
          type: "7_day_streak",
          title: "One Week Strong",
          description: `7 days of "${habitTitle}". You're building consistency.`,
          habitId,
        };
      }

      // Check for 30-day streak
      if (currentStreak === 30) {
        return {
          type: "30_day_streak",
          title: "This Is Who You Are",
          description: `30 days of "${habitTitle}". You're someone who shows up every day.`,
          habitId,
        };
      }

      // Check for 90-day streak
      if (currentStreak === 90) {
        return {
          type: "90_day_streak",
          title: "Legendary",
          description: `90 days of "${habitTitle}". Unstoppable momentum.`,
          habitId,
        };
      }

      return null;
    } catch (error) {
      console.error("Failed to check habit achievements:", error);
      return null;
    }
  }

  /**
   * Check if user completed their morning stack
   */
  async checkMorningStackComplete(): Promise<AchievementTrigger | null> {
    try {
      const response = await api.getHabits();
      const habits = response.habits || [];

      // Get morning habits (5am-12pm reminder times)
      const morningHabits = habits.filter((h: any) => {
        if (!h.reminderTime) return false;
        const hour = parseInt(h.reminderTime.split(":")[0]);
        return hour >= 5 && hour < 12;
      });

      if (morningHabits.length === 0) return null;

      // Check if all morning habits are completed today
      const allCompleted = morningHabits.every((h: any) => h.completedToday >= h.targetCount);

      if (allCompleted) {
        return {
          type: "morning_stack_complete",
          title: "Morning Warrior",
          description: "You completed your entire morning stack. You start the day with power.",
        };
      }

      return null;
    } catch (error) {
      console.error("Failed to check morning stack:", error);
      return null;
    }
  }

  /**
   * Check focus session achievements
   */
  async checkFocusAchievements(): Promise<AchievementTrigger | null> {
    try {
      const response = await api.getRecentSessions();
      const sessions = response.sessions || [];

      // Count focus sessions in last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const recentSessions = sessions.filter((s: any) => {
        const sessionDate = new Date(s.startTime);
        return sessionDate >= sevenDaysAgo && s.duration && s.duration >= 25 * 60; // At least 25 min
      });

      // Focus Master: 10+ focus sessions in 7 days
      if (recentSessions.length >= 10) {
        return {
          type: "focus_master",
          title: "Focus Master",
          description: "10 deep work sessions in 7 days. You protect your focus and do deep work.",
        };
      }

      return null;
    } catch (error) {
      console.error("Failed to check focus achievements:", error);
      return null;
    }
  }

  /**
   * Check consistency achievements (completing habits daily)
   */
  async checkConsistencyAchievements(): Promise<AchievementTrigger | null> {
    try {
      const response = await api.getHabits();
      const habits = response.habits || [];

      if (habits.length === 0) return null;

      // Check if ALL habits have been completed today
      const allHabitsCompleted = habits.every((h: any) => h.completedToday >= h.targetCount);

      // Check if this has happened for 7 consecutive days
      // This is a simplified check - in production you'd want to verify the actual dates
      const allHabitsHaveStreaks = habits.every((h: any) => {
        return h.currentStreak && h.currentStreak >= 7;
      });

      if (allHabitsCompleted && allHabitsHaveStreaks) {
        return {
          type: "consistency_king",
          title: "Consistency King",
          description: "7 days of completing ALL your habits. You never miss.",
        };
      }

      return null;
    } catch (error) {
      console.error("Failed to check consistency achievements:", error);
      return null;
    }
  }

  /**
   * Create achievement in database
   */
  async createAchievement(trigger: AchievementTrigger): Promise<any> {
    try {
      const response = await api.createAchievement({
        type: trigger.type,
        title: trigger.title,
        description: trigger.description,
        habitId: trigger.habitId || null,
      });

      console.log("Achievement unlocked:", trigger);
      return response.achievement;
    } catch (error) {
      console.error("Failed to create achievement:", error);
      return null;
    }
  }

  /**
   * Get next uncelebrated achievement to show
   */
  async getNextUncelebratedAchievement() {
    try {
      const response = await api.getUncelebratedAchievement();
      return response.achievement;
    } catch (error) {
      console.error("Failed to get uncelebrated achievement:", error);
      return null;
    }
  }

  /**
   * Mark achievement as celebrated
   */
  async markAchievementCelebrated(achievementId: string): Promise<void> {
    try {
      await api.markAchievementCelebrated(achievementId);
    } catch (error) {
      console.error("Failed to mark achievement celebrated:", error);
    }
  }
}

export const achievementService = new AchievementDetectionService();
