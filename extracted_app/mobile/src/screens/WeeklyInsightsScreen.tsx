import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TrendingUp, Zap, Calendar, Target, Award, AlertCircle, Lightbulb } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "@/components/GlassCard";
import { aiService } from "@/services/aiService";
import { useNavigation } from "@react-navigation/native";

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

export default function WeeklyInsightsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState<WeeklyInsight[]>([]);
  const [patterns, setPatterns] = useState<PatternAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      setLoading(true);
      const [weeklyInsights, patternAnalysis, recs] = await Promise.all([
        aiService.generateWeeklyInsights(),
        aiService.analyzePatterns(),
        aiService.generateRecommendations(),
      ]);

      setInsights(weeklyInsights);
      setPatterns(patternAnalysis);
      setRecommendations(recs);
    } catch (error) {
      console.error("Failed to load insights:", error);
    } finally {
      setLoading(false);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "pattern":
        return TrendingUp;
      case "celebration":
        return Award;
      case "warning":
        return AlertCircle;
      case "recommendation":
        return Lightbulb;
      default:
        return Target;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case "pattern":
        return "#00D4FF";
      case "celebration":
        return "#FFD700";
      case "warning":
        return "#FF6B6B";
      case "recommendation":
        return "#8B5CF6";
      default:
        return "#00D4FF";
    }
  };

  const getConsistencyMessage = (score: number) => {
    if (score >= 80) return "Outstanding! You're a consistency machine.";
    if (score >= 60) return "Solid work! You're building momentum.";
    if (score >= 40) return "Good start! Keep pushing forward.";
    return "It's okay. Every expert was once a beginner.";
  };

  const getConsistencyColor = (score: number) => {
    if (score >= 80) return "#00D4FF";
    if (score >= 60) return "#8B5CF6";
    if (score >= 40) return "#FFD700";
    return "#FF6B6B";
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#00D4FF" />
            <Text className="text-white/60 mt-4">Analyzing your patterns...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="py-6">
            <TouchableOpacity
              onPress={() => {
                navigation.goBack();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              className="mb-4"
            >
              <Text className="text-cyan-400">← Back</Text>
            </TouchableOpacity>
            <Text className="text-white text-3xl font-bold mb-2">Weekly Insights</Text>
            <Text className="text-white/60 text-base">AI-powered analysis of your progress</Text>
          </View>

          {/* Consistency Score */}
          {patterns && (
            <GlassCard intensity="medium" className="p-6 mb-5">
              <View className="items-center">
                <Text className="text-white/60 text-sm mb-2">Consistency Score</Text>
                <View className="relative w-32 h-32 items-center justify-center mb-4">
                  <View
                    className="absolute w-32 h-32 rounded-full"
                    style={{
                      backgroundColor: `${getConsistencyColor(patterns.consistencyScore)}20`,
                      borderWidth: 8,
                      borderColor: getConsistencyColor(patterns.consistencyScore),
                    }}
                  />
                  <Text className="text-white text-4xl font-bold">{patterns.consistencyScore}%</Text>
                </View>
                <Text className="text-white/80 text-center">
                  {getConsistencyMessage(patterns.consistencyScore)}
                </Text>
              </View>
            </GlassCard>
          )}

          {/* Pattern Analysis */}
          {patterns && (
            <GlassCard intensity="medium" className="p-5 mb-5">
              <View className="flex-row items-center mb-4">
                <TrendingUp size={24} color="#00D4FF" />
                <Text className="text-white text-xl font-bold ml-2">Your Patterns</Text>
              </View>

              <View className="gap-3">
                <View className="flex-row items-center justify-between bg-white/5 rounded-xl p-3">
                  <Text className="text-white/60">Best Day:</Text>
                  <Text className="text-cyan-400 font-bold">{patterns.bestDay}</Text>
                </View>

                <View className="flex-row items-center justify-between bg-white/5 rounded-xl p-3">
                  <Text className="text-white/60">Best Time:</Text>
                  <Text className="text-cyan-400 font-bold">{patterns.bestTime}</Text>
                </View>

                <View className="flex-row items-center justify-between bg-white/5 rounded-xl p-3">
                  <Text className="text-white/60">Top Habit:</Text>
                  <Text className="text-cyan-400 font-bold text-right flex-1 ml-2">
                    {patterns.topPerformingHabit}
                  </Text>
                </View>

                {patterns.strugglingHabit !== "All good" && (
                  <View className="flex-row items-center justify-between bg-white/5 rounded-xl p-3">
                    <Text className="text-white/60">Needs Focus:</Text>
                    <Text className="text-yellow-400 font-bold text-right flex-1 ml-2">
                      {patterns.strugglingHabit}
                    </Text>
                  </View>
                )}
              </View>

              {patterns.insights.length > 0 && (
                <View className="mt-4 pt-4 border-t border-white/10">
                  {patterns.insights.map((insight, index) => (
                    <View key={index} className="flex-row mb-2 last:mb-0">
                      <Text className="text-cyan-400 mr-2">•</Text>
                      <Text className="text-white/80 flex-1">{insight}</Text>
                    </View>
                  ))}
                </View>
              )}
            </GlassCard>
          )}

          {/* AI Insights */}
          {insights.length > 0 && (
            <View className="mb-5">
              <Text className="text-white text-xl font-bold mb-3 px-2">This Week</Text>
              {insights.map((insight, index) => {
                const Icon = getInsightIcon(insight.type);
                const color = getInsightColor(insight.type);

                return (
                  <GlassCard key={index} intensity="medium" className="p-5 mb-3">
                    <View className="flex-row items-start">
                      <View
                        className="w-12 h-12 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <Icon size={24} color={color} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-white font-bold text-lg mb-1">{insight.title}</Text>
                        <Text className="text-white/70 mb-2">{insight.message}</Text>
                        {insight.actionable && insight.action && (
                          <View className="bg-white/5 rounded-lg p-3 mt-2">
                            <Text className="text-cyan-400 text-sm font-semibold mb-1">
                              💡 Action:
                            </Text>
                            <Text className="text-white/80 text-sm">{insight.action}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </GlassCard>
                );
              })}
            </View>
          )}

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <View className="mb-5">
              <Text className="text-white text-xl font-bold mb-3 px-2">Recommendations</Text>
              {recommendations.map((rec, index) => (
                <GlassCard key={index} intensity="medium" className="p-4 mb-3">
                  <View className="flex-row items-start">
                    <Lightbulb size={20} color="#8B5CF6" className="mr-2 mt-1" />
                    <Text className="text-white/80 flex-1">{rec}</Text>
                  </View>
                </GlassCard>
              ))}
            </View>
          )}

          {/* Refresh Button */}
          <TouchableOpacity
            onPress={async () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              await loadInsights();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            }}
            activeOpacity={0.8}
            className="mb-8"
          >
            <LinearGradient
              colors={["#00D4FF", "#8B5CF6"] as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 12,
                padding: 16,
                alignItems: "center",
              }}
            >
              <Text className="text-white font-bold text-lg">Refresh Insights</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
