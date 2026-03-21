import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import {
  ChevronLeft,
  Sun,
  Clock,
  Flame,
  Shield,
  Moon,
  Trophy,
  Heart,
  Minus,
  Plus,
  Bell,
  BellOff,
  CheckCircle,
} from "lucide-react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { GlassCard } from "@/components/GlassCard";
import { api } from "@/lib/api";
import { NotificationService } from "@/services/notificationService";
import { useAppStore } from "@/state/appStore";
import type { RootStackParamList } from "@/navigation/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationType =
  | "morning_nudge"
  | "missed_habit"
  | "streak_risk"
  | "protocol_risk"
  | "evening_reflection"
  | "encouragement"
  | "comeback";

type TonePref = "motivational" | "casual" | "direct";

interface Preferences {
  enabled: boolean;
  maxPerDay: number;
  quietHoursStart: string;
  quietHoursEnd: string;
  enabledTypes: NotificationType[];
  tonePref: TonePref;
}

interface Stats {
  totalSent: number;
  openRate: number;
  actionRate: number;
}

interface PreferencesResponse {
  preferences: Preferences;
}

interface StatsResponse {
  stats: Stats;
}

// ---------------------------------------------------------------------------
// Notification type definitions
// ---------------------------------------------------------------------------

const NOTIFICATION_TYPES: {
  key: NotificationType;
  icon: typeof Sun;
  color: string;
  label: string;
  description: string;
}[] = [
  {
    key: "morning_nudge",
    icon: Sun,
    color: "#F59E0B",
    label: "Morning Check-in",
    description: "Nudge when you haven't started your day",
  },
  {
    key: "missed_habit",
    icon: Clock,
    color: "#EF4444",
    label: "Missed Habits",
    description: "Reminders when habits are past their scheduled time",
  },
  {
    key: "streak_risk",
    icon: Flame,
    color: "#F97316",
    label: "Streak Protection",
    description: "Alerts when active streaks are at risk",
  },
  {
    key: "protocol_risk",
    icon: Shield,
    color: "#8B5CF6",
    label: "Protocol Warnings",
    description: "Warnings when protocols are falling behind",
  },
  {
    key: "evening_reflection",
    icon: Moon,
    color: "#6366F1",
    label: "Evening Reflection",
    description: "Reminder to complete your daily reflection",
  },
  {
    key: "encouragement",
    icon: Trophy,
    color: "#10B981",
    label: "Encouragement",
    description: "Celebrate when you're crushing it",
  },
  {
    key: "comeback",
    icon: Heart,
    color: "#EC4899",
    label: "Welcome Back",
    description: "Re-engagement when you've been away",
  },
];

