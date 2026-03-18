import { useState, useEffect, useMemo } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, TextInput } from "react-native";
import { BottomTabScreenProps } from "@/navigation/types";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "@/components/GlassCard";
import { AddHabitModal } from "@/components/AddHabitModal";
import { EditHabitModal } from "@/components/EditHabitModal";
import { HabitCardSkeleton } from "@/components/SkeletonLoader";
import { InteractiveHabitCard } from "@/components/InteractiveHabitCard";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { CategoryFilter } from "@/components/CategoryFilter";
import { CommandDeck } from "@/components/CommandDeck";
import { ForgeProtocolModal } from "@/components/ForgeProtocolModal";
import { MatrixHeatmap } from "@/components/MatrixHeatmap";
import { QuickReportModal } from "@/components/QuickReportModal";
import { ProtocolAnalyticsModal } from "@/components/ProtocolAnalyticsModal";
import { Plus, Circle, CheckCircle2, Pencil, AlertCircle, ShoppingBag, Shield, BarChart3, Search, X } from "lucide-react-native";
import { useHabitsStore } from "@/state/habitsStore";
import { useAppStore } from "@/state/appStore";
import { useGatedNavigation } from "@/hooks/useGatedNavigation";
import { api } from "@/lib/api";
import * as Haptics from "expo-haptics";
import type { GetHabitsResponse, CreateHabitRequest, UpdateHabitRequest, HabitCategory } from "@/shared/contracts";
import { achievementService } from "@/services/achievementService";
import { scheduleHabitNotification, cancelHabitNotification, rescheduleAllHabitNotifications } from "@/services/habitNotifications";
import { VoiceService } from "@/services/voiceService";
import { AdaptiveIntelligenceService } from "@/services/adaptiveIntelligence";
import { useSession } from "@/lib/useSession";

type Props = BottomTabScreenProps<"HabitsTab">;

