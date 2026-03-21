import { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "@/components/GlassCard";
import { RootStackScreenProps } from "@/navigation/types";
import { Sparkles } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useAppStore } from "@/state/appStore";
import { api } from "@/lib/habitApi";
import { useSession } from "@/lib/useSession";

type Props = RootStackScreenProps<"ProfileSetup">;

const GOAL_CATEGORIES = [
  {
    emoji: "🏃",
    title: "Health & Fitness",
    description: "Build a body you're proud of",
  },
  {
    emoji: "🧘",
    title: "Mind & Focus",
    description: "Master your attention and calm",
  },
  {
    emoji: "💼",
    title: "Career & Growth",
    description: "Achieve professional excellence",
  },
  {
    emoji: "💰",
    title: "Money & Wealth",
    description: "Build financial freedom",
  },
  {
    emoji: "❤️",
    title: "Relationships",
    description: "Deepen your most important bonds",
  },
  {
    emoji: "🌱",
    title: "Personal Growth",
    description: "Become your best self",
  },
];

const TRAIT_ROWS: { label: string; chips: string[] }[] = [
  {
    label: "I am...",
    chips: ["Disciplined", "Consistent", "Focused", "Calm", "Bold", "Strong", "Sharp", "Free"],
  },
  {
    label: "I feel...",
    chips: ["Energized", "Confident", "Clear-headed", "Present", "Motivated", "Peaceful", "Powerful", "Alive"],
  },
  {
    label: "I show up as...",
    chips: ["A leader", "A finisher", "A creator", "A protector", "Someone who follows through"],
  },
];

