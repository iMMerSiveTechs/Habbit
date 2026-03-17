/**
 * AI Intelligence Service
 * Integrates with OpenAI/Anthropic for smart insights, pattern analysis, and coaching
 */

import { fetch } from "expo/fetch";
import { api } from "@/lib/habitApi";

interface InsightData {
  habits: any[];
  reflections: any[];
  intentions: any[];
  focusSessions: any[];
  achievements: any[];
}

interface WeeklyInsight {
  type: "pattern" | "recommendation" | "celebration" | "warning";
  title: string;
  message: string;
  confidence: number;
  actionable: boolean;
  action?: string;
}

interface PatternAnalysis {
  bestDay: string;
  bestTime: string;
  worstDay: string;
  consistencyScore: number;
  topPerformingHabit: string;
  strugglingHabit: string;
  insights: string[];
}

class AIService {
  private apiKey: string | null = null;
  private provider: "openai" | "anthropic" | null = null;

  /**
   * Initialize AI service with API key
   * Users should add their API key via ENV tab in Vibecode app
   */
  initialize(apiKey: string, provider: "openai" | "anthropic" = "openai") {
    this.apiKey = apiKey;
    this.provider = provider;
  }

  /**
   * Check if AI is configured
   */
  isConfigured(): boolean {
    return this.apiKey !== null && this.provider !== null;
  }

  /**
   * Generate weekly insight summary
   */
  async generateWeeklyInsights(): Promise<WeeklyInsight[]> {
    try {
      this.autoInitialize();
      // Gather data from last 7 days
      const data = await this.gatherWeeklyData();

      // If no AI configured, return rule-based insights
      if (!this.isConfigured()) {
        return this.generateRuleBasedInsights(data);
      }

      // Generate AI-powered insights
      return await this.generateAIInsights(data);
    } catch (error) {
      console.error("Failed to generate weekly insights:", error);
      return [];
    }
  }

  /**
   * Analyze patterns in user behavior
   */
  async analyzePatterns(): Promise<PatternAnalysis> {
    try {
      const data = await this.gatherWeeklyData();

      // Analyze habit completion by day
      const dayScores = this.calculateDayScores(data);
      const bestDay = Object.keys(dayScores).reduce((a, b) => dayScores[a] > dayScores[b] ? a : b);
      const worstDay = Object.keys(dayScores).reduce((a, b) => dayScores[a] < dayScores[b] ? a : b);

      // Analyze habit completion by time
      const timeScores = this.calculateTimeScores(data);
      const bestTime = Object.keys(timeScores).reduce((a, b) => timeScores[a] > timeScores[b] ? a : b);

      // Calculate consistency score (0-100)
      const consistencyScore = this.calculateConsistency(data);

      // Find top and struggling habits
      const habitStats = this.calculateHabitStats(data);
      const topPerformingHabit = habitStats.top?.title || "None yet";
      const strugglingHabit = habitStats.struggling?.title || "All good";

      // Generate insights
      const insights = this.generatePatternInsights({
        bestDay,
        worstDay,
        bestTime,
        consistencyScore,
        topPerformingHabit,
        strugglingHabit,
        data
      });

      return {
        bestDay,
        bestTime,
        worstDay,
        consistencyScore,
        topPerformingHabit,
        strugglingHabit,
        insights
      };
    } catch (error) {
      console.error("Failed to analyze patterns:", error);
      return {
        bestDay: "Unknown",
        bestTime: "Unknown",
        worstDay: "Unknown",
        consistencyScore: 0,
        topPerformingHabit: "Unknown",
        strugglingHabit: "Unknown",
        insights: []
      };
    }
  }

  /**
   * Generate predictive recommendations
   */
  async generateRecommendations(): Promise<string[]> {
    try {
      const patterns = await this.analyzePatterns();
      const data = await this.gatherWeeklyData();

      const recommendations: string[] = [];

      // Recommendation based on best day
      if (patterns.bestDay) {
        recommendations.push(
          `Your best day is ${patterns.bestDay}. Schedule your most important tasks on ${patterns.bestDay}s.`
        );
      }

      // Recommendation based on best time
      if (patterns.bestTime) {
        recommendations.push(
          `You're most consistent at ${patterns.bestTime}. Try to do your hardest habits during this window.`
        );
      }

      // Recommendation based on consistency
      if (patterns.consistencyScore < 50) {
        recommendations.push(
          "Your consistency is below 50%. Consider reducing the number of habits to build momentum."
        );
      } else if (patterns.consistencyScore > 80) {
        recommendations.push(
          "You're crushing it with 80%+ consistency! Consider adding a new challenging habit."
        );
      }

      // Recommendation based on struggling habit
      if (patterns.strugglingHabit && patterns.strugglingHabit !== "All good") {
        recommendations.push(
          `"${patterns.strugglingHabit}" needs attention. Try doing it right after "${patterns.topPerformingHabit}" (habit stacking).`
        );
      }

      // Recommendation based on reflections
      const recentReflections = data.reflections.slice(0, 3);
      const roughDays = recentReflections.filter((r: any) => r.dayRating === "rough").length;
      if (roughDays >= 2) {
        recommendations.push(
          "You've had a tough few days. Be gentle with yourself. Focus on 1-2 core habits until energy returns."
        );
      }

      return recommendations;
    } catch (error) {
      console.error("Failed to generate recommendations:", error);
      return [];
    }
  }

