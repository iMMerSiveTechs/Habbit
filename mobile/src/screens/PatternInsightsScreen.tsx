import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "@/components/GlassCard";
import {
  TrendingDown,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle,
  ChevronRight,
  Lightbulb,
  X,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useNavigation } from "@react-navigation/native";
import { api } from "@/lib/habitApi";
import { api as apiClient } from "@/lib/api";

interface SkipPattern {
  id: string;
  itemType: "habit" | "todo";
  itemId: string;
  itemTitle: string;
  skipRate: number;
  totalMisses: number;
  commonSkipDays: string[];
  commonSkipTimes: string[];
  commonReasons: string[];
  suggestions: Suggestion[];
}

interface Suggestion {
  type: "time_adjustment" | "day_adjustment" | "frequency_adjustment";
  currentValue: string;
  suggestedValue: string;
  reason: string;
  confidence: number;
}

export default function PatternInsightsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [patterns, setPatterns] = useState<SkipPattern[]>([]);
  const [acceptingSuggestion, setAcceptingSuggestion] = useState<string | null>(null);

  useEffect(() => {
    loadPatterns();
  }, []);

  const loadPatterns = async () => {
    try {
      setLoading(true);
      const data = await apiClient.get<{ patterns: SkipPattern[] }>("/api/adaptive/patterns");
      setPatterns(data.patterns || []);
    } catch (error) {
      console.error("Failed to load patterns:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPatterns();
    setRefreshing(false);
  };

  const handleAcceptSuggestion = async (
    pattern: SkipPattern,
    suggestion: Suggestion
  ) => {
    try {
      setAcceptingSuggestion(pattern.id + suggestion.type);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Apply the suggestion based on type
      if (pattern.itemType === "habit") {
        if (suggestion.type === "time_adjustment") {
          // Update habit reminder time
          await api.updateHabit(pattern.itemId, {
            reminderTime: suggestion.suggestedValue,
          });
        } else if (suggestion.type === "day_adjustment") {
          // Update habit frequency days
          const dayNumbers = suggestion.suggestedValue.split(",").map((d) => {
            const dayMap: { [key: string]: number } = {
              Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
              Thursday: 4, Friday: 5, Saturday: 6
            };
            return dayMap[d.trim()] || 0;
          });
          await api.updateHabit(pattern.itemId, {
            recurringType: "weekly",
            recurringDays: dayNumbers,
          });
        } else if (suggestion.type === "frequency_adjustment") {
          // Update habit frequency
          await api.updateHabit(pattern.itemId, {
            frequency: suggestion.suggestedValue,
          });
        }
      } else if (pattern.itemType === "todo") {
        if (suggestion.type === "time_adjustment") {
          await apiClient.patch(`/api/todos/${pattern.itemId}`, {
            dueTime: suggestion.suggestedValue,
          });
        } else if (suggestion.type === "day_adjustment") {
          const dayNumbers = suggestion.suggestedValue.split(",").map((d: string) => {
            const dayMap: { [key: string]: number } = {
              Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3,
              Thursday: 4, Friday: 5, Saturday: 6,
            };
            return dayMap[d.trim()] ?? 0;
          });
          await apiClient.patch(`/api/todos/${pattern.itemId}`, {
            recurringDays: dayNumbers,
          });
        } else if (suggestion.type === "frequency_adjustment") {
          await apiClient.patch(`/api/todos/${pattern.itemId}`, {
            frequency: suggestion.suggestedValue,
          });
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadPatterns(); // Reload to see changes
    } catch (error) {
      console.error("Failed to accept suggestion:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setAcceptingSuggestion(null);
    }
  };

  const getSkipRateColor = (rate: number) => {
    if (rate < 20) return "#10B981"; // Green - good
    if (rate < 40) return "#FFD700"; // Yellow - ok
    if (rate < 60) return "#FF8C00"; // Orange - concerning
    return "#FF6B6B"; // Red - high skip rate
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.7) return "#00D4FF"; // Cyan - high confidence
    if (confidence >= 0.5) return "#8B5CF6"; // Violet - medium
    return "#FF8C00"; // Orange - low
  };

  const formatDays = (days: string[]) => {
    if (days.length === 0) return "No pattern yet";
    return days.join(", ");
  };

  const formatTimes = (times: string[]) => {
    if (times.length === 0) return "No pattern yet";
    return times.map((t) => {
      const hour = parseInt(t);
      if (hour === 0) return "12 AM";
      if (hour < 12) return `${hour} AM`;
      if (hour === 12) return "12 PM";
      return `${hour - 12} PM`;
    }).join(", ");
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#00D4FF" />
            <Text className="text-white/60 mt-4">Loading your patterns...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
      <LinearGradient colors={["#050813", "#0D1929"]} style={{ flex: 1 }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          {/* Header */}
          <View className="px-5 pt-4 pb-6 flex-row items-center justify-between">
            <View>
              <Text className="text-white text-3xl font-semibold">Pattern Insights</Text>
              <Text className="text-white/60 text-base mt-1">Learn from your behavior</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              className="w-10 h-10 items-center justify-center rounded-full bg-white/10"
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#00D4FF"
              />
            }
          >
            {patterns.length === 0 ? (
              <View className="flex-1 items-center justify-center px-8 py-20">
                <View className="bg-violet-500/20 p-6 rounded-full mb-6">
                  <TrendingDown size={48} color="#8B5CF6" />
                </View>
                <Text className="text-white text-2xl font-bold text-center mb-4">
                  No Patterns Yet
                </Text>
                <Text className="text-white/60 text-center text-base mb-6">
                  Keep using the app and responding to missed items during your evening reflection.
                  After a few days, I&apos;ll start detecting patterns and making smart suggestions.
                </Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                  <LinearGradient
                    colors={["#00D4FF", "#8B5CF6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      paddingVertical: 12,
                      paddingHorizontal: 24,
                      borderRadius: 12,
                    }}
                  >
                    <Text className="text-white font-semibold">Got It</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            ) : (
              <View className="px-5">
                {/* Summary Card */}
                <GlassCard className="p-5 mb-5">
                  <Text className="text-white/60 text-xs font-semibold mb-3">OVERVIEW</Text>
                  <View className="flex-row justify-around">
                    <View className="items-center">
                      <Text className="text-3xl font-bold text-cyan-400">{patterns.length}</Text>
                      <Text className="text-white/60 text-sm">Patterns</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-3xl font-bold text-violet-400">
                        {patterns.reduce((sum, p) => sum + p.suggestions.length, 0)}
                      </Text>
                      <Text className="text-white/60 text-sm">Suggestions</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-3xl font-bold text-magenta-400">
                        {patterns.reduce((sum, p) => sum + p.totalMisses, 0)}
                      </Text>
                      <Text className="text-white/60 text-sm">Total Misses</Text>
                    </View>
                  </View>
                </GlassCard>

                {/* Individual Pattern Cards */}
                {patterns.map((pattern) => (
                  <GlassCard key={pattern.id} className="p-5 mb-5">
                    {/* Pattern Header */}
                    <View className="flex-row items-center justify-between mb-4">
                      <View className="flex-1">
                        <Text className="text-white text-lg font-bold mb-1">
                          {pattern.itemTitle}
                        </Text>
                        <Text className="text-white/40 text-xs uppercase">
                          {pattern.itemType}
                        </Text>
                      </View>
                      <View className="items-center">
                        <Text
                          className="text-2xl font-bold"
                          style={{ color: getSkipRateColor(pattern.skipRate) }}
                        >
                          {pattern.skipRate}%
                        </Text>
                        <Text className="text-white/60 text-xs">Skip Rate</Text>
                      </View>
                    </View>

                    {/* Pattern Details */}
                    {pattern.commonSkipDays.length > 0 && (
                      <View className="mb-3 bg-white/5 rounded-xl p-3">
                        <View className="flex-row items-center mb-2">
                          <Calendar size={16} color="#FF8C00" />
                          <Text className="text-white/80 text-sm font-semibold ml-2">
                            Common Skip Days
                          </Text>
                        </View>
                        <Text className="text-white/60 text-sm">
                          {formatDays(pattern.commonSkipDays)}
                        </Text>
                      </View>
                    )}

                    {pattern.commonSkipTimes.length > 0 && (
                      <View className="mb-3 bg-white/5 rounded-xl p-3">
                        <View className="flex-row items-center mb-2">
                          <Clock size={16} color="#FFD700" />
                          <Text className="text-white/80 text-sm font-semibold ml-2">
                            Common Skip Times
                          </Text>
                        </View>
                        <Text className="text-white/60 text-sm">
                          {formatTimes(pattern.commonSkipTimes)}
                        </Text>
                      </View>
                    )}

                    {pattern.commonReasons.length > 0 && (
                      <View className="mb-3 bg-white/5 rounded-xl p-3">
                        <View className="flex-row items-center mb-2">
                          <AlertCircle size={16} color="#8B5CF6" />
                          <Text className="text-white/80 text-sm font-semibold ml-2">
                            Common Reasons
                          </Text>
                        </View>
                        <Text className="text-white/60 text-sm">
                          {pattern.commonReasons.join(", ")}
                        </Text>
                      </View>
                    )}

                    {/* Suggestions */}
                    {pattern.suggestions.length > 0 && (
                      <View className="mt-3 pt-3 border-t border-white/10">
                        <View className="flex-row items-center mb-3">
                          <Lightbulb size={18} color="#00D4FF" />
                          <Text className="text-white font-semibold ml-2">
                            Smart Suggestions
                          </Text>
                        </View>
                        {pattern.suggestions.map((suggestion, index) => (
                          <View
                            key={index}
                            className="mb-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4"
                          >
                            <View className="flex-row items-start justify-between mb-2">
                              <View className="flex-1 mr-3">
                                <Text className="text-white font-semibold mb-1">
                                  {suggestion.type === "time_adjustment" && "Try a different time"}
                                  {suggestion.type === "day_adjustment" && "Adjust your days"}
                                  {suggestion.type === "frequency_adjustment" && "Change frequency"}
                                </Text>
                                <Text className="text-white/70 text-sm mb-2">
                                  {suggestion.reason}
                                </Text>
                                <View className="flex-row items-center">
                                  <Text className="text-white/50 text-xs">
                                    Current: {suggestion.currentValue}
                                  </Text>
                                  <ChevronRight size={12} color="#FFFFFF80" className="mx-1" />
                                  <Text className="text-cyan-400 text-xs font-semibold">
                                    Suggested: {suggestion.suggestedValue}
                                  </Text>
                                </View>
                              </View>
                              <View
                                className="px-2 py-1 rounded-md"
                                style={{
                                  backgroundColor: `${getConfidenceColor(suggestion.confidence)}20`,
                                }}
                              >
                                <Text
                                  className="text-xs font-bold"
                                  style={{ color: getConfidenceColor(suggestion.confidence) }}
                                >
                                  {Math.round(suggestion.confidence * 100)}%
                                </Text>
                              </View>
                            </View>

                            <TouchableOpacity
                              onPress={() => handleAcceptSuggestion(pattern, suggestion)}
                              disabled={acceptingSuggestion === pattern.id + suggestion.type}
                              activeOpacity={0.7}
                            >
                              <LinearGradient
                                colors={["#00D4FF", "#8B5CF6"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{
                                  borderRadius: 8,
                                  padding: 10,
                                  alignItems: "center",
                                  flexDirection: "row",
                                  justifyContent: "center",
                                }}
                              >
                                {acceptingSuggestion === pattern.id + suggestion.type ? (
                                  <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                  <>
                                    <CheckCircle size={16} color="#FFFFFF" />
                                    <Text className="text-white font-semibold ml-2">
                                      Accept Suggestion
                                    </Text>
                                  </>
                                )}
                              </LinearGradient>
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
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
