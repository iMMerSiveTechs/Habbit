import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "@/components/GlassCard";
import { TrendingUp, CheckCircle, AlertCircle, Award, ArrowLeft } from "lucide-react-native";
import { api } from "@/lib/api";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import * as Haptics from "expo-haptics";

interface CategoryStat {
  category: string;
  label: string;
  emoji: string;
  totalHabits: number;
  completedToday: number;
  completionRate: number;
  totalStreakDays: number;
}

interface CategoryAnalytics {
  overall: {
    totalHabits: number;
    completedToday: number;
    remainingToday: number;
    completionRate: number;
  };
  categories: CategoryStat[];
}

export default function CategoryAnalyticsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<CategoryAnalytics | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.get<CategoryAnalytics>("/api/habits/analytics/categories");
      setAnalytics(response);
    } catch (error) {
      console.error("Failed to load category analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAnalytics();
    setRefreshing(false);
  };

  const getPerformanceIndicator = (rate: number) => {
    if (rate >= 80) return { label: "Excellent", color: "#00D4FF", emoji: "🟢" };
    if (rate >= 50) return { label: "Good", color: "#FFD700", emoji: "🟡" };
    return { label: "Needs Work", color: "#FF6B6B", emoji: "🔴" };
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#00D4FF" />
            <Text className="text-white/60 mt-4">Loading analytics...</Text>
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
              No analytics available yet. Start tracking habits to see insights!
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
                  style={{ backgroundColor: "#8B5CF620" }}
                >
                  <TrendingUp size={24} color="#8B5CF6" />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-3xl font-bold">Category Analytics</Text>
                  <Text className="text-white/60 text-sm mt-1">
                    Track performance across life areas
                  </Text>
                </View>
              </View>
            </View>

            {/* Today's Overview */}
            <View className="px-5 mb-6">
              <GlassCard intensity="medium" className="p-6">
                <View className="flex-row items-center mb-4">
                  <Award size={20} color="#00D4FF" />
                  <Text className="text-white text-lg font-semibold ml-2">Today&apos;s Overview</Text>
                </View>

                <View className="mb-4">
                  <View className="flex-row items-baseline mb-2">
                    <Text className="text-5xl font-bold text-cyan-400">
                      {analytics.overall.completionRate}%
                    </Text>
                    <Text className="text-white/60 ml-2 text-lg">complete</Text>
                  </View>

                  {/* Progress Bar */}
                  <View className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-3">
                    <LinearGradient
                      colors={["#00D4FF", "#8B5CF6", "#FF00E5"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        width: `${analytics.overall.completionRate}%`,
                        height: "100%",
                      }}
                    />
                  </View>

                  <View className="flex-row justify-between">
                    <View>
                      <Text className="text-white/40 text-xs mb-1">Completed</Text>
                      <Text className="text-white font-semibold text-lg">
                        {analytics.overall.completedToday}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-white/40 text-xs mb-1">Remaining</Text>
                      <Text className="text-white font-semibold text-lg">
                        {analytics.overall.remainingToday}
                      </Text>
                    </View>
                    <View>
                      <Text className="text-white/40 text-xs mb-1">Total</Text>
                      <Text className="text-white font-semibold text-lg">
                        {analytics.overall.totalHabits}
                      </Text>
                    </View>
                  </View>
                </View>
              </GlassCard>
            </View>

            {/* Category Breakdown */}
            <View className="px-5">
              <Text className="text-white text-xl font-bold mb-4">Category Breakdown</Text>

              {analytics.categories.length === 0 ? (
                <GlassCard intensity="medium" className="p-6 items-center">
                  <Text className="text-white/60 text-center">
                    No categories tracked yet. Add some habits to see analytics!
                  </Text>
                </GlassCard>
              ) : (
                <View className="gap-4">
                  {analytics.categories.map((category) => {
                    const indicator = getPerformanceIndicator(category.completionRate);

                    return (
                      <GlassCard key={category.category} intensity="medium" className="p-5">
                        {/* Category Header */}
                        <View className="flex-row items-start justify-between mb-3">
                          <View className="flex-1">
                            <View className="flex-row items-center mb-2">
                              <Text className="text-3xl mr-2">{category.emoji}</Text>
                              <Text className="text-white font-bold text-xl">
                                {category.label}
                              </Text>
                            </View>
                            <Text className="text-white/40 text-sm">
                              {category.totalHabits} {category.totalHabits === 1 ? "habit" : "habits"}
                            </Text>
                          </View>

                          {/* Completion Rate Badge */}
                          <View
                            className="px-4 py-2 rounded-full"
                            style={{ backgroundColor: `${indicator.color}20` }}
                          >
                            <Text
                              className="font-bold text-lg"
                              style={{ color: indicator.color }}
                            >
                              {category.completionRate}%
                            </Text>
                          </View>
                        </View>

                        {/* Progress Bar */}
                        <View className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                          <View
                            className="h-full rounded-full"
                            style={{
                              width: `${category.completionRate}%`,
                              backgroundColor: indicator.color,
                            }}
                          />
                        </View>

                        {/* Performance Indicator */}
                        <View className="flex-row items-center justify-between mb-3">
                          <View className="flex-row items-center">
                            {category.completionRate >= 80 ? (
                              <CheckCircle size={16} color={indicator.color} />
                            ) : (
                              <AlertCircle size={16} color={indicator.color} />
                            )}
                            <Text className="ml-2 text-sm" style={{ color: indicator.color }}>
                              {indicator.emoji} {indicator.label}
                            </Text>
                          </View>

                          {category.totalStreakDays > 0 && (
                            <View className="flex-row items-center">
                              <Text className="text-white/60 text-sm mr-1">
                                {category.totalStreakDays}
                              </Text>
                              <Text className="text-orange-400 text-sm">🔥</Text>
                            </View>
                          )}
                        </View>

                        {/* Stats */}
                        <View className="flex-row justify-between pt-3 border-t border-white/10">
                          <View>
                            <Text className="text-white/40 text-xs mb-1">Completed Today</Text>
                            <Text className="text-white font-semibold">
                              {category.completedToday} / {category.totalHabits}
                            </Text>
                          </View>
                          {category.totalStreakDays > 0 && (
                            <View>
                              <Text className="text-white/40 text-xs mb-1">Total Streak Days</Text>
                              <Text className="text-white font-semibold">
                                {category.totalStreakDays} days
                              </Text>
                            </View>
                          )}
                        </View>
                      </GlassCard>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Info Card */}
            <View className="px-5 mt-6 mb-8">
              <GlassCard intensity="light" className="p-4">
                <Text className="text-white/60 text-sm text-center">
                  Categories help you see which life areas need more attention. Aim for balance
                  across all areas for holistic growth.
                </Text>
              </GlassCard>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
