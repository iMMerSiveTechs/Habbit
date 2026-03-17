import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Moon, Star, TrendingUp, Heart, CheckCircle2, Sparkles } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "@/components/GlassCard";
import { MissedItemsReview } from "@/components/MissedItemsReview";
import { api as habitApi } from "@/lib/habitApi";
import { api } from "@/lib/api";
import { useNavigation } from "@react-navigation/native";
import { VoiceService } from "@/services/voiceService";

type DayRating = "amazing" | "good" | "okay" | "rough";

interface DailyReflection {
  id: string;
  dayRating: DayRating;
  oneWin: string;
  oneLearning: string | null;
  gratitude: string | null;
  habitsCompleted: number;
  focusMinutes: number;
}

export default function EveningReflectionScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [todayStats, setTodayStats] = useState({ habits: 0, focus: 0 });

  // Form state
  const [rating, setRating] = useState<DayRating | null>(null);
  const [oneWin, setOneWin] = useState("");
  const [oneLearning, setOneLearning] = useState("");
  const [gratitude, setGratitude] = useState("");
  const [existingReflection, setExistingReflection] = useState<DailyReflection | null>(null);
  const [missedItems, setMissedItems] = useState<any[]>([]);
  const [loadingMissedItems, setLoadingMissedItems] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reflectionRes, habitsRes, focusRes] = await Promise.all([
        habitApi.getTodayReflection().catch(() => ({ reflection: null })),
        habitApi.getHabits().catch(() => ({ habits: [] })),
        habitApi.getRecentSessions().catch(() => ({ sessions: [] })),
      ]);

      // Check if they already reflected today
      if (reflectionRes.reflection) {
        setExistingReflection(reflectionRes.reflection);
        setStep(5); // Skip to completion
      }

      // Calculate today's stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const habitsCompleted = habitsRes.habits?.reduce((count: number, habit: any) => {
        const todayEvents = habit.events?.filter((e: any) => {
          const eventDate = new Date(e.completedAt);
          return eventDate >= today;
        }) || [];
        return count + todayEvents.length;
      }, 0) || 0;

      const focusMinutes = focusRes.sessions?.reduce((total: number, session: any) => {
        const sessionDate = new Date(session.startTime);
        if (sessionDate >= today && session.duration) {
          return total + Math.floor(session.duration / 60);
        }
        return total;
      }, 0) || 0;

      setTodayStats({ habits: habitsCompleted, focus: focusMinutes });
    } catch (error) {
      console.error("Failed to load evening data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRatingSelect = (selectedRating: DayRating) => {
    setRating(selectedRating);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => setStep(2), 300);
  };

  const handleNextToLearning = () => {
    if (!oneWin.trim()) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(3);
  };

  const handleNextToGratitude = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(4);
  };

  const handleNextToMissedItems = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Check if there are any missed items to review
    try {
      setLoadingMissedItems(true);
      const data = await api.get<{ missedItems: any[] }>("/api/adaptive/missed-items/today");
      const unrespondedItems = data.missedItems?.filter((item: any) => !item.responded) || [];

      if (unrespondedItems.length > 0) {
        setMissedItems(unrespondedItems);
        setStep(4.5); // Go to missed items review
      } else {
        // No missed items, skip to completion
        await handleSubmit();
      }
    } catch (error) {
      console.error("Failed to load missed items:", error);
      // Error, skip to completion
      await handleSubmit();
    } finally {
      setLoadingMissedItems(false);
    }
  };

  const handleMissedItemsComplete = async () => {
    // After reviewing missed items, save the reflection
    await handleSubmit();
  };

  const handleSubmit = async () => {
    if (!rating || !oneWin.trim()) return;

    try {
      setLoading(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await habitApi.createDailyReflection({
        dayRating: rating,
        oneWin,
        oneLearning: oneLearning || undefined,
        gratitude: gratitude || undefined,
      });

      setStep(5);
    } catch (error: any) {
      console.error("Failed to save reflection:", error);
      // If unauthorized (session expired), close the screen silently — auth redirect is handled globally
      if (error?.message?.includes("401")) {
        navigation.goBack();
        return;
      }
      alert("Failed to save your reflection. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Voice feedback summarizing the day
    const totalHabits = todayStats.habits;
    // Estimate total habits scheduled for today (this is simplified)
    const estimatedTotal = Math.max(totalHabits, 5); // Assume at least 5 habits
    await VoiceService.summarizeDay(totalHabits, estimatedTotal);

    navigation.goBack();
  };

  const getRatingConfig = (ratingType: DayRating) => {
    const configs = {
      amazing: {
        icon: Sparkles,
        color: "#00D4FF",
        label: "Amazing",
        gradient: ["#00D4FF", "#FF00E5"],
        message: "You crushed it today!",
      },
      good: {
        icon: Star,
        color: "#8B5CF6",
        label: "Good",
        gradient: ["#8B5CF6", "#00D4FF"],
        message: "Solid day!",
      },
      okay: {
        icon: CheckCircle2,
        color: "#FFD700",
        label: "Okay",
        gradient: ["#FFD700", "#FF8C00"],
        message: "Progress is progress",
      },
      rough: {
        icon: Heart,
        color: "#FF6B6B",
        label: "Rough",
        gradient: ["#FF6B6B", "#FF00E5"],
        message: "Tomorrow is a fresh start",
      },
    };
    return configs[ratingType];
  };

  if (loading && step === 1) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#00D4FF" />
            <Text className="text-white/60 mt-4">Loading your day...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
            {/* Step 1: Day Rating */}
            {step === 1 && (
              <View className="flex-1 justify-center py-8">
                <View className="items-center mb-12">
                  <View className="bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full p-4 mb-6">
                    <Moon size={48} color="#FFF" />
                  </View>
                  <Text className="text-4xl font-bold text-white text-center mb-2">
                    How Was Today?
                  </Text>
                  <Text className="text-white/60 text-lg text-center px-4">
                    Take a moment to reflect on your day
                  </Text>
                </View>

                {/* Today's Stats */}
                <GlassCard intensity="medium" className="p-4 mb-6">
                  <Text className="text-white/60 text-sm mb-3 text-center">Today you completed:</Text>
                  <View className="flex-row justify-around">
                    <View className="items-center">
                      <Text className="text-3xl font-bold text-cyan-400">{todayStats.habits}</Text>
                      <Text className="text-white/60 text-sm">Habits</Text>
                    </View>
                    <View className="items-center">
                      <Text className="text-3xl font-bold text-violet-400">{todayStats.focus}</Text>
                      <Text className="text-white/60 text-sm">Focus Min</Text>
                    </View>
                  </View>
                </GlassCard>

                <View className="gap-4">
                  {(["amazing", "good", "okay", "rough"] as DayRating[]).map((ratingType) => {
                    const config = getRatingConfig(ratingType);
                    const Icon = config.icon;

                    return (
                      <TouchableOpacity
                        key={ratingType}
                        onPress={() => handleRatingSelect(ratingType)}
                        activeOpacity={0.7}
                      >
                        <GlassCard intensity="medium" className="p-6">
                          <View className="flex-row items-center">
                            <View
                              className="w-16 h-16 rounded-full items-center justify-center mr-4"
                              style={{ backgroundColor: `${config.color}20` }}
                            >
                              <Icon size={32} color={config.color} />
                            </View>
                            <View className="flex-1">
                              <Text className="text-2xl font-bold text-white mb-1">
                                {config.label}
                              </Text>
                              <Text className="text-white/40 text-sm">{config.message}</Text>
                            </View>
                          </View>
                        </GlassCard>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Step 2: One Win */}
            {step === 2 && rating && (
              <View className="flex-1 justify-center py-8">
                <View className="items-center mb-8">
                  <View className="bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full p-4 mb-6">
                    <Star size={48} color="#FFF" />
                  </View>
                  <Text className="text-3xl font-bold text-white text-center mb-2">
                    One Win From Today
                  </Text>
                  <Text className="text-white/60 text-center px-4">
                    What&apos;s one thing that went well?
                  </Text>
                </View>

                <GlassCard intensity="medium" className="p-6 mb-6">
                  <TextInput
                    value={oneWin}
                    onChangeText={setOneWin}
                    placeholder="e.g., Had a great workout, finished the report, connected with a friend..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    className="text-white text-lg"
                    style={{
                      minHeight: 100,
                      textAlignVertical: "top",
                    }}
                    multiline
                    autoFocus
                  />
                </GlassCard>

                <TouchableOpacity
                  onPress={handleNextToLearning}
                  disabled={!oneWin.trim()}
                  activeOpacity={0.8}
                  className="mb-4"
                >
                  <LinearGradient
                    colors={!oneWin.trim() ? ["#333", "#333"] : ["#00D4FF", "#8B5CF6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      borderRadius: 12,
                      padding: 16,
                      alignItems: "center",
                      opacity: !oneWin.trim() ? 0.5 : 1,
                    }}
                  >
                    <Text className="text-white font-bold text-lg">Continue</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setStep(1)} className="items-center py-2">
                  <Text className="text-white/40">Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 3: Learning */}
            {step === 3 && (
              <View className="flex-1 justify-center py-8">
                <View className="items-center mb-8">
                  <View className="bg-gradient-to-r from-violet-500 to-magenta-500 rounded-full p-4 mb-6">
                    <TrendingUp size={48} color="#FFF" />
                  </View>
                  <Text className="text-3xl font-bold text-white text-center mb-2">
                    Make Tomorrow Better
                  </Text>
                  <Text className="text-white/60 text-center px-4">
                    What would make tomorrow even better?
                  </Text>
                  <Text className="text-white/40 text-sm text-center px-4 mt-2">
                    (Optional - skip if nothing comes to mind)
                  </Text>
                </View>

                <GlassCard intensity="medium" className="p-6 mb-6">
                  <TextInput
                    value={oneLearning}
                    onChangeText={setOneLearning}
                    placeholder="e.g., Start earlier, take breaks, ask for help..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    className="text-white text-lg"
                    style={{
                      minHeight: 100,
                      textAlignVertical: "top",
                    }}
                    multiline
                    autoFocus
                  />
                </GlassCard>

                <TouchableOpacity onPress={handleNextToGratitude} activeOpacity={0.8} className="mb-4">
                  <LinearGradient
                    colors={["#8B5CF6", "#FF00E5"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      borderRadius: 12,
                      padding: 16,
                      alignItems: "center",
                    }}
                  >
                    <Text className="text-white font-bold text-lg">
                      {oneLearning.trim() ? "Continue" : "Skip"}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setStep(2)} className="items-center py-2">
                  <Text className="text-white/40">Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 4: Gratitude */}
            {step === 4 && (
              <View className="flex-1 justify-center py-8">
                <View className="items-center mb-8">
                  <View className="bg-gradient-to-r from-magenta-500 to-cyan-500 rounded-full p-4 mb-6">
                    <Heart size={48} color="#FFF" />
                  </View>
                  <Text className="text-3xl font-bold text-white text-center mb-2">
                    One Thing You&apos;re Grateful For
                  </Text>
                  <Text className="text-white/60 text-center px-4">
                    End your day with appreciation
                  </Text>
                  <Text className="text-white/40 text-sm text-center px-4 mt-2">
                    (Optional)
                  </Text>
                </View>

                <GlassCard intensity="medium" className="p-6 mb-6">
                  <TextInput
                    value={gratitude}
                    onChangeText={setGratitude}
                    placeholder="e.g., My health, my family, a good meal..."
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    className="text-white text-lg"
                    style={{
                      minHeight: 100,
                      textAlignVertical: "top",
                    }}
                    multiline
                    autoFocus
                  />
                </GlassCard>

                <TouchableOpacity
                  onPress={handleNextToMissedItems}
                  disabled={loadingMissedItems}
                  activeOpacity={0.8}
                  className="mb-4"
                >
                  <LinearGradient
                    colors={["#FF00E5", "#00D4FF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      borderRadius: 12,
                      padding: 16,
                      alignItems: "center",
                    }}
                  >
                    {loadingMissedItems ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text className="text-white font-bold text-lg">Complete Reflection</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setStep(3)} className="items-center py-2">
                  <Text className="text-white/40">Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 4.5: Missed Items Review */}
            {step === 4.5 && missedItems.length > 0 && (
              <View className="flex-1 py-8">
                <View className="items-center mb-8">
                  <View className="bg-gradient-to-r from-orange-500 to-violet-500 rounded-full p-4 mb-6">
                    <TrendingUp size={48} color="#FFF" />
                  </View>
                  <Text className="text-3xl font-bold text-white text-center mb-2">
                    Let&apos;s Learn Together
                  </Text>
                  <Text className="text-white/60 text-center px-4">
                    I noticed you missed a few things today. Help me understand what got in the way so I can adapt to your life.
                  </Text>
                </View>

                <MissedItemsReview
                  missedItems={missedItems.map((item) => ({
                    id: item.id,
                    itemType: item.itemType,
                    itemTitle: item.itemTitle,
                    scheduledTime: item.scheduledTime,
                    responded: item.responded,
                    responseType: item.responseType,
                  }))}
                  onComplete={handleMissedItemsComplete}
                />
              </View>
            )}

            {/* Step 5: Completion */}
            {step === 5 && (
              <View className="flex-1 justify-center py-8">
                <View className="items-center mb-8">
                  <View className="bg-gradient-to-r from-violet-500 to-cyan-500 rounded-full p-6 mb-6">
                    <Moon size={64} color="#FFF" />
                  </View>
                  <Text className="text-4xl font-bold text-white text-center mb-4">
                    Rest Well
                  </Text>
                  <Text className="text-white/60 text-center px-8 text-lg mb-8">
                    Tomorrow is a new canvas
                  </Text>

                  {existingReflection ? (
                    <GlassCard intensity="medium" className="p-6 mb-6 w-full">
                      <Text className="text-white/40 text-sm mb-3">Today&apos;s reflection:</Text>
                      <View className="mb-4">
                        <Text className="text-white/60 text-xs mb-1">Your Win:</Text>
                        <Text className="text-white text-lg">{existingReflection.oneWin}</Text>
                      </View>
                      {existingReflection.oneLearning && (
                        <View className="mb-4">
                          <Text className="text-white/60 text-xs mb-1">Tomorrow&apos;s Focus:</Text>
                          <Text className="text-white text-lg">{existingReflection.oneLearning}</Text>
                        </View>
                      )}
                      <View className="flex-row justify-around mt-4 pt-4 border-t border-white/10">
                        <View className="items-center">
                          <Text className="text-2xl font-bold text-cyan-400">
                            {existingReflection.habitsCompleted}
                          </Text>
                          <Text className="text-white/60 text-xs">Habits</Text>
                        </View>
                        <View className="items-center">
                          <Text className="text-2xl font-bold text-violet-400">
                            {existingReflection.focusMinutes}
                          </Text>
                          <Text className="text-white/60 text-xs">Focus Min</Text>
                        </View>
                      </View>
                    </GlassCard>
                  ) : (
                    <View className="w-full mb-6">
                      <GlassCard intensity="medium" className="p-4 mb-3">
                        <View className="flex-row items-center justify-between">
                          <Text className="text-white/60">Today&apos;s Rating:</Text>
                          <Text className="text-white font-bold text-lg">
                            {rating && getRatingConfig(rating).label}
                          </Text>
                        </View>
                      </GlassCard>

                      <GlassCard intensity="medium" className="p-4">
                        <View className="flex-row justify-around">
                          <View className="items-center">
                            <Text className="text-2xl font-bold text-cyan-400">{todayStats.habits}</Text>
                            <Text className="text-white/60 text-xs">Habits Done</Text>
                          </View>
                          <View className="items-center">
                            <Text className="text-2xl font-bold text-violet-400">{todayStats.focus}</Text>
                            <Text className="text-white/60 text-xs">Focus Min</Text>
                          </View>
                        </View>
                      </GlassCard>
                    </View>
                  )}
                </View>

                <TouchableOpacity onPress={handleFinish} activeOpacity={0.8}>
                  <LinearGradient
                    colors={["#8B5CF6", "#00D4FF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      borderRadius: 12,
                      padding: 20,
                      alignItems: "center",
                    }}
                  >
                    <Text className="text-white font-bold text-xl">Done</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
