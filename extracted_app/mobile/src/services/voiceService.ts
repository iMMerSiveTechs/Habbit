/**
 * Voice Service
 *
 * Provides text-to-speech feedback for habit completions and reflections
 * Uses expo-speech for natural voice responses
 */

import * as Speech from "expo-speech";
import { Platform } from "react-native";

export interface VoiceOptions {
  rate?: number; // Speech rate (0.5 to 2.0)
  pitch?: number; // Voice pitch (0.5 to 2.0)
  language?: string; // Language code (e.g., "en-US")
}

export class VoiceService {
  private static isEnabled = true;
  private static defaultOptions: VoiceOptions = {
    rate: 1.0,
    pitch: 1.0,
    language: "en-US",
  };

  /**
   * Enable or disable voice feedback globally
   */
  static setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  /**
   * Check if voice is currently enabled
   */
  static getEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Speak text with optional custom options
   */
  static async speak(text: string, options?: VoiceOptions): Promise<void> {
    if (!this.isEnabled) return;

    const finalOptions = { ...this.defaultOptions, ...options };

    try {
      await Speech.speak(text, {
        rate: finalOptions.rate,
        pitch: finalOptions.pitch,
        language: finalOptions.language,
        voice: Platform.OS === "ios" ? "com.apple.ttsbundle.Samantha-compact" : undefined,
      });
    } catch (error) {
      console.error("Voice service error:", error);
    }
  }

  /**
   * Stop any ongoing speech
   */
  static async stop(): Promise<void> {
    try {
      await Speech.stop();
    } catch (error) {
      console.error("Voice service stop error:", error);
    }
  }

  /**
   * Check if speech is currently in progress
   */
  static async isSpeaking(): Promise<boolean> {
    try {
      return await Speech.isSpeakingAsync();
    } catch (error) {
      console.error("Voice service isSpeaking error:", error);
      return false;
    }
  }

  // --- Predefined Voice Responses ---

  /**
   * Celebrate habit completion
   */
  static async celebrateCompletion(habitTitle: string): Promise<void> {
    const messages = [
      `Great job completing ${habitTitle}!`,
      `${habitTitle} is done! You're on fire!`,
      `Awesome! ${habitTitle} completed.`,
      `Nice work on ${habitTitle}!`,
      `${habitTitle} checked off. Keep going!`,
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    await this.speak(randomMessage);
  }

  /**
   * Encourage user when starting a habit
   */
  static async encourageStart(habitTitle: string): Promise<void> {
    const messages = [
      `Time for ${habitTitle}. You've got this!`,
      `Let's do ${habitTitle}!`,
      `${habitTitle} time. Make it count!`,
      `Ready to crush ${habitTitle}?`,
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    await this.speak(randomMessage);
  }

  /**
   * Remind about upcoming habit
   */
  static async remindHabit(habitTitle: string): Promise<void> {
    const messages = [
      `Reminder: ${habitTitle} is coming up.`,
      `Don't forget about ${habitTitle}.`,
      `${habitTitle} scheduled soon.`,
      `Heads up: ${habitTitle} is next.`,
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    await this.speak(randomMessage);
  }

  /**
   * Celebrate streak milestone
   */
  static async celebrateStreak(days: number, habitTitle: string): Promise<void> {
    let message = "";

    if (days === 1) {
      message = `${habitTitle}: Day 1! Great start!`;
    } else if (days === 7) {
      message = `One week streak on ${habitTitle}! Amazing!`;
    } else if (days === 30) {
      message = `30 days of ${habitTitle}! That's a full month!`;
    } else if (days === 100) {
      message = `100 day streak on ${habitTitle}! Incredible!`;
    } else if (days === 365) {
      message = `One full year of ${habitTitle}! You're unstoppable!`;
    } else if (days % 10 === 0) {
      message = `${days} day streak on ${habitTitle}! Keep it up!`;
    } else {
      message = `${days} days in a row on ${habitTitle}!`;
    }

    await this.speak(message);
  }

  /**
   * Provide evening reflection summary
   */
  static async summarizeDay(completedCount: number, totalCount: number): Promise<void> {
    const percentage = Math.round((completedCount / totalCount) * 100);

    let message = "";

    if (percentage === 100) {
      message = `Perfect day! You completed all ${totalCount} habits.`;
    } else if (percentage >= 80) {
      message = `Great day! ${completedCount} out of ${totalCount} habits completed.`;
    } else if (percentage >= 50) {
      message = `Good effort. ${completedCount} out of ${totalCount} habits done.`;
    } else {
      message = `Tomorrow is a new day. ${completedCount} out of ${totalCount} habits completed today.`;
    }

    await this.speak(message);
  }

  /**
   * Read flow session summary
   */
  static async summarizeFlowSession(durationMinutes: number): Promise<void> {
    let message = "";

    if (durationMinutes < 5) {
      message = "Flow session complete! Even a short burst helps.";
    } else if (durationMinutes < 15) {
      message = `${durationMinutes} minutes of flow. Nice focus!`;
    } else if (durationMinutes < 30) {
      message = `${durationMinutes} minutes of deep work. Excellent!`;
    } else if (durationMinutes < 60) {
      message = `Wow! ${durationMinutes} minutes in the zone. That's impressive!`;
    } else {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      message = `${hours} hour${hours > 1 ? "s" : ""} ${minutes > 0 ? `and ${minutes} minutes` : ""} of flow. Incredible focus!`;
    }

    await this.speak(message);
  }

  /**
   * Motivational message for skipped habits
   */
  static async motivateAfterSkip(habitTitle: string): Promise<void> {
    const messages = [
      `${habitTitle} was skipped, but tomorrow is a fresh start.`,
      `No worries about ${habitTitle}. Get back on track tomorrow.`,
      `${habitTitle} can wait. Focus on what you did accomplish today.`,
      `Don't stress about ${habitTitle}. Progress isn't always perfect.`,
    ];

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    await this.speak(randomMessage);
  }

  /**
   * Welcome message for morning routine
   */
  static async greetMorning(): Promise<void> {
    const hour = new Date().getHours();

    let message = "";

    if (hour < 6) {
      message = "Early bird! Let's make today count.";
    } else if (hour < 12) {
      message = "Good morning! Ready to build great habits today?";
    } else if (hour < 17) {
      message = "Good afternoon! Let's keep the momentum going.";
    } else if (hour < 21) {
      message = "Good evening! Time to wrap up your daily habits.";
    } else {
      message = "Good night! Don't forget your evening reflection.";
    }

    await this.speak(message);
  }
}
