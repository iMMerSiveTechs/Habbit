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
import { Sunrise, Target, Zap, Coffee, Battery, BatteryLow } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "@/components/GlassCard";
import { api } from "@/lib/habitApi";
import { useNavigation } from "@react-navigation/native";

type MorningFeeling = "energized" | "good" | "tired" | "struggling";

interface Habit {
  id: string;
  title: string;
  color: string;
  reminderTime?: string | null;
}

interface DailyIntention {
  id: string;
  profileId: number;
  date: string;
  morningFeeling: MorningFeeling;
  oneBigWin: string;
  completed: boolean;
}

export default function MorningActivationScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [morningHabits, setMorningHabits] = useState<Habit[]>([]);

  // Form state
  const [feeling, setFeeling] = useState<MorningFeeling | null>(null);
  const [bigWin, setBigWin] = useState("");
  const [existingIntention, setExistingIntention] = useState<DailyIntention | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [intentionRes, habitsRes] = await Promise.all([
        api.getTodayIntention().catch(() => ({ intention: null })),
        api.getHabits().catch(() => ({ habits: [] })),
      ]);

      // Check if they've already set intention today
      if (intentionRes.intention) {
        setExistingIntention(intentionRes.intention);
        // Skip to confirmation
        setStep(4);
      }

      // Filter for morning habits (those with morning schedule or no specific time)
      const morning = habitsRes.habits?.filter((h: Habit) => {
        if (!h.reminderTime) return true; // Include habits without specific time
        const hour = parseInt(h.reminderTime.split(":")[0]);
        return hour >= 5 && hour < 12; // 5am - 11:59am
      }) || [];

      setMorningHabits(morning.slice(0, 5)); // Show max 5 morning habits
    } catch (error) {
      console.error("Failed to load morning data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFeelingSelect = (selectedFeeling: MorningFeeling) => {
    setFeeling(selectedFeeling);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setTimeout(() => setStep(2), 300);
  };

  const handleSubmit = async () => {
    if (!feeling || !bigWin.trim()) return;

    try {
      setLoading(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      await api.createDailyIntention({
        morningFeeling: feeling,
        oneBigWin: bigWin,
      });

      setStep(3);
      setTimeout(() => {
        setStep(4);
      }, 2000);
    } catch (error) {
      console.error("Failed to save intention:", error);
      alert("Failed to save your intention. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleStartDay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    navigation.navigate("TodaysPlan" as never);
  };

  const getFeelingConfig = (feelingType: MorningFeeling) => {
    const configs = {
      energized: {
        icon: Zap,
        color: "#00D4FF",
        label: "Energized",
        gradient: ["#00D4FF", "#FF00E5"],
      },
      good: {
        icon: Coffee,
        color: "#8B5CF6",
        label: "Good",
        gradient: ["#8B5CF6", "#00D4FF"],
      },
      tired: {
        icon: Battery,
        color: "#FFD700",
        label: "Tired",
        gradient: ["#FFD700", "#FF8C00"],
      },
      struggling: {
        icon: BatteryLow,
        color: "#FF6B6B",
        label: "Struggling",
        gradient: ["#FF6B6B", "#FF00E5"],
      },
    };
    return configs[feelingType];
  };

  if (loading && step === 1) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#00D4FF" />
            <Text className="text-white/60 mt-4">Loading your morning...</Text>
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
            {/* Step 1: Feeling Check */}
            {step === 1 && (
              <View className="flex-1 justify-center py-8">
                <View className="items-center mb-12">
                  <View className="bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full p-4 mb-6">
                    <Sunrise size={48} color="#FFF" />
                  </View>
                  <Text className="text-4xl font-bold text-white text-center mb-2">
                    Good Morning
                  </Text>
                  <Text className="text-white/60 text-lg text-center">
                    How are you feeling today?
                  </Text>
                </View>

                <View className="gap-4">
                  {(["energized", "good", "tired", "struggling"] as MorningFeeling[]).map((feelingType) => {
                    const config = getFeelingConfig(feelingType);
                    const Icon = config.icon;

                    return (
                      <TouchableOpacity
                        key={feelingType}
                        onPress={() => handleFeelingSelect(feelingType)}
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
                              <Text className="text-white/40 text-sm">
                                {feelingType === "energized" && "Ready to conquer the day"}
                                {feelingType === "good" && "Feeling positive and ready"}
                                {feelingType === "tired" && "Need some extra motivation"}
                                {feelingType === "struggling" && "It's okay, we'll go easy"}
                              </Text>
                            </View>
                          </View>
                        </GlassCard>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Step 2: Big Win */}
            {step === 2 && feeling && (
              <View className="flex-1 justify-center py-8">
                <View className="items-center mb-8">
                  <View className="bg-gradient-to-r from-cyan-500 to-magenta-500 rounded-full p-4 mb-6">
                    <Target size={48} color="#FFF" />
                  </View>
                  <Text className="text-3xl font-bold text-white text-center mb-2">
                    What&apos;s Your ONE Big Win?
                  </Text>
                  <Text className="text-white/60 text-center px-4">
                    What&apos;s the ONE thing that would make today feel successful?
                  </Text>
                </View>

                <GlassCard intensity="medium" className="p-6 mb-6">
                  <TextInput
                    value={bigWin}
                    onChangeText={setBigWin}
                    placeholder="e.g., Complete the project proposal"
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

                {/* Morning Habits Preview */}
                {morningHabits.length > 0 && (
                  <View className="mb-6">
                    <Text className="text-white/60 text-sm mb-3 px-2">
                      Your morning stack ({morningHabits.length} habits):
                    </Text>
                    <View className="gap-2">
                      {morningHabits.map((habit) => (
                        <GlassCard key={habit.id} intensity="light" className="px-4 py-3">
                          <View className="flex-row items-center">
                            <View
                              className="w-3 h-3 rounded-full mr-3"
                              style={{ backgroundColor: habit.color }}
                            />
                            <Text className="text-white text-sm flex-1">{habit.title}</Text>
                          </View>
                        </GlassCard>
                      ))}
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={!bigWin.trim() || loading}
                  activeOpacity={0.8}
                  className="mb-4"
                >
                  <LinearGradient
                    colors={!bigWin.trim() ? ["#333", "#333"] : ["#00D4FF", "#FF00E5"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      borderRadius: 12,
                      padding: 16,
                      alignItems: "center",
                      opacity: !bigWin.trim() ? 0.5 : 1,
                    }}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" />
                    ) : (
                      <Text className="text-white font-bold text-lg">Set My Intention</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setStep(1)} className="items-center py-2">
                  <Text className="text-white/40">Back</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 3: Processing Animation */}
            {step === 3 && (
              <View className="flex-1 items-center justify-center py-12">
                <View className="bg-gradient-to-r from-cyan-500 to-magenta-500 rounded-full p-6 mb-6">
                  <Target size={64} color="#FFF" />
                </View>
                <Text className="text-3xl font-bold text-white text-center mb-4">
                  Intention Set!
                </Text>
                <Text className="text-white/60 text-center px-8">
                  Today&apos;s focus: {bigWin}
                </Text>
              </View>
            )}

            {/* Step 4: Ready to Start */}
            {step === 4 && (
              <View className="flex-1 justify-center py-8">
                <View className="items-center mb-8">
                  <View className="bg-gradient-to-r from-cyan-500 to-magenta-500 rounded-full p-6 mb-6">
                    <Sunrise size={64} color="#FFF" />
                  </View>
                  <Text className="text-4xl font-bold text-white text-center mb-4">
                    You&apos;re All Set
                  </Text>
                  <Text className="text-white/60 text-center px-8 text-lg">
                    {existingIntention
                      ? "Your intention for today has been set."
                      : "Go make today legendary."}
                  </Text>
                </View>

                {existingIntention && (
                  <GlassCard intensity="medium" className="p-6 mb-6">
                    <Text className="text-white/40 text-sm mb-2">Today&apos;s Big Win:</Text>
                    <Text className="text-white text-xl font-semibold">
                      {existingIntention.oneBigWin}
                    </Text>
                  </GlassCard>
                )}

                {morningHabits.length > 0 && !existingIntention && (
                  <View className="mb-6">
                    <Text className="text-white font-bold text-lg mb-3 px-2">
                      Your Morning Stack
                    </Text>
                    <View className="gap-2">
                      {morningHabits.map((habit) => (
                        <GlassCard key={habit.id} intensity="medium" className="px-4 py-3">
                          <View className="flex-row items-center">
                            <View
                              className="w-4 h-4 rounded-full mr-3"
                              style={{ backgroundColor: habit.color }}
                            />
                            <Text className="text-white flex-1">{habit.title}</Text>
                          </View>
                        </GlassCard>
                      ))}
                    </View>
                  </View>
                )}

                <TouchableOpacity onPress={handleStartDay} activeOpacity={0.8}>
                  <LinearGradient
                    colors={["#00D4FF", "#FF00E5"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      borderRadius: 12,
                      padding: 20,
                      alignItems: "center",
                    }}
                  >
                    <Text className="text-white font-bold text-xl">Start Your Day</Text>
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