  /**
   * Generate AI-powered coaching message
   */
  async generateCoachingMessage(context: string): Promise<string> {
    if (!this.isConfigured()) {
      return this.generateGenericCoaching(context);
    }

    try {
      // In production, this would call OpenAI/Anthropic API
      // For now, return smart rule-based messages
      return this.generateGenericCoaching(context);
    } catch (error) {
      console.error("Failed to generate coaching message:", error);
      return "Keep going! Every day is a new opportunity to show up for yourself.";
    }
  }

  // PRIVATE HELPER METHODS

  private async gatherWeeklyData(): Promise<InsightData> {
    const [habits, reflections, intentions, focusSessions, achievements] = await Promise.all([
      api.getHabits().catch(() => ({ habits: [] })),
      api.getRecentReflections().catch(() => ({ reflections: [] })),
      api.getTodayIntention().catch(() => ({ intention: null })),
      api.getRecentSessions().catch(() => ({ sessions: [] })),
      api.getAchievements().catch(() => ({ achievements: [] })),
    ]);

    return {
      habits: habits.habits || [],
      reflections: reflections.reflections || [],
      intentions: intentions.intention ? [intentions.intention] : [],
      focusSessions: focusSessions.sessions || [],
      achievements: achievements.achievements || [],
    };
  }

  private generateRuleBasedInsights(data: InsightData): WeeklyInsight[] {
    const insights: WeeklyInsight[] = [];

    // Completion rate insight
    const totalHabits = data.habits.length;
    const completedToday = data.habits.filter((h: any) => h.completedToday >= h.targetCount).length;
    const completionRate = totalHabits > 0 ? (completedToday / totalHabits) * 100 : 0;

    if (completionRate >= 80) {
      insights.push({
        type: "celebration",
        title: "Outstanding Performance",
        message: `You've completed ${Math.round(completionRate)}% of your habits today. You're unstoppable!`,
        confidence: 1.0,
        actionable: false,
      });
    } else if (completionRate < 30) {
      insights.push({
        type: "warning",
        title: "Need a Reset?",
        message: "Today's been tough. That's okay. Tomorrow is a fresh start.",
        confidence: 0.8,
        actionable: true,
        action: "Consider starting with just one easy habit tomorrow."
      });
    }

    // Streak insight
    const longestStreak = Math.max(...data.habits.map((h: any) => h.currentStreak || 0), 0);
    if (longestStreak >= 7) {
      insights.push({
        type: "celebration",
        title: "Streak Master",
        message: `Your longest streak is ${longestStreak} days. This is who you are now.`,
        confidence: 1.0,
        actionable: false,
      });
    }

    // Focus session insight
    if (data.focusSessions.length >= 5) {
      insights.push({
        type: "pattern",
        title: "Deep Work Champion",
        message: `${data.focusSessions.length} focus sessions this week. You protect your time.`,
        confidence: 0.9,
        actionable: false,
      });
    }

    // Recent achievements
    const recentAchievements = data.achievements.filter((a: any) => {
      const unlockedDate = new Date(a.unlockedAt);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return unlockedDate >= weekAgo;
    });

    if (recentAchievements.length > 0) {
      insights.push({
        type: "celebration",
        title: "Achievement Unlocked",
        message: `You unlocked ${recentAchievements.length} achievement${recentAchievements.length > 1 ? 's' : ''} this week!`,
        confidence: 1.0,
        actionable: false,
      });
    }

    return insights;
  }

  private autoInitialize(): void {
    if (this.isConfigured()) return;
    const openaiKey = process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY;
    const anthropicKey = process.env.EXPO_PUBLIC_VIBECODE_ANTHROPIC_API_KEY;
    if (openaiKey) {
      this.initialize(openaiKey, "openai");
    } else if (anthropicKey) {
      this.initialize(anthropicKey, "anthropic");
    }
  }

