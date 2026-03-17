import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "@/components/GlassCard";
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Zap,
  Target,
  Award,
  BarChart3,
  Share2,
  ArrowLeft,
} from "lucide-react-native";
import { api } from "@/lib/habitApi";
import { SocialSharingService } from "@/services/socialSharingService";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";

interface AdvancedAnalytics {
  totalHabits: number;
  totalCompletions: number;
  averageCompletionRate: number;
  bestStreak: number;
  currentStreak: number;
  totalFocusMinutes: number;
  averageFocusPerDay: number;
  mostProductiveDay: string;
  mostProductiveTime: string;
  weeklyTrend: "up" | "down" | "stable";
  completionsByDay: { day: string; count: number }[];
  completionsByHour: { hour: number; count: number }[];
  habitPerformance: {
    habitId: string;
    title: string;
    completionRate: number;
    streak: number;
    category: string;
  }[];
  insights: {
    type: "success" | "warning" | "info";
    title: string;
    message: string;
  }[];
}

const { width } = Dimensions.get("window");

export default function AdvancedAnalyticsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<AdvancedAnalytics | null>(null);
  const [timeRange, setTimeRange] = useState<"week" | "month" | "all">("week");

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      // Fetch habits and calculate advanced metrics
      const habitsResponse = await api.getHabits();
      const focusResponse = await api.getRecentSessions();

      const habits = habitsResponse.habits || [];
      const sessions = focusResponse.sessions || [];

      // Calculate analytics
      const analytics = calculateAdvancedAnalytics(habits, sessions, timeRange);
      setAnalytics(analytics);
    } catch (error) {
      console.error("Failed to load advanced analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const handleShare = async () => {
    if (!analytics) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await SocialSharingService.shareWeeklyProgress(
      analytics.averageCompletionRate,
      analytics.totalCompletions,
      analytics.totalFocusMinutes
    );
  };

  const calculateAdvancedAnalytics = (
    habits: any[],
    sessions: any[],
    range: "week" | "month" | "all"
  ): AdvancedAnalytics => {
    const now = new Date();
    const rangeStart = new Date();

    if (range === "week") {
      rangeStart.setDate(now.getDate() - 7);
    } else if (range === "month") {
      rangeStart.setDate(now.getDate() - 30);
    } else {
      rangeStart.setFullYear(2020); // Far past date
    }

    // Filter events within range
    const allEvents = habits.flatMap((h) =>
      (h.events || []).filter((e: any) => new Date(e.completedAt) >= rangeStart)
    );

    // Total completions
    const totalCompletions = allEvents.length;

    // Calculate completion rate
    const daysInRange = Math.ceil((now.getTime() - rangeStart.getTime()) / (1000 * 60 * 60 * 24));
    const expectedCompletions = habits.length * daysInRange;
    const averageCompletionRate = expectedCompletions > 0
      ? Math.round((totalCompletions / expectedCompletions) * 100)
      : 0;

    // Find best and current streaks
    let bestStreak = 0;
    let currentStreak = 0;
    habits.forEach((h) => {
      if (h.streak > bestStreak) bestStreak = h.streak;
      if (h.completedToday) currentStreak = Math.max(currentStreak, h.streak);
    });

    // Calculate focus metrics
    const focusSessions = sessions.filter((s: any) => new Date(s.startTime) >= rangeStart);
    const totalFocusMinutes = focusSessions.reduce(
      (sum: number, s: any) => sum + (s.duration ? Math.floor(s.duration / 60) : 0),
      0
    );
    const averageFocusPerDay = daysInRange > 0 ? Math.round(totalFocusMinutes / daysInRange) : 0;

    // Completions by day of week
    const completionsByDay = Array.from({ length: 7 }, (_, i) => ({
      day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][i],
      count: 0,
    }));
    allEvents.forEach((e: any) => {
      const day = new Date(e.completedAt).getDay();
      completionsByDay[day].count++;
    });

    // Completions by hour
    const completionsByHour = Array.from({ length: 24 }, (_, i) => ({ hour: i, count: 0 }));
    allEvents.forEach((e: any) => {
      const hour = new Date(e.completedAt).getHours();
      completionsByHour[hour].count++;
    });

    // Most productive day and time
    const mostProductiveDay =
      completionsByDay.reduce((max, d) => (d.count > max.count ? d : max)).day;
    const mostProductiveHour = completionsByHour.reduce((max, h) =>
      h.count > max.count ? h : max
    );
    const mostProductiveTime =
      mostProductiveHour.hour < 12
        ? `${mostProductiveHour.hour} AM`
        : mostProductiveHour.hour === 12
        ? "12 PM"
        : `${mostProductiveHour.hour - 12} PM`;

    // Weekly trend (compare last 7 days to previous 7 days)
    const last7Days = allEvents.filter(
      (e: any) => new Date(e.completedAt) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    ).length;
    const previous7Days = allEvents.filter((e: any) => {
      const date = new Date(e.completedAt);
      return (
        date > new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) &&
        date <= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      );
    }).length;

    const weeklyTrend: "up" | "down" | "stable" =
      last7Days > previous7Days ? "up" : last7Days < previous7Days ? "down" : "stable";

    // Habit performance
    const habitPerformance = habits.map((h) => {
      const habitEvents = (h.events || []).filter(
        (e: any) => new Date(e.completedAt) >= rangeStart
      );
      const completionRate = daysInRange > 0
        ? Math.round((habitEvents.length / daysInRange) * 100)
        : 0;
      return {
        habitId: h.id,
        title: h.title,
        completionRate,
        streak: h.streak || 0,
        category: h.category || "general",
      };
    }).sort((a, b) => b.completionRate - a.completionRate);

    // Generate insights
    const insights = [];

    if (weeklyTrend === "up") {
      insights.push({
        type: "success" as const,
        title: "Upward Trend",
        message: `You're ${Math.round(((last7Days - previous7Days) / previous7Days) * 100)}% more consistent than last week!`,
      });
    } else if (weeklyTrend === "down") {
      insights.push({
        type: "warning" as const,
        title: "Dip in Performance",
        message: "Your completion rate dropped this week. Let's get back on track!",
      });
    }

    if (averageCompletionRate >= 80) {
      insights.push({
        type: "success" as const,
        title: "Excellent Consistency",
        message: `${averageCompletionRate}% completion rate is outstanding! Keep it up!`,
      });
    } else if (averageCompletionRate < 50) {
      insights.push({
        type: "warning" as const,
        title: "Room for Improvement",
        message: "Focus on completing at least 50% of your habits daily.",
      });
    }

    if (totalFocusMinutes > 0) {
      insights.push({
        type: "info" as const,
        title: "Deep Work Champion",
        message: `${totalFocusMinutes} minutes of focused work. That's ${Math.round(totalFocusMinutes / 60)} hours of productivity!`,
      });
    }

    if (habitPerformance.length > 0) {
      const topHabit = habitPerformance[0];
      if (topHabit.completionRate >= 90) {
        insights.push({
          type: "success" as const,
          title: "Star Performer",
          message: `"${topHabit.title}" has a ${topHabit.completionRate}% completion rate!`,
        });
      }
    }

    return {
      totalHabits: habits.length,
      totalCompletions,
      averageCompletionRate,
      bestStreak,
      currentStreak,
      totalFocusMinutes,
      averageFocusPerDay,
      mostProductiveDay,
      mostProductiveTime,
      weeklyTrend,
      completionsByDay,
      completionsByHour: completionsByHour.filter((h) => h.count > 0),
      habitPerformance,
      insights,
    };
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#00D4FF" />
            <Text className="text-white/60 mt-4">Loading advanced analytics...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!analytics) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center p-6">
            <Text className="text-white text-lg text-center">
              No analytics available yet. Start tracking habits to see detailed insights!
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
      <LinearGradient colors={["#050813", "#0A0F1C", "#0D1929"]} style={{ flex: 1 }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00D4FF" />
            }
          >
            {/* Header */}
            <View className="px-5 pt-6 pb-4">
              <View className="flex-row items-center mb-4">
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    navigation.goBack();
                  }}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.2)",
                    marginRight: 12,
                  }}
                >
                  <ArrowLeft size={20} color="#00D4FF" />
                </Pressable>
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: "#00D4FF20" }}
                >
                  <BarChart3 size={24} color="#00D4FF" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-3xl font-bold">Advanced Analytics</Text>
                  <Text className="text-white/60 text-sm mt-1">
                    Deep insights into your habits
                  </Text>
                </View>
                <Pressable
                  onPress={handleShare}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.2)",
                  }}
                >
                  <Share2 size={20} color="#00D4FF" />
                </Pressable>
              </View>
            </View>

            {/* Key Metrics */}
            <View className="px-5 mb-6">
              <GlassCard intensity="medium" className="p-6">
                <View className="flex-row items-center mb-4">
                  <Target size={20} color="#00D4FF" />
                  <Text className="text-white text-lg font-semibold ml-2">Key Metrics</Text>
                </View>

                <View className="flex-row flex-wrap justify-between">
                  <View className="w-[48%] mb-4">
                    <Text className="text-white/40 text-xs mb-1">Total Completions</Text>
                    <Text className="text-3xl font-bold text-cyan-400">
                      {analytics.totalCompletions}
                    </Text>
                  </View>
                  <View className="w-[48%] mb-4">
                    <Text className="text-white/40 text-xs mb-1">Completion Rate</Text>
                    <Text className="text-3xl font-bold text-violet-400">
                      {analytics.averageCompletionRate}%
                    </Text>
                  </View>
                  <View className="w-[48%] mb-4">
                    <Text className="text-white/40 text-xs mb-1">Best Streak</Text>
                    <Text className="text-3xl font-bold text-magenta-400">
                      {analytics.bestStreak} days
                    </Text>
                  </View>
                  <View className="w-[48%] mb-4">
                    <Text className="text-white/40 text-xs mb-1">Focus Time</Text>
                    <Text className="text-3xl font-bold text-orange-400">
                      {Math.round(analytics.totalFocusMinutes / 60)}h
                    </Text>
                  </View>
                </View>

                {/* Trend Indicator */}
                <View className="flex-row items-center mt-2 pt-4 border-t border-white/10">
                  {analytics.weeklyTrend === "up" ? (
                    <>
                      <TrendingUp size={16} color="#00FFB3" />
                      <Text className="text-green-400 text-sm ml-2">Trending up this week</Text>
                    </>
                  ) : analytics.weeklyTrend === "down" ? (
                    <>
                      <TrendingDown size={16} color="#FF6B6B" />
                      <Text className="text-red-400 text-sm ml-2">Dip this week</Text>
                    </>
                  ) : (
                    <Text className="text-white/60 text-sm">Steady performance</Text>
                  )}
                </View>
              </GlassCard>
            </View>

            {/* Insights */}
            {analytics.insights.length > 0 && (
              <View className="px-5 mb-6">
                <Text className="text-white text-xl font-bold mb-4">Insights</Text>
                {analytics.insights.map((insight, index) => (
                  <GlassCard key={index} intensity="medium" className="p-4 mb-3">
                    <View className="flex-row items-start">
                      {insight.type === "success" && <Award size={20} color="#00FFB3" />}
                      {insight.type === "warning" && <TrendingDown size={20} color="#FF6B6B" />}
                      {insight.type === "info" && <Zap size={20} color="#00D4FF" />}
                      <View className="ml-3 flex-1">
                        <Text
                          className="font-semibold mb-1"
                          style={{
                            color:
                              insight.type === "success"
                                ? "#00FFB3"
                                : insight.type === "warning"
                                ? "#FF6B6B"
                                : "#00D4FF",
                          }}
                        >
                          {insight.title}
                        </Text>
                        <Text className="text-white/70 text-sm">{insight.message}</Text>
                      </View>
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}

            {/* Productivity Patterns */}
            <View className="px-5 mb-6">
              <Text className="text-white text-xl font-bold mb-4">Productivity Patterns</Text>
              <GlassCard intensity="medium" className="p-5">
                <View className="flex-row items-center mb-4">
                  <Calendar size={18} color="#8B5CF6" />
                  <Text className="text-white font-semibold ml-2">Most Productive Day</Text>
                </View>
                <Text className="text-3xl font-bold text-violet-400 mb-4">
                  {analytics.mostProductiveDay}
                </Text>

                <View className="flex-row items-center mb-4">
                  <Clock size={18} color="#FF00E5" />
                  <Text className="text-white font-semibold ml-2">Most Productive Time</Text>
                </View>
                <Text className="text-3xl font-bold text-magenta-400">
                  {analytics.mostProductiveTime}
                </Text>
              </GlassCard>
            </View>

            {/* Completions by Day Chart */}
            {analytics.completionsByDay.some((d) => d.count > 0) && (
              <View className="px-5 mb-6">
                <Text className="text-white text-xl font-bold mb-4">Weekly Pattern</Text>
                <GlassCard intensity="medium" className="p-5">
                  <View className="flex-row items-end justify-between" style={{ height: 150 }}>
                    {analytics.completionsByDay.map((day, index) => {
                      const maxCount = Math.max(...analytics.completionsByDay.map(d => d.count), 1);
                      const heightPercent = (day.count / maxCount) * 100;
                      return (
                        <View key={index} className="items-center flex-1">
                          <View
                            style={{
                              width: 32,
                              height: `${heightPercent}%`,
                              backgroundColor: "#00D4FF",
                              borderRadius: 4,
                              marginBottom: 8,
                              opacity: 0.8,
                            }}
                          />
                          <Text className="text-white/60 text-xs">{day.day}</Text>
                          <Text className="text-white/40 text-xs">{day.count}</Text>
                        </View>
                      );
                    })}
                  </View>
                </GlassCard>
              </View>
            )}

            {/* Top Performing Habits */}
            {analytics.habitPerformance.length > 0 && (
              <View className="px-5 mb-6">
                <Text className="text-white text-xl font-bold mb-4">Habit Performance</Text>
                {analytics.habitPerformance.slice(0, 5).map((habit, index) => (
                  <GlassCard key={habit.habitId} intensity="medium" className="p-4 mb-3">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-white font-semibold mb-1">{habit.title}</Text>
                        <Text className="text-white/60 text-sm">
                          {habit.streak} day streak
                        </Text>
                      </View>
                      <View className="items-end">
                        <Text
                          className="text-2xl font-bold"
                          style={{
                            color:
                              habit.completionRate >= 80
                                ? "#00FFB3"
                                : habit.completionRate >= 50
                                ? "#FFD700"
                                : "#FF6B6B",
                          }}
                        >
                          {habit.completionRate}%
                        </Text>
                        <Text className="text-white/40 text-xs">completion</Text>
                      </View>
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