const TONE_OPTIONS: { key: TonePref; label: string }[] = [
  { key: "motivational", label: "Motivational" },
  { key: "casual", label: "Casual" },
  { key: "direct", label: "Direct" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function to12Hr(time24: string): string {
  const [hStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:00 ${ampm}`;
}

function cycleHour(time24: string): string {
  const [hStr] = time24.split(":");
  const next = (parseInt(hStr, 10) + 1) % 24;
  return `${next.toString().padStart(2, "0")}:00`;
}

// ---------------------------------------------------------------------------
// Onboarding mode component
// ---------------------------------------------------------------------------

function OnboardingNotificationScreen({
  onContinue,
}: {
  onContinue: () => void;
}) {
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    Notifications.getPermissionsAsync().then(({ status }) => {
      setPermissionStatus(status);
    });
  }, []);

  const handleEnable = async () => {
    setIsRequesting(true);
    try {
      const granted = await NotificationService.requestPermissions();
      setPermissionStatus(granted ? "granted" : "denied");
    } finally {
      setIsRequesting(false);
    }
  };

  const isGranted = permissionStatus === "granted";

  return (
    <View style={{ flex: 1, backgroundColor: "#050813" }}>
      <LinearGradient colors={["#050813", "#0A0F1C", "#0D1929"]} style={{ flex: 1 }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1, justifyContent: "center", paddingHorizontal: 24 }}>
          <Animated.View entering={FadeIn.duration(400)} className="items-center mb-12">
            <View className="w-32 h-32 rounded-full bg-neon-cyan/10 items-center justify-center mb-6">
              {isGranted ? (
                <CheckCircle size={64} color="#10B981" />
              ) : (
                <Bell size={64} color="#00D4FF" />
              )}
            </View>
            <Text className="text-white text-3xl font-bold text-center mb-3">
              {isGranted ? "Notifications Enabled!" : "Enable Notifications"}
            </Text>
            <Text className="text-white/60 text-center text-base leading-6">
              {isGranted
                ? "You'll get timely reminders to keep your streaks alive."
                : "Get habit reminders, streak alerts, and daily check-ins to stay on track."}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(100)} className="gap-3 mb-8">
            <GlassCard className="p-4 flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-neon-cyan/20 items-center justify-center mr-4">
                <Flame size={20} color="#F97316" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold">Streak Protection</Text>
                <Text className="text-white/60 text-sm">Never lose a streak silently again</Text>
              </View>
            </GlassCard>
            <GlassCard className="p-4 flex-row items-center">
              <View className="w-10 h-10 rounded-full bg-neon-violet/20 items-center justify-center mr-4">
                <Moon size={20} color="#6366F1" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold">Evening Reflections</Text>
                <Text className="text-white/60 text-sm">End each day with intentional review</Text>
              </View>
            </GlassCard>
          </Animated.View>

          {!isGranted && permissionStatus === "denied" && (
            <View className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
              <Text className="text-amber-400 text-sm text-center">
                Notifications were denied. You can enable them later in your phone&apos;s Settings app.
              </Text>
            </View>
          )}

          {!isGranted && permissionStatus !== "denied" && (
            <Pressable
              onPress={handleEnable}
              disabled={isRequesting}
              className="active:scale-95 mb-3"
              style={{ borderRadius: 16, overflow: "hidden" }}
            >
              <LinearGradient
                colors={["#00D4FF", "#0099CC"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ paddingVertical: 18, alignItems: "center" }}
              >
                <Text className="text-black font-bold text-lg">
                  {isRequesting ? "Requesting..." : "Enable Notifications"}
                </Text>
              </LinearGradient>
            </Pressable>
          )}

          <Pressable
            onPress={onContinue}
            className="active:scale-95"
            style={{
              borderRadius: 16,
              borderWidth: 1,
              borderColor: isGranted ? "#10B981" : "rgba(255,255,255,0.15)",
              backgroundColor: isGranted ? "rgba(16,185,129,0.1)" : "transparent",
              paddingVertical: 16,
              alignItems: "center",
            }}
          >
            <Text style={{ color: isGranted ? "#10B981" : "rgba(255,255,255,0.6)", fontWeight: "600", fontSize: 16 }}>
              {isGranted ? "Continue" : "Skip for Now"}
            </Text>
          </Pressable>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function NotificationSettingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, "NotificationSettings">>();
  const fromOnboarding = route.params?.fromOnboarding ?? false;
  const setOnboardingStage = useAppStore((s) => s.setOnboardingStage);

  const handleOnboardingContinue = () => {
    setOnboardingStage("location");
    navigation.replace("LocationOnboarding", { fromOnboarding: true });
  };

  // If in onboarding mode, show the simplified onboarding screen
  if (fromOnboarding) {
    return <OnboardingNotificationScreen onContinue={handleOnboardingContinue} />;
  }

  // Otherwise render full settings UI
  return <FullNotificationSettings navigation={navigation} />;
}

// ---------------------------------------------------------------------------
// Full settings view (non-onboarding)
// ---------------------------------------------------------------------------

function FullNotificationSettings({
  navigation,
}: {
  navigation: NativeStackNavigationProp<RootStackParamList>;
}) {
  const [prefs, setPrefs] = useState<Preferences>({
    enabled: true,
    maxPerDay: 5,
    quietHoursStart: "22:00",
    quietHoursEnd: "07:00",
    enabledTypes: [
      "morning_nudge",
      "missed_habit",
      "streak_risk",
      "protocol_risk",
      "evening_reflection",
      "encouragement",
      "comeback",
    ],
    tonePref: "motivational",
  });

  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

  useEffect(() => {
    loadPreferences();
    loadStats();
    Notifications.getPermissionsAsync().then(({ status }) => setPermissionStatus(status));
  }, []);

  const loadPreferences = async () => {
    try {
      const data = await api.get<PreferencesResponse>(
        "/api/smart-notifications/preferences"
      );
      setPrefs(data.preferences);
    } catch (error) {
      console.log("Failed to load notification preferences:", error);
    } finally {
      setLoadingPrefs(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await api.get<StatsResponse>(
        "/api/smart-notifications/stats"
      );
      setStats(data.stats);
    } catch (error) {
      console.log("Failed to load notification stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  const savePreferences = useCallback(
    async (updated: Partial<Preferences>) => {
      try {
        await api.put<PreferencesResponse>(
          "/api/smart-notifications/preferences",
          updated
        );
      } catch (error) {
        console.log("Failed to save notification preferences:", error);
      }
    },
    []
  );

  const updatePrefs = useCallback(
    (patch: Partial<Preferences>) => {
      setPrefs((prev) => ({ ...prev, ...patch }));
      savePreferences(patch);
    },
    [savePreferences]
  );

  const handleMasterToggle = (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updatePrefs({ enabled: value });
  };

  const handleTypeToggle = (type: NotificationType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const current = prefs.enabledTypes;
    const next = current.includes(type)
      ? current.filter((t) => t !== type)
      : [...current, type];
    updatePrefs({ enabledTypes: next });
  };

  const handleMaxPerDayChange = (delta: number) => {
    const next = Math.min(10, Math.max(1, prefs.maxPerDay + delta));
    if (next === prefs.maxPerDay) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePrefs({ maxPerDay: next });
  };

  const handleQuietHourChange = (field: "quietHoursStart" | "quietHoursEnd") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = cycleHour(prefs[field]);
    updatePrefs({ [field]: next });
  };

  const handleToneChange = (tone: TonePref) => {
    if (tone === prefs.tonePref) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    updatePrefs({ tonePref: tone });
  };

  const handleRequestPermissions = async () => {
    const granted = await NotificationService.requestPermissions();
    setPermissionStatus(granted ? "granted" : "denied");
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#050813" }}>
      <LinearGradient colors={["#050813", "#0A0F1C", "#0D1929"]} style={{ flex: 1 }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          {/* Header */}
          <Animated.View entering={FadeIn.duration(300)}>
            <View className="flex-row items-center px-5 py-4">
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.goBack();
                }}
                className="mr-3 active:opacity-60"
              >
                <ChevronLeft size={28} color="#fff" />
              </Pressable>
              <Text className="text-white text-2xl font-semibold">
                Notifications
              </Text>
            </View>
          </Animated.View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 60 }}
            showsVerticalScrollIndicator={false}
          >
            {/* OS Permission Status */}
            {permissionStatus && permissionStatus !== "granted" && (
              <Animated.View entering={FadeInDown.duration(400)}>
                <GlassCard className="mx-5 mb-5 p-4">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center flex-1">
                      <BellOff size={18} color="#F59E0B" />
                      <Text className="text-amber-400 text-sm font-medium ml-2 flex-1">
                        Notifications are disabled in iOS Settings
                      </Text>
                    </View>
                    <Pressable
                      onPress={handleRequestPermissions}
                      className="active:opacity-70"
                      style={{
                        backgroundColor: "rgba(0,212,255,0.1)",
                        borderColor: "#00D4FF",
                        borderWidth: 1,
                        borderRadius: 10,
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                      }}
                    >
                      <Text className="text-cyan-400 text-xs font-semibold">Enable</Text>
                    </Pressable>
                  </View>
                </GlassCard>
              </Animated.View>
            )}

            {/* Section 1: Master Toggle */}
            <Animated.View entering={FadeInDown.duration(400).delay(100)}>
              <GlassCard className="mx-5 mb-5 p-5">
                <View className="flex-row items-center justify-between">
                  <Text className="text-white text-lg font-semibold">
                    Smart Notifications
                  </Text>
                  <Switch
                    value={prefs.enabled}
                    onValueChange={handleMasterToggle}
                    trackColor={{ false: "rgba(255,255,255,0.1)", true: "#00D4FF" }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                <Text className="text-white/50 text-sm mt-2">
                  Get intelligent reminders based on your habits and patterns
                </Text>
              </GlassCard>
            </Animated.View>

            {prefs.enabled && (
              <>
                {/* Notification Types */}
                <Animated.View entering={FadeInDown.duration(400).delay(200)}>
                  <View className="px-5 mb-3">
                    <Text className="text-white/60 text-xs font-semibold">NOTIFICATION TYPES</Text>
                  </View>
                  <GlassCard className="mx-5 mb-5 p-5">
                    {NOTIFICATION_TYPES.map((type, index) => {
                      const Icon = type.icon;
                      const isEnabled = prefs.enabledTypes.includes(type.key);
                      return (
                        <View
                          key={type.key}
                          className={`flex-row items-center justify-between ${
                            index < NOTIFICATION_TYPES.length - 1
                              ? "mb-5 pb-5 border-b border-white/5"
                              : ""
                          }`}
                        >
                          <View className="flex-row items-center flex-1 mr-3">
                            <View style={{ backgroundColor: `${type.color}20`, borderRadius: 12, padding: 8 }}>
                              <Icon size={18} color={type.color} />
                            </View>
                            <View className="ml-3 flex-1">
                              <Text className="text-white text-base font-medium">{type.label}</Text>
                              <Text className="text-white/40 text-xs mt-0.5">{type.description}</Text>
                            </View>
                          </View>
                          <Switch
                            value={isEnabled}
                            onValueChange={() => handleTypeToggle(type.key)}
                            trackColor={{ false: "rgba(255,255,255,0.1)", true: "#00D4FF" }}
                            thumbColor="#FFFFFF"
                          />
                        </View>
                      );
                    })}
                  </GlassCard>
                </Animated.View>

                {/* Preferences */}
                <Animated.View entering={FadeInDown.duration(400).delay(300)}>
                  <View className="px-5 mb-3">
                    <Text className="text-white/60 text-xs font-semibold">PREFERENCES</Text>
                  </View>

                  <GlassCard className="mx-5 mb-4 p-5">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-white text-base font-medium">Max Per Day</Text>
                      <View className="flex-row items-center">
                        <Pressable
                          onPress={() => handleMaxPerDayChange(-1)}
                          className="active:opacity-60"
                          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }}
                        >
                          <Minus size={16} color="rgba(255,255,255,0.6)" />
                        </Pressable>
                        <Text className="text-white text-lg font-bold mx-4">{prefs.maxPerDay}</Text>
                        <Pressable
                          onPress={() => handleMaxPerDayChange(1)}
                          className="active:opacity-60"
                          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" }}
                        >
                          <Plus size={16} color="rgba(255,255,255,0.6)" />
                        </Pressable>
                      </View>
                    </View>
                  </GlassCard>

                  <GlassCard className="mx-5 mb-4 p-5">
                    <Text className="text-white text-base font-medium mb-4">Quiet Hours</Text>
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="text-white/60 text-sm">Start</Text>
                      <Pressable
                        onPress={() => handleQuietHourChange("quietHoursStart")}
                        className="active:opacity-60"
                        style={{ backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}
                      >
                        <Text className="text-white text-sm font-medium">{to12Hr(prefs.quietHoursStart)}</Text>
                      </Pressable>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-white/60 text-sm">End</Text>
                      <Pressable
                        onPress={() => handleQuietHourChange("quietHoursEnd")}
                        className="active:opacity-60"
                        style={{ backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}
                      >
                        <Text className="text-white text-sm font-medium">{to12Hr(prefs.quietHoursEnd)}</Text>
                      </Pressable>
                    </View>
                  </GlassCard>

                  <GlassCard className="mx-5 mb-5 p-5">
                    <Text className="text-white text-base font-medium mb-4">Notification Tone</Text>
                    <View className="flex-row">
                      {TONE_OPTIONS.map((tone) => {
                        const isActive = prefs.tonePref === tone.key;
                        return (
                          <Pressable
                            key={tone.key}
                            onPress={() => handleToneChange(tone.key)}
                            className="mr-3 active:opacity-70"
                            style={{
                              borderWidth: 1,
                              borderColor: isActive ? "#00D4FF" : "rgba(255,255,255,0.12)",
                              backgroundColor: isActive ? "rgba(0,212,255,0.1)" : "transparent",
                              borderRadius: 20,
                              paddingHorizontal: 16,
                              paddingVertical: 8,
                            }}
                          >
                            <Text className={`text-sm font-medium ${isActive ? "text-[#00D4FF]" : "text-white/60"}`}>
                              {tone.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </GlassCard>
                </Animated.View>

                {/* Stats */}
                <Animated.View entering={FadeInDown.duration(400).delay(400)}>
                  <View className="px-5 mb-3">
                    <Text className="text-white/60 text-xs font-semibold">EFFECTIVENESS</Text>
                  </View>
                  <GlassCard className="mx-5 mb-5 p-5">
                    {loadingStats ? (
                      <View className="items-center py-4">
                        <ActivityIndicator color="#00D4FF" />
                        <Text className="text-white/40 text-xs mt-2">Loading stats...</Text>
                      </View>
                    ) : stats ? (
                      <View className="flex-row justify-between">
                        <View className="items-center flex-1">
                          <Text className="text-white text-xl font-bold">{Math.round(stats.openRate)}%</Text>
                          <Text className="text-white/40 text-xs mt-1">Open Rate</Text>
                        </View>
                        <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
                        <View className="items-center flex-1">
                          <Text className="text-white text-xl font-bold">{Math.round(stats.actionRate)}%</Text>
                          <Text className="text-white/40 text-xs mt-1">Action Rate</Text>
                        </View>
                        <View style={{ width: 1, backgroundColor: "rgba(255,255,255,0.08)" }} />
                        <View className="items-center flex-1">
                          <Text className="text-white text-xl font-bold">{stats.totalSent}</Text>
                          <Text className="text-white/40 text-xs mt-1">Sent (30 days)</Text>
                        </View>
                      </View>
                    ) : (
                      <Text className="text-white/40 text-sm text-center">No stats available yet</Text>
                    )}
                  </GlassCard>
                </Animated.View>
              </>
            )}
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