export default function HabitsScreenConnected({ navigation }: Props) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [completingHabits, setCompletingHabits] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<HabitCategory | "all">("all");
  const [showCommandDeck, setShowCommandDeck] = useState(false);
  const [selectedHabitForDeck, setSelectedHabitForDeck] = useState<any>(null);
  const [showForgeProtocol, setShowForgeProtocol] = useState(false);
  const [showQuickReport, setShowQuickReport] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState<any>(null);
  const [intentionInput, setIntentionInput] = useState('');
  const [searchText, setSearchText] = useState('');
  const debouncedSearch = useDebouncedValue(searchText, 300);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsHabit, setAnalyticsHabit] = useState<any>(null);
  const { habits, setHabits, addHabit, updateHabit, completeHabit, removeHabit, loading, setLoading, error, setError } = useHabitsStore();
  const gatedNav = useGatedNavigation();
  const integrity = useAppStore(s => s.integrity);
  const xp = useAppStore(s => s.xp);
  const setIntegrity = useAppStore(s => s.setIntegrity);
  const setXp = useAppStore(s => s.setXp);
  const { data: session } = useSession();

  const filteredHabits = useMemo(() => {
    let filtered = habits;
    if (selectedCategory !== "all") {
      filtered = filtered.filter((h) => h.category === selectedCategory);
    }
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.trim().toLowerCase();
      filtered = filtered.filter((h) => h.title?.toLowerCase().includes(query));
    }
    return filtered;
  }, [habits, selectedCategory, debouncedSearch]);

  useEffect(() => {
    if (!session) return;
    loadHabits();
    loadWeeklyReport();
  }, [session]);

  // Reschedule all habit notifications on mount
  useEffect(() => {
    if (habits.length > 0) {
      rescheduleAllHabitNotifications(habits);
    }
  }, [habits.length]);

  const loadHabits = async () => {
    try {
      setLoading(true);
      const response = await api.get<GetHabitsResponse>("/api/habits");
      // Map habits to include stats that might be missing
      const habitsWithStats = response.habits.map((habit: any) => ({
        ...habit,
        completedToday: habit.completedToday ?? false,
        todayCount: habit.todayCount ?? 0,
        streak: habit.streak ?? 0,
      }));
      setHabits(habitsWithStats);
    } catch (error) {
      console.log("Using demo habits data");
      setError("Failed to load habits");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadHabits(), loadWeeklyReport()]);
    setRefreshing(false);
  };

  const handleCreateHabit = async (habitData: CreateHabitRequest) => {
    try {
      const response = await api.post<{ habit: any }>("/api/habits", habitData);
      if (response.habit) {
        const newHabit = {
          ...response.habit,
          completedToday: false,
          todayCount: 0,
        };
        addHabit(newHabit);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Schedule notification if reminder is enabled
        if (response.habit.reminderEnabled && response.habit.reminderTime) {
          await scheduleHabitNotification(
            response.habit.id,
            response.habit.title,
            response.habit.reminderTime,
            response.habit.recurringType
          );
          console.log(`✅ Scheduled notification for "${response.habit.title}" at ${response.habit.reminderTime}`);
        }
      }
    } catch (error) {
      console.log("Failed to create habit:", error);
      setError("Failed to create habit");
    }
  };

  const handleCompleteHabit = async (habitId: string) => {
    // Prevent multiple simultaneous completions
    if (completingHabits.has(habitId)) {
      console.log("[HabitsScreen] Already completing habit:", habitId);
      return;
    }

    try {
      console.log("[HabitsScreen] Completing habit:", habitId);
      // Mark as completing
      setCompletingHabits((prev) => new Set(prev).add(habitId));

      // Get habit details before completing
      const habit = habits.find(h => h.id === habitId);

      // Optimistically update UI first for instant feedback
      completeHabit(habitId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Then make API call
      const response = await api.post(`/api/habits/${habitId}/complete`, {});
      console.log("[HabitsScreen] Habit completed successfully:", response);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Log engagement event for smart notifications
      AdaptiveIntelligenceService.logHabitComplete(habitId);

      // Check for achievements
      if (habit) {
        // Voice feedback for completion
        VoiceService.celebrateCompletion(habit.title);

        const achievementTrigger = await achievementService.checkHabitCompletionAchievements(
          habitId,
          habit.title
        );

        if (achievementTrigger) {
          const achievement = await achievementService.createAchievement(achievementTrigger);

          if (achievement && !achievement.alreadyExists) {
            // Voice feedback for streak milestone
            if (
              achievementTrigger.type === "7_day_streak" ||
              achievementTrigger.type === "30_day_streak" ||
              achievementTrigger.type === "90_day_streak"
            ) {
              const newStreak = (habit.streak || 0) + 1;
              VoiceService.celebrateStreak(newStreak, habit.title);
            }
            // Navigate to celebration screen
            navigation.navigate("AchievementCelebration", { achievement });
          }
        }

        // Check if morning stack is complete
        const morningStackAchievement = await achievementService.checkMorningStackComplete();
        if (morningStackAchievement) {
          const achievement = await achievementService.createAchievement(morningStackAchievement);

          if (achievement && !achievement.alreadyExists) {
            navigation.navigate("AchievementCelebration", { achievement });
          }
        }
      }
    } catch (error) {
      console.log("[HabitsScreen] Failed to complete habit:", error);
      // Reload habits to sync state if API call failed
      await loadHabits();
    } finally {
      // Remove from completing set
      setCompletingHabits((prev) => {
        const next = new Set(prev);
        next.delete(habitId);
        return next;
      });
    }
  };

  const handleEditHabit = (habit: any) => {
    setEditingHabit(habit);
    setShowEditModal(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleUpdateHabit = async (habitId: string, habitData: Omit<UpdateHabitRequest, "id">) => {
    try {
      const oldHabit = habits.find(h => h.id === habitId);
      const response = await api.patch<{ habit: any }>(`/api/habits/${habitId}`, habitData);
      if (response.habit) {
        updateHabit(habitId, {
          ...response.habit,
          completedToday: habits.find(h => h.id === habitId)?.completedToday || false,
          todayCount: habits.find(h => h.id === habitId)?.todayCount || 0,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Handle notification updates
        if (response.habit.reminderEnabled && response.habit.reminderTime) {
          // Reschedule notification with new settings
          await scheduleHabitNotification(
            response.habit.id,
            response.habit.title,
            response.habit.reminderTime,
            response.habit.recurringType
          );
          console.log(`🔄 Rescheduled notification for "${response.habit.title}" at ${response.habit.reminderTime}`);
        } else if (oldHabit?.reminderEnabled && !response.habit.reminderEnabled) {
          // Cancel notification if reminder was disabled
          await cancelHabitNotification(habitId);
          console.log(`🔕 Canceled notification for habit ${habitId}`);
        }
      }
    } catch (error) {
      console.log("Failed to update habit:", error);
      setError("Failed to update habit");
    }
  };

  const handleDeleteHabit = async (habitId: string) => {
    try {
      await api.delete(`/api/habits/${habitId}`);
      removeHabit(habitId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Cancel any scheduled notifications for this habit
      await cancelHabitNotification(habitId);
      console.log(`🗑️ Deleted habit and canceled notification: ${habitId}`);
    } catch (error) {
      console.log("Failed to delete habit:", error);
    }
  };

  const handleLogHabit = async (quality: 'verified' | 'partial' | 'skipped' | 'undo') => {
    if (!selectedHabitForDeck) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.post(`/api/habits/${selectedHabitForDeck.id}/log`, { quality, date: today });
      // Reload habits to get updated state
      await loadHabits();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.log("Failed to log habit:", error);
    }
    setShowCommandDeck(false);
  };

  const handleForgeProtocol = async (data: { title: string; target: number; windowDays: number; color: string; category: string }) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await api.post<{ habit: any }>("/api/habits", {
        title: data.title,
        color: data.color,
        category: data.category,
        habitType: 'protocol',
        protocolTarget: data.target,
        protocolWindowDays: data.windowDays,
        protocolStartDate: today,
        protocolStatus: 'active',
      });
      if (response.habit) {
        addHabit({ ...response.habit, completedToday: false, todayCount: 0 });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.log("Failed to create protocol:", error);
    }
  };

  const handleArchiveHabit = async (habitId: string) => {
    try {
      await api.patch(`/api/habits/${habitId}`, { archived: true });
      removeHabit(habitId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowAnalytics(false);
      setAnalyticsHabit(null);
    } catch (error) {
      console.log("Failed to archive habit:", error);
    }
  };

  const loadWeeklyReport = async () => {
    try {
      const response = await api.get<any>("/api/protocol/weekly-report");
      setWeeklyReport(response);
      // Also update local integrity/xp
      const intResponse = await api.get<any>("/api/protocol/integrity");
      setIntegrity(intResponse.integrity);
      setXp(intResponse.xp);
    } catch (error) {
      console.log("No report data available");
    }
  };

  const handleAddIntention = async () => {
    const title = intentionInput.trim();
    if (!title) return;
    try {
      const response = await api.post<{ habit: any }>("/api/habits", {
        title,
        habitType: 'intention',
        color: '#00E5FF',
        category: 'general',
      });
      if (response.habit) {
        addHabit({ ...response.habit, completedToday: false, todayCount: 0 });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setIntentionInput('');
    } catch (error) {
      console.log("Failed to create intention:", error);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={["#050813", "#0A0F1C", "#0D1929"]} style={{ flex: 1 }}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00D4FF" />}
        >
          <View className="px-5 pt-4 pb-2 flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-white text-3xl font-semibold">Habits</Text>
              <Text className="text-white/60 text-base mt-1">Build your daily rhythm</Text>
            </View>
            <View className="flex-row items-center">
              <Pressable
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  await loadWeeklyReport();
                  setShowQuickReport(true);
                }}
                className="bg-[#00E5FF]/10 border border-[#00E5FF]/30 rounded-xl px-3 py-2 mr-2 active:scale-95"
              >
                <Text className="text-[#00E5FF] font-bold text-sm">{integrity}%</Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  gatedNav.navigateGated("Marketplace", undefined, "core", "Template Marketplace");
                }}
                className="bg-[#00D4FF]/10 border border-[#00D4FF]/30 rounded-xl px-4 py-3 flex-row items-center active:scale-95"
              >
                <ShoppingBag size={18} color="#00D4FF" />
                <Text className="text-[#00D4FF] font-semibold ml-2">Templates</Text>
              </Pressable>
            </View>
          </View>

          {/* Category Filter */}
          {!loading && habits.length > 0 && (
            <CategoryFilter
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
            />
          )}

          {/* Search Input */}
          {!loading && habits.length > 0 && (
            <View className="px-5 mb-2">
              <View className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl px-4 h-12">
                <Search size={18} color="rgba(255,255,255,0.4)" />
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Search habits..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  className="flex-1 ml-3 text-white font-medium"
                  autoCorrect={false}
                />
                {searchText.length > 0 && (
                  <Pressable onPress={() => setSearchText('')} className="p-1">
                    <X size={16} color="rgba(255,255,255,0.5)" />
                  </Pressable>
                )}
              </View>
            </View>
          )}

          {/* Matrix Heatmap */}
          {!loading && habits.length > 0 && (
            <View className="px-5">
              <MatrixHeatmap habits={habits} className="mb-4" />
            </View>
          )}

          <View className="px-5">
            {/* Quick Intention Input */}
            <View className="flex-row items-center mb-4 gap-2">
              <TextInput
                value={intentionInput}
                onChangeText={setIntentionInput}
                placeholder="Set intention..."
                placeholderTextColor="rgba(255,255,255,0.3)"
                className="flex-1 h-12 bg-white/5 border border-white/10 rounded-2xl px-4 text-white font-medium"
                returnKeyType="done"
                onSubmitEditing={handleAddIntention}
              />
              <Pressable
                onPress={handleAddIntention}
                className="w-12 h-12 rounded-2xl bg-[#00E5FF]/10 border border-[#00E5FF]/30 items-center justify-center active:scale-95"
              >
                <Plus size={22} color="#00E5FF" />
              </Pressable>
            </View>

            {/* Quick Stats Row */}
            {!loading && habits.length > 0 && (
              <View className="flex-row items-center justify-between mb-4 bg-white/5 rounded-2xl p-4">
                <View className="items-center flex-1">
                  <Text className="text-white text-xl font-black">{habits.filter(h => !h.archived && h.protocolStatus !== 'failed').length}</Text>
                  <Text className="text-white/40 text-[10px] font-bold tracking-wider mt-1">ACTIVE</Text>
                </View>
                <View className="w-px h-8 bg-white/10" />
                <View className="items-center flex-1">
                  <Text className="text-[#00C853] text-xl font-black">{habits.filter(h => h.completedToday).length}</Text>
                  <Text className="text-white/40 text-[10px] font-bold tracking-wider mt-1">LOGGED</Text>
                </View>
                <View className="w-px h-8 bg-white/10" />
                <View className="items-center flex-1">
                  <Text className="text-[#FFB800] text-xl font-black">{xp}</Text>
                  <Text className="text-white/40 text-[10px] font-bold tracking-wider mt-1">XP</Text>
                </View>
              </View>
            )}

            {/* Loading State */}
            {loading && habits.length === 0 && (
              <>
                <HabitCardSkeleton />
                <HabitCardSkeleton />
                <HabitCardSkeleton />
              </>
            )}

            {/* Error State */}
            {error && !loading && habits.length === 0 && (
              <GlassCard className="p-8">
                <View className="items-center">
                  <AlertCircle size={48} color="#FF6B6B" className="mb-4" />
                  <Text className="text-white text-xl font-bold mb-2">Unable to Load Habits</Text>
                  <Text className="text-white/70 text-center text-base leading-relaxed mb-6">
                    {error}
                  </Text>
                  <Pressable
                    onPress={async () => {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      loadHabits();
                    }}
                    className="bg-neon-cyan/20 border border-neon-cyan px-6 py-3 rounded-xl active:scale-95"
                  >
                    <Text className="text-neon-cyan font-semibold">Try Again</Text>
                  </Pressable>
                </View>
              </GlassCard>
            )}

            {/* Empty State */}
            {!loading && !error && habits.length === 0 && (
              <GlassCard className="p-8">
                <View className="items-center mb-6">
                  <Text className="text-6xl mb-4">🎯</Text>
                  <Text className="text-white text-xl font-bold mb-2">Start Small, Win Big</Text>
                  <Text className="text-white/70 text-center text-base leading-relaxed mb-6">
                    Transformation happens one habit at a time. Start with just one thing you want to do every day.
                  </Text>
                </View>

                <View className="bg-white/5 rounded-xl p-4 mb-4">
                  <Text className="text-white/60 text-sm font-semibold mb-3">POPULAR FIRST HABITS:</Text>
                  <View className="space-y-2">
                    <View className="flex-row items-center mb-2">
                      <Text className="text-cyan-400 mr-2">💧</Text>
                      <Text className="text-white/80">Drink 8 glasses of water</Text>
                    </View>
                    <View className="flex-row items-center mb-2">
                      <Text className="text-violet-400 mr-2">📖</Text>
                      <Text className="text-white/80">Read for 10 minutes</Text>
                    </View>
                    <View className="flex-row items-center mb-2">
                      <Text className="text-magenta-400 mr-2">🧘</Text>
                      <Text className="text-white/80">5-minute meditation</Text>
                    </View>
                    <View className="flex-row items-center">
                      <Text className="text-green-400 mr-2">🏃</Text>
                      <Text className="text-white/80">30-minute walk</Text>
                    </View>
                  </View>
                </View>

                <Pressable
                  onPress={() => setShowAddModal(true)}
                  className="bg-neon-cyan/20 border border-neon-cyan px-6 py-4 rounded-xl active:scale-95"
                >
                  <Text className="text-neon-cyan font-semibold">Add Your First Habit</Text>
                </Pressable>
              </GlassCard>
            )}

            {/* Habits List */}
            {!loading && !error && habits.length > 0 && (
              <>
                {filteredHabits.map((habit) => {
                const isCompleting = completingHabits.has(habit.id);
                return (
                  <Pressable
                    key={habit.id}
                    onLongPress={() => {
                      if (habit.habitType === 'protocol' || habit.habitType === 'core') {
                        setAnalyticsHabit(habit);
                        setShowAnalytics(true);
                      } else {
                        setSelectedHabitForDeck(habit);
                        setShowCommandDeck(true);
                      }
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    }}
                  >
                    <InteractiveHabitCard
                      habit={habit}
                      onComplete={handleCompleteHabit}
                      onEdit={handleEditHabit}
                      onViewDetails={(habitId) => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        navigation.navigate("HabitDetailScreen", { habitId });
                      }}
                      isCompleting={isCompleting}
                    />
                  </Pressable>
                );
              })}
              </>
            )}

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowAddModal(true);
              }}
              className="mt-4 active:scale-95"
            >
              <GlassCard className="p-5 flex-row items-center justify-center border-dashed">
                <Plus size={24} color="#00D4FF" />
                <Text className="text-neon-cyan text-lg font-semibold ml-2">Add New Habit</Text>
              </GlassCard>
            </Pressable>

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setShowForgeProtocol(true);
              }}
              className="mt-3 active:scale-95"
            >
              <GlassCard className="p-5 flex-row items-center justify-center" style={{ borderColor: '#00E5FF', borderWidth: 1 }}>
                <Shield size={24} color="#00E5FF" />
                <Text className="text-[#00E5FF] text-lg font-semibold ml-2">Forge Protocol</Text>
              </GlassCard>
            </Pressable>
          </View>
        </ScrollView>

        <AddHabitModal
          visible={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleCreateHabit}
        />

        <EditHabitModal
          visible={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingHabit(null);
          }}
          onSubmit={handleUpdateHabit}
          habit={editingHabit}
        />

        <CommandDeck
          visible={showCommandDeck}
          onClose={() => setShowCommandDeck(false)}
          habitTitle={selectedHabitForDeck?.title || ''}
          habitColor={selectedHabitForDeck?.color}
          habitType={selectedHabitForDeck?.habitType}
          todayLogged={selectedHabitForDeck?.todayLogQuality}
          onCommand={handleLogHabit}
        />

        <ForgeProtocolModal
          visible={showForgeProtocol}
          onClose={() => setShowForgeProtocol(false)}
          onConfirm={(data) => {
            handleForgeProtocol(data);
            setShowForgeProtocol(false);
          }}
        />

        <ProtocolAnalyticsModal
          visible={showAnalytics}
          onClose={() => { setShowAnalytics(false); setAnalyticsHabit(null); }}
          habit={analyticsHabit}
          onArchive={handleArchiveHabit}
        />

        <QuickReportModal
          visible={showQuickReport}
          onClose={() => setShowQuickReport(false)}
          onViewFullInsights={() => {
            setShowQuickReport(false);
            navigation.navigate("WeeklyInsights");
          }}
          integrity={weeklyReport?.integrity ?? integrity}
          adherence={weeklyReport?.adherencePercent ?? 0}
          coverageDays={weeklyReport?.coverageDays ?? 0}
          grade={weeklyReport?.grade ?? 'B'}
          xp={weeklyReport?.xp ?? xp}
          activeProtocols={weeklyReport?.activeProtocols ?? 0}
          promotedProtocols={weeklyReport?.promotedProtocols ?? 0}
          failedProtocols={weeklyReport?.failedProtocols ?? 0}
        />
      </LinearGradient>
    </View>
  );
}
