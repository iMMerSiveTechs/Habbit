import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  X,
  Check,
  Flame,
  TrendingUp,
  Calendar,
  Clock,
  Edit3,
  Heart,
  Smile,
  Meh,
  Frown,
  Star,
  Target,
  Award,
  AlertTriangle,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { GlassCard } from "@/components/GlassCard";
import { WeeklyHeatmap } from "@/components/WeeklyHeatmap";
import { api } from "@/lib/habitApi";
import { NotificationActionHandler } from "@/services/notificationActionHandler";
import { AdaptiveIntelligenceService } from "@/services/adaptiveIntelligence";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "HabitDetailScreen">;

interface HabitCompletion {
  id: string;
  completedAt: string;
  mood?: number;
  note?: string;
}

interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  completionRate: number;
  averageMood?: number;
}

const MOOD_OPTIONS = [
  { value: 1, icon: Frown, color: "#FF3B30", label: "Struggled" },
  { value: 2, icon: Meh, color: "#FF9500", label: "Okay" },
  { value: 3, icon: Smile, color: "#00D4FF", label: "Good" },
  { value: 4, icon: Star, color: "#FFD700", label: "Great" },
  { value: 5, icon: Heart, color: "#FF00E5", label: "Amazing" },
];

export default function HabitDetailScreen({ route, navigation }: Props) {
  const { habitId } = route.params;

  const [habit, setHabit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [stats, setStats] = useState<HabitStats | null>(null);
  const [completions, setCompletions] = useState<HabitCompletion[]>([]);
  const [skipStats, setSkipStats] = useState<{
    totalSkips: number;
    consecutiveSkips: number;
    skipRate: number;
  } | null>(null);

  // Completion flow state
  const [showCompletionFlow, setShowCompletionFlow] = useState(false);
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [completionNote, setCompletionNote] = useState("");

  useEffect(() => {
    loadHabitData();
  }, [habitId]);

  const loadHabitData = async () => {
    try {
      setLoading(true);

      // Load habit details directly by ID
      const habitResponse = await api.getHabit(habitId);
      setHabit(habitResponse.habit);

      // Load streak data
      const streakResponse = await api.getHabitStreak(habitId);

      // Calculate stats
      const completionCount = streakResponse.completions?.length || 0;
      const targetDays = 30; // Last 30 days

      setStats({
        currentStreak: streakResponse.currentStreak || 0,
        longestStreak: streakResponse.longestStreak || 0,
        totalCompletions: completionCount,
        completionRate: (completionCount / targetDays) * 100,
      });

      // Load recent completions
      setCompletions(streakResponse.completions || []);

      // Load skip stats
      const skipData = await NotificationActionHandler.getSkipStats(habitId);
      setSkipStats(skipData);
    } catch (error) {
      console.error("Failed to load habit data:", error);
      Alert.alert("Error", "Failed to load habit details");
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    if (!habit) return;

    try {
      setCompleting(true);

      // Complete the habit with mood and note
      await api.completeHabit(habitId, selectedMood || undefined, completionNote || undefined);

      // Log engagement event for smart notifications
      AdaptiveIntelligenceService.logHabitComplete(habitId);

      // Celebration feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Reload data
      await loadHabitData();

      // Close completion flow
      setShowCompletionFlow(false);
      setSelectedMood(null);
      setCompletionNote("");

      // Show success message
      Alert.alert(
        "🎉 Great Job!",
        `${habit.title} completed! Keep the momentum going!`,
        [{ text: "Awesome!", style: "default" }]
      );
    } catch (error) {
      console.error("Failed to complete habit:", error);
      Alert.alert("Error", "Failed to complete habit");
    } finally {
      setCompleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const getMoodIcon = (mood: number) => {
    const moodOption = MOOD_OPTIONS.find(m => m.value === mood);
    return moodOption || MOOD_OPTIONS[2]; // Default to Smile
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#00D4FF" />
            <Text className="text-white/60 mt-4">Loading habit...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (!habit) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center">
            <Text className="text-white/60">Habit not found</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        {/* Header */}
        <View className="px-6 py-4 flex-row items-center justify-between border-b border-white/5">
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <X size={24} color="#ffffff" />
          </TouchableOpacity>

          <Text className="text-white text-lg font-bold">Habit Details</Text>

          <TouchableOpacity onPress={() => {
            navigation.navigate("EditHabit", { habitId });
          }}>
            <Edit3 size={20} color="#00D4FF" />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Habit Title Card */}
          <View className="px-6 py-6">
            <GlassCard intensity="medium" className="p-6">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-1">
                  <Text className="text-white text-2xl font-bold mb-2">
                    {habit.title}
                  </Text>
                  {habit.description && (
                    <Text className="text-white/60 text-sm">
                      {habit.description}
                    </Text>
                  )}
                </View>
                <View
                  className="w-16 h-16 rounded-full items-center justify-center"
                  style={{ backgroundColor: `${habit.color}20` }}
                >
                  <Target size={32} color={habit.color || "#00D4FF"} />
                </View>
              </View>

              {/* Quick Stats */}
              <View className="flex-row items-center justify-between mt-4 pt-4 border-t border-white/10">
                <View className="items-center flex-1">
                  <View className="flex-row items-center mb-1">
                    <Flame size={16} color="#FF9500" />
                    <Text className="text-white/60 text-xs ml-1">Streak</Text>
                  </View>
                  <Text className="text-white text-2xl font-bold">
                    {stats?.currentStreak || 0}
                  </Text>
                </View>

                <View className="items-center flex-1">
                  <View className="flex-row items-center mb-1">
                    <TrendingUp size={16} color="#00D4FF" />
                    <Text className="text-white/60 text-xs ml-1">Rate</Text>
                  </View>
                  <Text className="text-white text-2xl font-bold">
                    {Math.round(stats?.completionRate || 0)}%
                  </Text>
                </View>

                <View className="items-center flex-1">
                  <View className="flex-row items-center mb-1">
                    <Award size={16} color="#FFD700" />
                    <Text className="text-white/60 text-xs ml-1">Best</Text>
                  </View>
                  <Text className="text-white text-2xl font-bold">
                    {stats?.longestStreak || 0}
                  </Text>
                </View>
              </View>
            </GlassCard>
          </View>

          {/* Skip Stats Warning */}
          {skipStats && skipStats.consecutiveSkips >= 3 && (
            <View className="px-6 mb-6">
              <GlassCard intensity="medium" className="p-4" style={{ backgroundColor: "rgba(255, 59, 48, 0.1)" }}>
                <View className="flex-row items-start">
                  <AlertTriangle size={24} color="#FF3B30" />
                  <View className="flex-1 ml-3">
                    <Text className="text-white font-bold mb-1">
                      {skipStats.consecutiveSkips >= 7
                        ? "Need a Break?"
                        : skipStats.consecutiveSkips >= 5
                        ? "Let's Adjust"
                        : "Having Trouble?"}
                    </Text>
                    <Text className="text-white/80 text-sm">
                      {skipStats.consecutiveSkips >= 7
                        ? `You've skipped this habit ${skipStats.consecutiveSkips} times. Consider taking a break and coming back refreshed.`
                        : skipStats.consecutiveSkips >= 5
                        ? `${skipStats.consecutiveSkips} skips in a row. Maybe try a different time or reduce frequency?`
                        : `${skipStats.consecutiveSkips} consecutive skips. Want to try a different time?`}
                    </Text>
                    {skipStats.skipRate > 50 && (
                      <Text className="text-white/60 text-xs mt-2">
                        Skip rate: {Math.round(skipStats.skipRate)}% (last 30 days)
                      </Text>
                    )}
                  </View>
                </View>
              </GlassCard>
            </View>
          )}

          {/* Complete Button */}
          {!showCompletionFlow && (
            <View className="px-6 mb-6">
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowCompletionFlow(true);
                }}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[habit.color || "#00D4FF", "#8B5CF6"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 16,
                    padding: 20,
                    alignItems: "center",
                  }}
                >
                  <View className="flex-row items-center">
                    <Check size={24} color="#FFF" strokeWidth={3} />
                    <Text className="text-white text-xl font-bold ml-2">
                      Mark as Complete
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          )}

          {/* Completion Flow */}
          {showCompletionFlow && (
            <View className="px-6 mb-6">
              <GlassCard intensity="medium" className="p-6">
                <Text className="text-white text-lg font-bold mb-4">
                  How did it go?
                </Text>

                {/* Mood Selection */}
                <View className="mb-4">
                  <Text className="text-white/60 text-sm mb-3">Select your mood</Text>
                  <View className="flex-row justify-between">
                    {MOOD_OPTIONS.map((mood) => {
                      const Icon = mood.icon;
                      const isSelected = selectedMood === mood.value;

                      return (
                        <TouchableOpacity
                          key={mood.value}
                          onPress={() => {
                            setSelectedMood(mood.value);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                          className="items-center"
                          style={{
                            padding: 12,
                            borderRadius: 12,
                            backgroundColor: isSelected ? `${mood.color}20` : "rgba(30, 35, 45, 0.5)",
                            borderWidth: isSelected ? 2 : 1,
                            borderColor: isSelected ? mood.color : "rgba(255, 255, 255, 0.1)",
                          }}
                        >
                          <Icon size={24} color={isSelected ? mood.color : "#ffffff60"} />
                          <Text
                            className="text-xs mt-1"
                            style={{ color: isSelected ? mood.color : "#ffffff60" }}
                          >
                            {mood.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Notes */}
                <View className="mb-4">
                  <Text className="text-white/60 text-sm mb-2">Add a note (optional)</Text>
                  <TextInput
                    value={completionNote}
                    onChangeText={setCompletionNote}
                    placeholder="What made this great? Any challenges?"
                    placeholderTextColor="#ffffff30"
                    multiline
                    numberOfLines={3}
                    className="text-white px-4 py-3 rounded-xl"
                    style={{
                      backgroundColor: "rgba(30, 35, 45, 0.5)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.1)",
                      textAlignVertical: "top",
                    }}
                  />
                </View>

                {/* Action Buttons */}
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => {
                      setShowCompletionFlow(false);
                      setSelectedMood(null);
                      setCompletionNote("");
                    }}
                    className="flex-1 py-3 rounded-xl items-center"
                    style={{
                      backgroundColor: "rgba(30, 35, 45, 0.5)",
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    <Text className="text-white/70 font-semibold">Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleComplete}
                    disabled={completing}
                    className="flex-1"
                  >
                    <LinearGradient
                      colors={["#00D4FF", "#00FFB3"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        borderRadius: 12,
                        padding: 12,
                        alignItems: "center",
                      }}
                    >
                      <Text className="text-white font-bold">
                        {completing ? "Saving..." : "Complete"}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            </View>
          )}

          {/* Completion Heatmap */}
          {completions.length > 0 && (
            <View className="px-6 mb-6">
              <WeeklyHeatmap
                completionDates={completions.map((c) => c.completedAt)}
                title={`${habit.title} Activity`}
                weeksToShow={12}
              />
            </View>
          )}

          {/* Recent History */}
          <View className="px-6 mb-6">
            <Text className="text-white text-lg font-bold mb-3">Recent Completions</Text>

            {completions.length === 0 ? (
              <GlassCard intensity="light" className="p-8 items-center">
                <Calendar size={48} color="rgba(255,255,255,0.2)" />
                <Text className="text-white/60 text-center mt-4">
                  No completions yet.{"\n"}Start building your streak!
                </Text>
              </GlassCard>
            ) : (
              completions.slice(0, 10).map((completion) => {
                const moodData = completion.mood ? getMoodIcon(completion.mood) : null;
                const MoodIcon = moodData?.icon;

                return (
                  <GlassCard key={completion.id} intensity="medium" className="p-4 mb-2">
                    <View className="flex-row items-start">
                      <View className="flex-1">
                        <View className="flex-row items-center mb-1">
                          <Check size={16} color="#00FFB3" />
                          <Text className="text-white font-semibold ml-2">
                            {formatDate(completion.completedAt)}
                          </Text>
                        </View>

                        {completion.note && (
                          <Text className="text-white/60 text-sm mt-2">
                            {completion.note}
                          </Text>
                        )}
                      </View>

                      {MoodIcon && moodData && (
                        <View
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: `${moodData.color}20` }}
                        >
                          <MoodIcon size={20} color={moodData.color} />
                        </View>
                      )}
                    </View>
                  </GlassCard>
                );
              })
            )}
          </View>

          {/* Schedule Info */}
          {habit.reminderTime && (
            <View className="px-6 mb-6">
              <Text className="text-white text-lg font-bold mb-3">Schedule</Text>
              <GlassCard intensity="medium" className="p-4">
                <View className="flex-row items-center">
                  <Clock size={20} color="#8B5CF6" />
                  <Text className="text-white ml-3">
                    Reminder at {habit.reminderTime}
                  </Text>
                </View>
                {habit.recurringType && (
                  <View className="flex-row items-center mt-2">
                    <Calendar size={20} color="#8B5CF6" />
                    <Text className="text-white ml-3 capitalize">
                      {habit.recurringType} habit
                    </Text>
                  </View>
                )}
              </GlassCard>
            </View>
          )}

          <View className="h-32" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
