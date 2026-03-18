import { View, Text, ScrollView, Pressable, Switch, Alert, Linking } from "react-native";
import { BottomTabScreenProps } from "@/navigation/types";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "@/components/GlassCard";
import { User, Crown, Bell, Palette, LogOut, Shield, MapPin, Calendar, Download, Volume2, ExternalLink, Zap, BarChart3, Archive, Database, ChevronRight, RotateCcw, Lock, Sparkles, Trash2 } from "lucide-react-native";
import { useAppStore } from "@/state/appStore";
import { useGatedNavigation } from "@/hooks/useGatedNavigation";
import { useSubscription } from "@/hooks/useSubscription";
import { TIERS, PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "@/constants/pricing";
import { meetsMinimumTier } from "@/constants/pricing";
import type { ThemeMode } from "@/themes/primeTheme";
import { useHabitsStore } from "@/state/habitsStore";
import { useTodosStore } from "@/state/todosStore";
import { useFocusStore } from "@/state/focusStore";
import * as Haptics from "expo-haptics";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { authClient } from "@/lib/authClient";
import { logoutUser } from "@/lib/revenuecatClient";
import type { GetAdminProfileResponse, ToggleOnboardingRequest } from "@/shared/contracts";
import { exportHabitsToCSV, exportTodosToCSV, exportAllDataToCSV } from "@/services/dataExport";
import { VoiceService } from "@/services/voiceService";
import { DataVaultModal } from "@/components/DataVaultModal";
import { FutureSelfCard } from "@/components/FutureSelfCard";
import { api as habitApi } from "@/lib/habitApi";

type Props = BottomTabScreenProps<"SettingsTab">;

export default function SettingsScreen({ navigation }: Props) {
  const subscriptionTier = useAppStore((state) => state.subscriptionTier);
  const userName = useAppStore((state) => state.userName);
  const setHasCompletedOnboarding = useAppStore((state) => state.setHasCompletedOnboarding);
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);
  const integrity = useAppStore((state) => state.integrity);
  const xp = useAppStore((state) => state.xp);
  const habits = useHabitsStore((state) => state.habits);
  const todos = useTodosStore((state) => state.todos);

  const gatedNav = useGatedNavigation();
  const { restore, tier } = useSubscription();
  const [isAdmin, setIsAdmin] = useState(false);
  const [skipOnboarding, setSkipOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(VoiceService.getEnabled());
  const [showDataVault, setShowDataVault] = useState(false);
  const [userGoal, setUserGoal] = useState<{ bigWhy: string; identity: string | null; purpose: string } | null>(null);

  useEffect(() => {
    loadAdminStatus();
    loadUserGoal();
  }, []);

  const loadUserGoal = async () => {
    try {
      const data = await habitApi.getUserGoal();
      setUserGoal(data);
    } catch {
      // Not set yet
    }
  };

  const loadAdminStatus = async () => {
    try {
      const data = await api.get<GetAdminProfileResponse>("/api/admin/profile");
      setIsAdmin(data.isAdmin);
      setSkipOnboarding(data.skipOnboarding);
    } catch (error) {
      console.log("Not an admin or not authenticated");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOnboarding = async (value: boolean) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSkipOnboarding(value);

      await api.post<ToggleOnboardingRequest>("/api/admin/toggle-onboarding", {
        skipOnboarding: value,
      });

      // Update the app store to reflect the change
      if (value) {
        setHasCompletedOnboarding(true);
      } else {
        setHasCompletedOnboarding(false);
      }
    } catch (error) {
      console.error("Failed to toggle onboarding:", error);
      // Revert on error
      setSkipOnboarding(!value);
    }
  };

  const handleSignOut = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await logoutUser().catch(() => {});
      await authClient.signOut();

      // Clear all local state to prevent data leaks between accounts
      useAppStore.getState().reset();
      useHabitsStore.getState().reset();
      useTodosStore.getState().reset();
      useFocusStore.getState().reset();
    } catch (error) {
      console.error("Sign out error:", error);
    }
  };

  const handleDeleteAccount = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all your data — habits, streaks, reflections, everything. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete My Account",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Are you absolutely sure?",
              "All your data will be erased permanently. Type your action carefully — there is no recovery.",
              [
                { text: "No, keep my account", style: "cancel" },
                {
                  text: "Yes, delete everything",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await api.post<{ success: boolean }>("/api/user/delete", {});
                      await authClient.signOut();
                    } catch (error) {
                      console.error("Delete account error:", error);
                      Alert.alert("Error", "Failed to delete account. Please try again or contact support.");
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  const openUrl = async (url: string, label: string) => {
    if (!url) return Alert.alert("Not available", `${label} URL is not set yet.`);
    try { await Linking.openURL(url); }
    catch { Alert.alert("Error", `Could not open ${label}.`); }
  };

  const handleToggleVoice = async (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setVoiceEnabled(value);
    VoiceService.setEnabled(value);

    if (value) {
      // Test voice feedback
      VoiceService.speak("Voice feedback enabled");
    }
  };

  const handleOpenConnectedApp = async (appName: string, urlScheme: string, appStoreUrl: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Check if the app can be opened
      const canOpen = await Linking.canOpenURL(urlScheme);

      if (canOpen) {
        // App is installed - open it
        await Linking.openURL(urlScheme);
      } else {
        // App is not installed - show dialog
        Alert.alert(
          `Open ${appName}?`,
          `${appName} is not installed on your device. Would you like to download it from the App Store?`,
          [
            {
              text: "Cancel",
              style: "cancel",
            },
            {
              text: "Download",
              onPress: async () => {
                try {
                  await Linking.openURL(appStoreUrl);
                } catch (error) {
                  console.error("Failed to open App Store:", error);
                  Alert.alert("Error", "Could not open the App Store. Please try again later.");
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error(`Failed to open ${appName}:`, error);
      Alert.alert("Error", "Something went wrong. Please try again.");
    }
  };

  const handleExportData = async () => {
    if (exporting) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      "Export Data",
      "Choose what to export:",
      [
        {
          text: "Habits Only",
          onPress: async () => {
            try {
              setExporting(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await exportHabitsToCSV(habits);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Success", `Exported ${habits.length} habits`);
            } catch (error) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Error", "Failed to export habits. Please try again.");
              console.error("Export error:", error);
            } finally {
              setExporting(false);
            }
          },
        },
        {
          text: "Todos Only",
          onPress: async () => {
            try {
              setExporting(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await exportTodosToCSV(todos);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Success", `Exported ${todos.length} todos`);
            } catch (error) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Error", "Failed to export todos. Please try again.");
              console.error("Export error:", error);
            } finally {
              setExporting(false);
            }
          },
        },
        {
          text: "All Data",
          onPress: async () => {
            try {
              setExporting(true);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              await exportAllDataToCSV(habits, todos);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Success", `Exported ${habits.length} habits and ${todos.length} todos`);
            } catch (error) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Error", "Failed to export data. Please try again.");
              console.error("Export error:", error);
            } finally {
              setExporting(false);
            }
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const getTierName = () => {
    const tierNames = { preview: "Preview", core: "Core", pro: "Pro", elite: "Elite" };
    return tierNames[subscriptionTier];
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={["#050813", "#0A0F1C", "#0D1929"]} style={{ flex: 1 }}>
        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
          <View className="px-5 pt-4 pb-6">
            <Text className="text-white text-3xl font-semibold">Settings</Text>
            <Text className="text-white/60 text-base mt-1">Manage your preferences</Text>
          </View>

          <GlassCard className="mx-5 mb-5 p-6">
            <View className="flex-row items-center mb-4">
              <Crown size={24} color="#FFD700" />
              <Text className="text-white text-xl font-semibold ml-3">{getTierName()} Plan</Text>
            </View>
            <Text className="text-white/70 text-base mb-4">
              {subscriptionTier === "preview"
                ? "Upgrade to unlock all features"
                : `You have access to ${getTierName()} features`}
            </Text>
            <View className="flex-row">
              {subscriptionTier !== "elite" && (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    navigation.navigate("Upgrade", undefined);
                  }}
                  className="flex-1 mr-2 active:scale-95"
                >
                  <View className="bg-[#8B5CF6] rounded-xl py-3 items-center flex-row justify-center">
                    <Sparkles size={16} color="#fff" />
                    <Text className="text-white font-bold ml-2">
                      {subscriptionTier === "preview" ? "Upgrade" : "Upgrade Plan"}
                    </Text>
                  </View>
                </Pressable>
              )}
              <Pressable
                onPress={async () => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  const success = await restore();
                  if (success) {
                    Alert.alert("Restored", "Your purchases have been restored.");
                  } else {
                    Alert.alert("No Purchases", "No previous purchases found.");
                  }
                }}
                className="active:scale-95"
              >
                <View className="bg-white/10 rounded-xl py-3 px-4 items-center flex-row justify-center">
                  <RotateCcw size={16} color="rgba(255,255,255,0.6)" />
                  <Text className="text-white/60 font-medium ml-2">Restore</Text>
                </View>
              </Pressable>
            </View>
          </GlassCard>

          {isAdmin && !loading && process.env.EXPO_PUBLIC_ADMIN_TOOLS_ENABLED === "true" && (
            <>
              <View className="px-5 mb-3">
                <View className="flex-row items-center">
                  <Shield size={16} color="#00D4FF" />
                  <Text className="text-cyan text-sm font-semibold ml-2">ADMIN SETTINGS</Text>
                </View>
              </View>

              <GlassCard className="mx-5 mb-5 p-5">
                <View className="flex-row items-center justify-between">
                  <View className="flex-1">
                    <Text className="text-white text-base font-medium">Skip Onboarding</Text>
                    <Text className="text-white/60 text-sm mt-1">
                      Bypass onboarding flow on app start
                    </Text>
                  </View>
                  <Switch
                    value={skipOnboarding}
                    onValueChange={handleToggleOnboarding}
                    trackColor={{ false: "#374151", true: "#00D4FF" }}
                    thumbColor={skipOnboarding ? "#FFFFFF" : "#9CA3AF"}
                  />
                </View>
              </GlassCard>

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  navigation.navigate("LocationOnboarding");
                }}
                className="active:scale-95"
              >
                <GlassCard className="mx-5 mb-5 p-5 flex-row items-center">
                  <MapPin size={20} color="#00D4FF" />
                  <View className="ml-4 flex-1">
                    <Text className="text-white text-base font-medium">Test Location Onboarding</Text>
                    <Text className="text-white/60 text-sm mt-1">
                      Preview the GPS setup screen
                    </Text>
                  </View>
                  <ChevronRight size={20} color="#00D4FF" />
                </GlassCard>
              </Pressable>
            </>
          )}

          <View className="px-5 mb-3 mt-2">
            <Text className="text-white/60 text-sm font-semibold">PREFERENCES</Text>
          </View>

          <GlassCard className="mx-5 mb-5 p-5">
            <View className="flex-row items-center justify-between">
              <View className="flex-1 flex-row items-center">
                <Volume2 size={20} color="#00D4FF" />
                <View className="ml-4 flex-1">
                  <Text className="text-white text-base font-medium">Voice Feedback</Text>
                  <Text className="text-white/60 text-sm mt-1">
                    Hear celebrations and summaries
                  </Text>
                </View>
              </View>
              <Switch
                value={voiceEnabled}
                onValueChange={handleToggleVoice}
                trackColor={{ false: "#374151", true: "#00D4FF" }}
                thumbColor={voiceEnabled ? "#FFFFFF" : "#9CA3AF"}
              />
            </View>
          </GlassCard>

          <View className="px-5 space-y-3">
            <Pressable
              onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
              className="active:scale-95"
            >
              <GlassCard className="p-5 flex-row items-center">
                <User size={20} color="#00D4FF" />
                <Text className="text-white text-base ml-4 flex-1">Profile</Text>
              </GlassCard>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("NotificationSettings");
              }}
              className="active:scale-95"
            >
              <GlassCard className="p-5 flex-row items-center">
                <Bell size={20} color="#FF00E5" />
                <Text className="text-white text-base ml-4 flex-1">Notifications</Text>
                <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
              </GlassCard>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setThemeMode(themeMode === 'ice' ? 'prime' : 'ice');
              }}
              className="active:scale-95"
            >
              <GlassCard className="p-5 flex-row items-center">
                <Palette size={20} color="#8B5CF6" />
                <View className="flex-1 ml-4">
                  <Text className="text-white text-base">Theme</Text>
                  <Text className="text-white/60 text-xs mt-1">
                    {themeMode === 'ice' ? 'ICE (Glassmorphism)' : 'PRIME (Brutalist)'}
                  </Text>
                </View>
                <View className="bg-[#8B5CF6]/20 px-3 py-1 rounded-full">
                  <Text className="text-[#8B5CF6] text-xs font-bold">{themeMode.toUpperCase()}</Text>
                </View>
              </GlassCard>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                gatedNav.navigateGated("LocationReminder", undefined, "pro", "Location Reminders");
              }}
              className="active:scale-95"
            >
              <GlassCard className="p-5 flex-row items-center">
                <MapPin size={20} color="#00D4FF" />
                <Text className="text-white text-base ml-4 flex-1">Location Reminders</Text>
                {!meetsMinimumTier(subscriptionTier, "pro") && (
                  <View className="bg-[#8B5CF6]/20 px-2 py-1 rounded-full">
                    <Text className="text-[#8B5CF6] text-xs font-bold">PRO</Text>
                  </View>
                )}
              </GlassCard>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("PlanTomorrowScreen" as never);
              }}
              className="active:scale-95"
            >
              <GlassCard className="p-5 flex-row items-center">
                <Calendar size={20} color="#8B5CF6" />
                <Text className="text-white text-base ml-4 flex-1">Plan Tomorrow</Text>
              </GlassCard>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate("Vault");
              }}
              className="active:scale-95"
            >
              <GlassCard className="p-5 flex-row items-center">
                <Archive size={20} color="#888" />
                <View className="flex-1 ml-4">
                  <Text className="text-white text-base">Vault</Text>
                  <Text className="text-white/60 text-xs mt-1">Archived & failed protocols</Text>
                </View>
              </GlassCard>
            </Pressable>

            {/* Future Self Section */}
            {userGoal && (
              <>
                <View className="mt-6 mb-3">
                  <Text className="text-white/60 text-xs font-semibold">MY FUTURE SELF</Text>
                </View>
                <FutureSelfCard
                  userName={userName ?? "You"}
                  category={userGoal.purpose || "Personal Growth"}
                  identity={userGoal.identity || "Someone committed to becoming their best self"}
                  bigWhy={userGoal.bigWhy}
                  integrity={integrity}
                  habitCount={habits.length}
                  longestStreak={Math.max(0, ...habits.map((h: any) => h.bestStreak ?? 0))}
                />
              </>
            )}

            {/* Protocol System Section */}
            <View className="mt-6 mb-2">
              <Text className="text-white/60 text-xs font-semibold mb-2">PROTOCOL SYSTEM</Text>
            </View>

            <GlassCard className="p-5 mb-3">
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <Shield size={20} color="#00E5FF" />
                  <Text className="text-white text-base font-semibold ml-3">Integrity Score</Text>
                </View>
                <View className="bg-[#00E5FF]/15 px-4 py-1.5 rounded-full">
                  <Text className="text-[#00E5FF] text-lg font-black">{integrity}%</Text>
                </View>
              </View>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Zap size={20} color="#FFB800" />
                  <Text className="text-white text-base font-semibold ml-3">Experience Points</Text>
                </View>
                <Text className="text-[#FFB800] text-lg font-black">{xp} XP</Text>
              </View>
              <View className="mt-4 pt-4 border-t border-white/10">
                <Text className="text-white/40 text-xs leading-relaxed">
                  Integrity drops when you fail protocol commitments. Keep your promises to maintain your score.
                </Text>
              </View>
            </GlassCard>

            {/* Export Data Section */}
            <View className="mt-6 mb-2">
              <Text className="text-white/60 text-xs font-semibold mb-2">DATA MANAGEMENT</Text>
            </View>

            <Pressable
              onPress={() => {
                if (!meetsMinimumTier(subscriptionTier, "core")) {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                  navigation.navigate("Upgrade", { requiredTier: "core", featureName: "Data Export" });
                  return;
                }
                handleExportData();
              }}
              disabled={exporting}
              className="active:scale-95"
            >
              <GlassCard className="p-5 flex-row items-center">
                <Download size={20} color="#10B981" />
                <View className="flex-1 ml-4">
                  <Text className="text-white text-base">Export Data</Text>
                  <Text className="text-white/60 text-xs mt-1">
                    Download your habits & todos as CSV
                  </Text>
                </View>
                {!meetsMinimumTier(subscriptionTier, "core") && (
                  <View className="bg-[#00D4FF]/20 px-2 py-1 rounded-full">
                    <Text className="text-[#00D4FF] text-xs font-bold">CORE</Text>
                  </View>
                )}
                {exporting && (
                  <View className="bg-green-500/20 px-3 py-1 rounded-full">
                    <Text className="text-green-400 text-xs font-semibold">Exporting...</Text>
                  </View>
                )}
              </GlassCard>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowDataVault(true);
              }}
              className="active:scale-95 mb-3"
            >
              <GlassCard className="p-5 flex-row items-center">
                <Database size={20} color="#9C27B0" />
                <View className="flex-1 ml-4">
                  <Text className="text-white text-base">Data Vault</Text>
                  <Text className="text-white/60 text-xs mt-1">Backup & restore your data as JSON</Text>
                </View>
              </GlassCard>
            </Pressable>

            {/* Legal Section */}
            <View className="mt-6 mb-2">
              <Text className="text-white/60 text-xs font-semibold mb-2">LEGAL</Text>
            </View>

            <GlassCard className="mb-3">
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  openUrl(PRIVACY_POLICY_URL, "Privacy Policy");
                }}
                className="active:scale-95"
              >
                <View className="p-5 flex-row items-center">
                  <Shield size={20} color="#00D4FF" />
                  <Text className="text-white text-base ml-4 flex-1">Privacy Policy</Text>
                  <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
                </View>
              </Pressable>
              <View className="h-px bg-white/10 mx-5" />
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  openUrl(TERMS_OF_SERVICE_URL, "Terms of Service");
                }}
                className="active:scale-95"
              >
                <View className="p-5 flex-row items-center">
                  <ExternalLink size={20} color="#00D4FF" />
                  <Text className="text-white text-base ml-4 flex-1">Terms of Service</Text>
                  <ChevronRight size={18} color="rgba(255,255,255,0.3)" />
                </View>
              </Pressable>
              <View className="h-px bg-white/10 mx-5" />
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  Linking.openURL("mailto:immersivetechs@icloud.com");
                }}
                className="active:scale-95"
              >
                <View className="p-5 flex-row items-center">
                  <User size={20} color="#00D4FF" />
                  <Text className="text-white text-base ml-4 flex-1">Support</Text>
                  <Text className="text-white/40 text-sm">immersivetechs@icloud.com</Text>
                </View>
              </Pressable>
            </GlassCard>

            <Text className="text-white/30 text-xs text-center mb-4">
              Habit is published by VibeForge Studios.
            </Text>

            <Pressable
              onPress={handleSignOut}
              className="mt-2 active:scale-95"
            >
              <GlassCard className="p-5 flex-row items-center border-red-500/30">
                <LogOut size={20} color="#EF4444" />
                <Text className="text-red-400 text-base ml-4 flex-1">Sign Out</Text>
              </GlassCard>
            </Pressable>

            <Pressable
              onPress={handleDeleteAccount}
              className="mt-3 mb-2 active:scale-95"
            >
              <GlassCard className="p-5 flex-row items-center border-red-900/40">
                <Trash2 size={20} color="#7F1D1D" />
                <View className="flex-1 ml-4">
                  <Text className="text-red-900 text-base font-medium">Delete Account</Text>
                  <Text className="text-red-900/70 text-xs mt-0.5">Permanently erase all your data</Text>
                </View>
              </GlassCard>
            </Pressable>
          </View>
        </ScrollView>
      </LinearGradient>
      <DataVaultModal visible={showDataVault} onClose={() => setShowDataVault(false)} />
    </View>
  );
}