export default function ProfileSetupScreen({ navigation }: Props) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);
  const [customIdentity, setCustomIdentity] = useState("");
  const [bigWhy, setBigWhy] = useState("");

  const setUserName = useAppStore((state) => state.setUserName);
  const setOnboardingStage = useAppStore((state) => state.setOnboardingStage);
  const setPendingGoal = useAppStore((state) => state.setPendingGoal);
  const { data: session } = useSession();

  const canProceed = (): boolean => {
    switch (step) {
      case 1:
        return name.trim().length > 0;
      case 2:
        return selectedCategory !== "";
      case 3:
        return selectedTraits.length > 0 || customIdentity.trim().length > 0;
      case 4:
        return bigWhy.trim().length > 0;
      default:
        return false;
    }
  };

  const handleNext = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleCategorySelect = async (title: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(title);
  };

  const handleTraitToggle = async (trait: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTraits((prev) =>
      prev.includes(trait) ? prev.filter((t) => t !== trait) : [...prev, trait]
    );
  };

  const handleComplete = async () => {
    setUserName(name);

    const identity =
      customIdentity.trim() ||
      (selectedTraits.length > 0 ? selectedTraits.join(", ") : "Someone committed to becoming their best self");

    const goalData = { purpose: selectedCategory, identity, bigWhy };

    // Always persist locally so it can be synced after authentication
    setPendingGoal(goalData);

    // Only attempt API call if the user is already authenticated
    if (session) {
      try {
        await api.createUserGoal(goalData);
        setPendingGoal(null);
      } catch (error) {
        console.warn("Could not save user goal to server, will retry after sign-in:", error);
      }
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setOnboardingStage("notifications");
    navigation.replace("NotificationSettings", { fromOnboarding: true });
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={["#050813", "#0A0F1C", "#0D1929"]} style={{ flex: 1 }}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Progress Bar */}
          <View className="px-5 pt-16 pb-8">
            <View className="flex-row justify-between mb-2">
              {[1, 2, 3, 4].map((s) => (
                <View
                  key={s}
                  className="h-1 rounded-full flex-1 mx-1"
                  style={{ backgroundColor: s <= step ? "#00D4FF" : "#ffffff20" }}
                />
              ))}
            </View>
            <Text className="text-white/60 text-sm text-center">Step {step} of 4</Text>
          </View>

          <View className="px-5">
            {/* Step 1: Name */}
            {step === 1 && (
              <View>
                <View className="mb-8">
                  <Text className="text-white text-4xl font-bold mb-3">
                    What&apos;s your name?
                  </Text>
                  <Text className="text-white/60 text-lg">
                    Let&apos;s personalize your experience
                  </Text>
                </View>

                <GlassCard className="p-6 mb-6">
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    placeholderTextColor="#ffffff40"
                    className="text-white text-2xl font-semibold"
                    autoFocus
                    autoCapitalize="words"
                  />
                </GlassCard>

                <View className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4 mb-6">
                  <View className="flex-row items-center mb-2">
                    <Sparkles size={16} color="#00D4FF" />
                    <Text className="text-cyan-400 font-semibold ml-2">
                      Identity-first habit building
                    </Text>
                  </View>
                  <Text className="text-white/70 text-sm">
                    In the next few steps, you&apos;ll define who you&apos;re becoming —
                    not just what you want to do. That shift is everything.
                  </Text>
                </View>
              </View>
            )}

            {/* Step 2: Goal Category */}
            {step === 2 && (
              <View>
                <View className="mb-8">
                  <Text className="text-white text-4xl font-bold mb-3">
                    What area of life are you transforming?
                  </Text>
                  <Text className="text-white/60 text-lg">
                    Focus creates results. Pick your primary area.
                  </Text>
                </View>

                <View className="flex-row flex-wrap gap-3 mb-6">
                  {GOAL_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategory === cat.title;
                    return (
                      <Pressable
                        key={cat.title}
                        onPress={() => handleCategorySelect(cat.title)}
                        style={{ width: "47%" }}
                      >
                        <GlassCard
                          className="p-4"
                          style={
                            isSelected
                              ? {
                                  borderColor: "#00D4FF",
                                  borderWidth: 2,
                                }
                              : {
                                  borderColor: "transparent",
                                  borderWidth: 2,
                                }
                          }
                        >
                          <Text style={{ fontSize: 28, marginBottom: 8 }}>{cat.emoji}</Text>
                          <Text className="text-white font-bold text-base mb-1">
                            {cat.title}
                          </Text>
                          <Text className="text-white/60 text-xs leading-tight">
                            {cat.description}
                          </Text>
                        </GlassCard>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Step 3: Future Self Identity */}
            {step === 3 && (
              <View>
                <View className="mb-8">
                  <Text className="text-white text-4xl font-bold mb-3">
                    Who are you becoming?
                  </Text>
                  <Text className="text-white/60 text-lg">
                    Your identity leads your habits.
                  </Text>
                </View>

                <View className="mb-6">
                  {TRAIT_ROWS.map((row) => (
                    <View key={row.label} className="mb-5">
                      <Text className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">
                        {row.label}
                      </Text>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingRight: 20, gap: 8, flexDirection: "row" }}
                      >
                        {row.chips.map((chip) => {
                          const isSelected = selectedTraits.includes(chip);
                          return (
                            <Pressable
                              key={chip}
                              onPress={() => handleTraitToggle(chip)}
                              className="rounded-full py-2 px-4"
                              style={{
                                backgroundColor: isSelected ? "#00D4FF" : "rgba(255,255,255,0.10)",
                              }}
                            >
                              <Text
                                className="font-semibold text-sm"
                                style={{ color: isSelected ? "#000000" : "rgba(255,255,255,0.70)" }}
                              >
                                {chip}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ))}
                </View>

                <GlassCard className="p-4 mt-2 mb-6">
                  <Text className="text-white/50 text-xs font-semibold uppercase tracking-widest mb-3">
                    In one sentence, who is Future You?
                  </Text>
                  <TextInput
                    value={customIdentity}
                    onChangeText={setCustomIdentity}
                    placeholder="e.g., I am the version of myself who never negotiates on my health"
                    placeholderTextColor="#ffffff30"
                    className="text-white text-base leading-relaxed"
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </GlassCard>

                {selectedTraits.length > 0 && (
                  <View className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-4 mb-4">
                    <Text className="text-cyan-400 text-xs font-semibold uppercase tracking-widest mb-2">
                      Your identity so far
                    </Text>
                    <Text className="text-white/80 text-sm leading-relaxed">
                      {selectedTraits.join(" · ")}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Step 4: Big Why */}
            {step === 4 && (
              <View>
                <View className="mb-8">
                  <Text className="text-white text-4xl font-bold mb-3">
                    What will actually change?
                  </Text>
                  <Text className="text-white/60 text-lg">
                    Real motivation is specific. Make it feel true.
                  </Text>
                </View>

                <GlassCard className="p-6 mb-6">
                  <TextInput
                    value={bigWhy}
                    onChangeText={setBigWhy}
                    placeholder={
                      "e.g., I'll wake up with energy instead of dread. I'll look in the mirror and feel proud."
                    }
                    placeholderTextColor="#ffffff30"
                    className="text-white text-lg leading-relaxed"
                    multiline
                    numberOfLines={5}
                    textAlignVertical="top"
                    autoFocus
                  />
                </GlassCard>

                <View className="bg-violet-500/10 border border-violet-500/30 rounded-2xl p-4 mb-6">
                  <View className="flex-row items-center mb-2">
                    <Sparkles size={14} color="#a78bfa" />
                    <Text className="text-violet-400 font-semibold ml-2 text-sm">
                      The more specific, the more powerful
                    </Text>
                  </View>
                  <Text className="text-white/60 text-sm leading-relaxed">
                    Vague goals create vague results. Paint the picture of your future life in
                    detail — what you&apos;ll see, feel, and experience when you&apos;ve arrived.
                  </Text>
                </View>

                {selectedCategory !== "" && (
                  <View className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-4">
                    <Text className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-1">
                      Your journey
                    </Text>
                    <Text className="text-white/80 text-sm font-semibold mb-1">
                      {selectedCategory}
                    </Text>
                    {(customIdentity.trim() || selectedTraits.length > 0) && (
                      <Text className="text-white/50 text-xs" numberOfLines={2}>
                        {customIdentity.trim() || selectedTraits.slice(0, 3).join(" · ")}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Navigation Buttons */}
        <View className="px-5 pb-8 pt-2">
          <View className="flex-row justify-between">
            {step > 1 && (
              <Pressable
                onPress={handleBack}
                className="bg-white/10 px-8 py-4 rounded-xl flex-1 mr-3 items-center active:scale-95"
              >
                <Text className="text-white font-semibold text-lg">Back</Text>
              </Pressable>
            )}

            <Pressable
              onPress={handleNext}
              disabled={!canProceed()}
              className="px-8 py-4 rounded-xl flex-1 items-center active:scale-95"
              style={{
                backgroundColor: canProceed() ? "#00D4FF" : "rgba(255,255,255,0.10)",
              }}
            >
              <Text
                className="font-semibold text-lg"
                style={{ color: canProceed() ? "#000000" : "rgba(255,255,255,0.40)" }}
              >
                {step === 4 ? "Begin My Journey" : "Continue"}
              </Text>
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}
