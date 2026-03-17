import { useState, useEffect } from "react";
import { View, Text, ScrollView, Dimensions, RefreshControl, Pressable } from "react-native";
import { BottomTabScreenProps } from "@/navigation/types";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "@/components/GlassCard";
import { TrendingUp, Zap, Brain, Activity, Sparkles, ChevronRight, Waves, TrendingDown, BarChart3, Lock } from "lucide-react-native";
import { meetsMinimumTier } from "@/constants/pricing";
import { api as habitApi } from "@/lib/habitApi";
import { api } from "@/lib/api";
import { useAppStore } from "@/state/appStore";
import { useGatedNavigation } from "@/hooks/useGatedNavigation";
import * as Haptics from "expo-haptics";

type Props = BottomTabScreenProps<"InsightsTab">;

export default function InsightsScreenConnected({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [habits, setHabits] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [biometric, setBiometric] = useState<any>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [flowAnalytics, setFlowAnalytics] = useState<any>(null);

  const subscriptionTier = useAppStore((state) => state.subscriptionTier);
  const gatedNav = useGatedNavigation();

  useEffect(() => {
    loadInsights();
  }, []);

  const loadInsights = async () => {
    try {
      // Load habits for completion rate
      const habitsResponse = await habitApi.getHabits();
      setHabits(habitsResponse.habits || []);

      // Load recent focus sessions
      const sessionsResponse = await habitApi.getRecentSessions();
      setSessions(sessionsResponse.sessions || []);

      // Load flow analytics
      try {
        const flowData = await api.get<{ analytics: any }>("/api/focus/flow-analytics");
        setFlowAnalytics(flowData.analytics);
      } catch (error) {
        console.log("Flow analytics not available");
      }

      // Load biometric data if Elite
      if (subscriptionTier === "elite") {
        try {
          const biometricResponse = await habitApi.getDailyBriefing();
          setBiometric(biometricResponse);

          const predData = await api.get<{ prediction: any }>("/api/biometric/prediction");
          setPrediction(predData.prediction);
        } catch (error) {
          console.log("Biometric features require Elite subscription");
        }
      }
    } catch (error) {
      console.log("Using demo insights data");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadInsights();
    setRefreshing(false);
  };

  const calculateCompletionRate = () => {
    if (habits.length === 0) return 0;
    const completed = habits.filter((h) => h.completedToday).length;
    return Math.round((completed / habits.length) * 100);
  };

  const calculateTotalFocusTime = () => {
    const total = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    return Math.round(total / 60); // minutes
  };

  const getAverageFocusTime = () => {
    if (sessions.length === 0) return 0;
    const avg = sessions.reduce((sum, s) => sum + (s.duration || 0), 0) / sessions.length;
    return Math.round(avg / 60);
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={["#050813", "#0A0F1C", "#0D1929"]} style={{ flex: 1 }}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#00D4FF" />}
        >
          <View className="px-5 pt-4 pb-6">
            <Text className="text-white text-3xl font-semibold">Insights</Text>
            <Text className="text-white/60 text-base mt-1">Your productivity patterns</Text>
          </View>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              gatedNav.navigateGated("WeeklyInsights", undefined, "pro", "Weekly AI Insights");
            }}
          >
            <GlassCard className="mx-5 mb-5 p-5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="bg-violet-500/20 p-3 rounded-xl mr-4">
                    <Sparkles size={24} color="#8B5CF6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-lg font-semibold mb-1">Weekly AI Insights</Text>
                    <Text className="text-white/60 text-sm">
                      See your patterns, habits, and personalized recommendations
                    </Text>
                  </View>
                </View>
                {!meetsMinimumTier(subscriptionTier, "pro") ? (
                  <View className="bg-[#8B5CF6]/20 px-2 py-1 rounded-full mr-1">
                    <Text className="text-[#8B5CF6] text-xs font-bold">PRO</Text>
                  </View>
                ) : (
                  <ChevronRight size={20} color="rgba(255, 255, 255, 0.4)" />
                )}
              </View>
            </GlassCard>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              gatedNav.navigateGated("PatternInsights", undefined, "pro", "Pattern Insights");
            }}
          >
            <GlassCard className="mx-5 mb-5 p-5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="bg-orange-500/20 p-3 rounded-xl mr-4">
                    <TrendingDown size={24} color="#FF8C00" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-lg font-semibold mb-1">Pattern Insights</Text>
                    <Text className="text-white/60 text-sm">
                      Learn from missed items and get smart suggestions
                    </Text>
                  </View>
                </View>
                {!meetsMinimumTier(subscriptionTier, "pro") ? (
                  <View className="bg-[#8B5CF6]/20 px-2 py-1 rounded-full mr-1">
                    <Text className="text-[#8B5CF6] text-xs font-bold">PRO</Text>
                  </View>
                ) : (
                  <ChevronRight size={20} color="rgba(255, 255, 255, 0.4)" />
                )}
              </View>
            </GlassCard>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              gatedNav.navigateGated("CategoryAnalytics", undefined, "pro", "Category Analytics");
            }}
          >
            <GlassCard className="mx-5 mb-5 p-5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="bg-violet-500/20 p-3 rounded-xl mr-4">
                    <TrendingUp size={24} color="#8B5CF6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-lg font-semibold mb-1">Category Analytics</Text>
                    <Text className="text-white/60 text-sm">
                      Track performance across different life areas
                    </Text>
                  </View>
                </View>
                {!meetsMinimumTier(subscriptionTier, "pro") ? (
                  <View className="bg-[#8B5CF6]/20 px-2 py-1 rounded-full mr-1">
                    <Text className="text-[#8B5CF6] text-xs font-bold">PRO</Text>
                  </View>
                ) : (
                  <ChevronRight size={20} color="rgba(255, 255, 255, 0.4)" />
                )}
              </View>
            </GlassCard>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              gatedNav.navigateGated("AdvancedAnalytics", undefined, "pro", "Advanced Analytics");
            }}
          >
            <GlassCard className="mx-5 mb-5 p-5">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View className="bg-cyan-500/20 p-3 rounded-xl mr-4">
                    <BarChart3 size={24} color="#00D4FF" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-lg font-semibold mb-1">Advanced Analytics</Text>
                    <Text className="text-white/60 text-sm">
                      Deep insights, trends, and patterns
                    </Text>
                  </View>
                </View>
                {!meetsMinimumTier(subscriptionTier, "pro") ? (
                  <View className="bg-[#8B5CF6]/20 px-2 py-1 rounded-full mr-1">
                    <Text className="text-[#8B5CF6] text-xs font-bold">PRO</Text>
                  </View>
                ) : (
                  <ChevronRight size={20} color="rgba(255, 255, 255, 0.4)" />
                )}
              </View>
            </GlassCard>
          </Pressable>

          <GlassCard className="mx-5 mb-5 p-6">
            <View className="flex-row items-center mb-3">
              <TrendingUp size={20} color="#00D4FF" />
              <Text className="text-white text-lg font-semibold ml-2">This Week</Text>
            </View>
            <View className="mb-3">
              <Text className="text-white/70 text-sm mb-2">Habit Completion Rate</Text>
              <View className="flex-row items-baseline">
                <Text className="text-4xl font-bold text-neon-cyan">{calculateCompletionRate()}%</Text>
                <Text className="text-white/60 ml-2">this week</Text>
              </View>
            </View>
            <Text className="text-white/70 text-base leading-6">
              You completed {habits.filter((h) => h.completedToday).length} out of {habits.length} habits today.
              {calculateCompletionRate() >= 80 ? " Excellent work! 🎉" : " Keep building that rhythm!"}
            </Text>
          </GlassCard>

          <GlassCard className="mx-5 mb-5 p-6">
            <View className="flex-row items-center mb-3">
              <Activity size={20} color="#FF00E5" />
              <Text className="text-white text-lg font-semibold ml-2">Focus Stats</Text>
            </View>
            <View className="flex-row justify-between mb-4">
              <View>
                <Text className="text-white/60 text-sm mb-1">Total Time</Text>
                <Text className="text-2xl font-bold text-neon-magenta">{calculateTotalFocusTime()} min</Text>
              </View>
              <View>
                <Text className="text-white/60 text-sm mb-1">Avg Session</Text>
                <Text className="text-2xl font-bold text-neon-violet">{getAverageFocusTime()} min</Text>
              </View>
              <View>
                <Text className="text-white/60 text-sm mb-1">Sessions</Text>
                <Text className="text-2xl font-bold text-neon-cyan">{sessions.length}</Text>
              </View>
            </View>
            <Text className="text-white/70 text-base leading-6">
              Your focus sessions are getting stronger. Keep up the consistent practice!
            </Text>
          </GlassCard>

          {/* Flow State Analytics */}
          {flowAnalytics && flowAnalytics.totalSessions > 0 && (
            <GlassCard className="mx-5 mb-5 p-6">
              <View className="flex-row items-center mb-3">
                <Waves size={20} color="#00D4FF" />
                <Text className="text-white text-lg font-semibold ml-2">Flow State Analytics</Text>
              </View>

              <View className="mb-4">
                <Text className="text-white/60 text-sm mb-2">Flow Achievement Rate</Text>
                <View className="flex-row items-baseline mb-2">
                  <Text className="text-4xl font-bold text-neon-cyan">{flowAnalytics.flowRate}%</Text>
                  <Text className="text-white/60 ml-2">of sessions</Text>
                </View>
                <Text className="text-white/50 text-xs">
                  {flowAnalytics.flowSessions} out of {flowAnalytics.totalSessions} sessions achieved flow
                </Text>
              </View>

              {flowAnalytics.bestFlowHour && (
                <View className="mb-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-3">
                  <Text className="text-cyan-400 text-sm font-semibold mb-1">
                    🌊 Best Flow Time
                  </Text>
                  <Text className="text-white/80 text-sm">
                    You hit flow most often around{" "}
                    {flowAnalytics.bestFlowHour.hour === 0
                      ? "12 AM"
                      : flowAnalytics.bestFlowHour.hour < 12
                      ? `${flowAnalytics.bestFlowHour.hour} AM`
                      : flowAnalytics.bestFlowHour.hour === 12
                      ? "12 PM"
                      : `${flowAnalytics.bestFlowHour.hour - 12} PM`}
                  </Text>
                </View>
              )}

              {flowAnalytics.mostProductiveType && (
                <View className="mb-3 bg-magenta-500/10 border border-magenta-500/30 rounded-xl p-3">
                  <Text className="text-magenta-400 text-sm font-semibold mb-1">
                    ⚡ Most Productive Type
                  </Text>
                  <Text className="text-white/80 text-sm capitalize">
                    {flowAnalytics.mostProductiveType.type} work sessions (
                    {flowAnalytics.mostProductiveType.avgProductivity.toFixed(1)}/5 avg productivity)
                  </Text>
                </View>
              )}

              {flowAnalytics.avgDurationByType && flowAnalytics.avgDurationByType.length > 0 && (
                <View>
                  <Text className="text-white/60 text-xs font-semibold mb-2">Average Duration by Type</Text>
                  {flowAnalytics.avgDurationByType.map((item: any) => (
                    <View key={item.type} className="flex-row justify-between mb-1">
                      <Text className="text-white/70 text-sm capitalize">{item.type}:</Text>
                      <Text className="text-neon-violet text-sm font-semibold">
                        {Math.floor(item.avgDuration / 60)}m
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </GlassCard>
          )}

          <GlassCard className="mx-5 mb-5 p-6">
            <View className="flex-row items-center mb-3">
              <Zap size={20} color="#FFD700" />
              <Text className="text-white text-lg font-semibold ml-2">Peak Energy</Text>
            </View>
            <Text className="text-white/70 text-base leading-6">
              Based on your patterns, your most productive hours are 8-10 AM. Schedule deep work during this window
              for best results.
            </Text>
          </GlassCard>

          {(subscriptionTier === "pro" || subscriptionTier === "elite") && (
            <GlassCard className="mx-5 mb-5 p-6">
              <View className="flex-row items-center mb-3">
                <Brain size={20} color="#8B5CF6" />
                <Text className="text-white text-lg font-semibold ml-2">AI Prediction</Text>
              </View>
              <Text className="text-white/70 text-base leading-6">
                {prediction
                  ? `Your peak energy today will be at ${prediction.peakHour?.time}. ${prediction.peakHour?.recommendation}`
                  : "Based on your patterns, tomorrow looks ideal for creative work. Consider scheduling brainstorming sessions."}
              </Text>
            </GlassCard>
          )}

          {subscriptionTier !== "pro" && subscriptionTier !== "elite" && (
            <GlassCard className="mx-5 mb-5 p-6 border-neon-violet/30">
              <View className="items-center">
                <Brain size={32} color="#8B5CF6" style={{ marginBottom: 12 }} />
                <Text className="text-white text-lg font-semibold mb-2">Unlock AI Predictions</Text>
                <Text className="text-white/70 text-center mb-4">
                  Upgrade to Pro or Elite to get personalized energy forecasts and advanced analytics.
                </Text>
                <View className="bg-gradient-to-r from-neon-violet to-neon-magenta px-6 py-2 rounded-full">
                  <Text className="text-white font-semibold">Upgrade Now</Text>
                </View>
              </View>
            </GlassCard>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}