  private async generateAIInsights(data: InsightData): Promise<WeeklyInsight[]> {
    try {
      const habitsSummary = data.habits.map((h: any) =>
        `${h.title}: streak ${h.currentStreak || 0}, completions ${h.completionHistory?.length || 0}`
      ).join("; ");

      const reflectionsSummary = data.reflections.slice(0, 7).map((r: any) =>
        `${r.date}: ${r.dayRating}`
      ).join("; ");

      const prompt = `You are a personal habit coach. Analyze this user's weekly data and provide 3-5 actionable insights.

Habits: ${habitsSummary || "No habits yet"}
Reflections: ${reflectionsSummary || "No reflections yet"}
Focus sessions this week: ${data.focusSessions?.length || 0}

Return ONLY a valid JSON array (no markdown, no explanation) with this exact structure:
[{"type":"pattern"|"recommendation"|"celebration"|"warning","title":"short title","message":"1-2 sentence insight","confidence":0.8,"actionable":true,"action":"optional action text"}]`;

      let response: any;

      if (this.provider === "openai") {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            max_tokens: 800,
          }),
        });
        const json = await res.json() as any;
        response = json.choices?.[0]?.message?.content;
      } else if (this.provider === "anthropic") {
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.apiKey!,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: "claude-haiku-4-5",
            max_tokens: 800,
            messages: [{ role: "user", content: prompt }],
          }),
        });
        const json = await res.json() as any;
        response = json.content?.[0]?.text;
      }

      if (!response) return this.generateRuleBasedInsights(data);

      // Parse JSON safely
      const parsed = JSON.parse(response) as WeeklyInsight[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      return this.generateRuleBasedInsights(data);
    } catch (error) {
      console.error("AI insights failed, falling back to rule-based:", error);
      return this.generateRuleBasedInsights(data);
    }
  }

  private calculateDayScores(data: InsightData): Record<string, number> {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const scores: Record<string, number> = {};

    days.forEach(day => scores[day] = 0);

    // Calculate based on reflections
    data.reflections.forEach((r: any) => {
      const date = new Date(r.date);
      const dayName = days[date.getDay()];
      const ratingScore = r.dayRating === "amazing" ? 4 : r.dayRating === "good" ? 3 : r.dayRating === "okay" ? 2 : 1;
      scores[dayName] += ratingScore;
    });

    return scores;
  }

  private calculateTimeScores(data: InsightData): Record<string, number> {
    const timeSlots = {
      "Morning (6am-12pm)": 0,
      "Afternoon (12pm-6pm)": 0,
      "Evening (6pm-10pm)": 0,
      "Night (10pm-6am)": 0,
    };

    // Analyze habits by reminder time
    data.habits.forEach((h: any) => {
      if (!h.reminderTime) return;
      const hour = parseInt(h.reminderTime.split(":")[0]);
      const completionRate = h.currentStreak || 0;

      if (hour >= 6 && hour < 12) {
        timeSlots["Morning (6am-12pm)"] += completionRate;
      } else if (hour >= 12 && hour < 18) {
        timeSlots["Afternoon (12pm-6pm)"] += completionRate;
      } else if (hour >= 18 && hour < 22) {
        timeSlots["Evening (6pm-10pm)"] += completionRate;
      } else {
        timeSlots["Night (10pm-6am)"] += completionRate;
      }
    });

    return timeSlots;
  }

  private calculateConsistency(data: InsightData): number {
    if (data.reflections.length === 0) return 0;

    const last7Days = data.reflections.slice(0, 7);
    const totalHabitsPerDay = data.habits.length;

    if (totalHabitsPerDay === 0) return 100;

    const avgCompletionRate = last7Days.reduce((sum: number, r: any) => {
      return sum + (r.habitsCompleted / totalHabitsPerDay);
    }, 0) / last7Days.length;

    return Math.round(avgCompletionRate * 100);
  }

  private calculateHabitStats(data: InsightData) {
    if (data.habits.length === 0) return { top: null, struggling: null };

    const sortedByStreak = [...data.habits].sort((a: any, b: any) => {
      return (b.currentStreak || 0) - (a.currentStreak || 0);
    });

    return {
      top: sortedByStreak[0] || null,
      struggling: sortedByStreak[sortedByStreak.length - 1] || null,
    };
  }

  private generatePatternInsights(context: any): string[] {
    const insights: string[] = [];

    insights.push(
      `You're ${context.consistencyScore}% consistent. ${context.consistencyScore >= 70 ? "Excellent work!" : "There's room to grow."}`
    );

    insights.push(
      `Your best day is ${context.bestDay}. Your energy peaks mid-week.`
    );

    insights.push(
      `You complete ${context.consistencyScore}% of habits when you work on them in the ${context.bestTime.toLowerCase()}.`
    );

    if (context.topPerformingHabit !== "None yet") {
      insights.push(
        `"${context.topPerformingHabit}" is your anchor habit. Use it to build momentum for others.`
      );
    }

    return insights;
  }

  private generateGenericCoaching(context: string): string {
    const messages = [
      "You're building something real. Keep showing up.",
      "Every day you complete a habit, you're voting for the person you want to become.",
      "Consistency beats intensity. Small steps compound into massive change.",
      "You're not trying to be perfect. You're trying to be consistent.",
      "The best time to start was yesterday. The second best time is now.",
      "Your only competition is who you were yesterday.",
      "Progress isn't linear. Trust the process.",
      "You're becoming someone who never gives up.",
    ];

    return messages[Math.floor(Math.random() * messages.length)];
  }
}

export const aiService = new AIService();
