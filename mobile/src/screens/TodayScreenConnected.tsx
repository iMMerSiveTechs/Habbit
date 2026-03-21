import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, RefreshControl, StyleSheet, Modal, TextInput, Alert } from "react-native";
import { BottomTabScreenProps } from "@/navigation/types";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "@/components/GlassCard";
import { CerebraCard } from "@/components/CerebraCard";
import { FocusOrb } from "@/components/FocusOrb";
import { QuickFlowCapture, FlowSessionData } from "@/components/QuickFlowCapture";
import { FocusSessionReflection, SessionReflectionData } from "@/components/FocusSessionReflection";
import { Zap, Clock, Edit3, ChevronRight, CheckCircle2, Circle, Brain, Play } from "lucide-react-native";
import { RouteMapCard } from "@/components/RouteMapCard";
import { useAppStore } from "@/state/appStore";
import { useGatedNavigation } from "@/hooks/useGatedNavigation";
import { useFocusStore } from "@/state/focusStore";
import { useCerebraStore } from "@/state/cerebraStore";
import { api as habitApi } from "@/lib/habitApi";
import { api } from "@/lib/api";
import { todosApi } from "@/lib/todosApi";
import * as Haptics from "expo-haptics";
import type { Todo } from "@/shared/contracts";
import { achievementService } from "@/services/achievementService";
import { VoiceService } from "@/services/voiceService";
import { useSession } from "@/lib/useSession";

type Props = BottomTabScreenProps<"TodayTab">;

export default function TodayScreenConnected({ navigation }: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const [briefing, setBriefing] = useState<any>(null);
  const [cerebraMessage, setCerebraMessage] = useState<string | null>(null);
  const [showTimerPicker, setShowTimerPicker] = useState(false);
  const [showTaskPicker, setShowTaskPicker] = useState(false);
  const [showFlowCapture, setShowFlowCapture] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [completedSessionId, setCompletedSessionId] = useState<string>("");
  const [completedSessionTask, setCompletedSessionTask] = useState<string>("");
  const [completedSessionDuration, setCompletedSessionDuration] = useState<number>(0);
  const [customMinutes, setCustomMinutes] = useState("25");
  const [habits, setHabits] = useState<any[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [emotionalDashboard, setEmotionalDashboard] = useState<any>(null);

  const todayCompletedCount = habits.filter((h: any) => h.completedToday).length;
  const todayTotalCount = habits.length;

  const userName = useAppStore((state) => state.userName);
  const subscriptionTier = useAppStore((state) => state.subscriptionTier);
  const integrity = useAppStore((s) => s.integrity);
  const themeMode = useAppStore((s) => s.themeMode);
  const setIntegrity = useAppStore((s) => s.setIntegrity);
  const gatedNav = useGatedNavigation();
  const { timer, targetDuration, isRunning, task, setTimer, setTargetDuration, setIsRunning, setTask, incrementTimer, resetTimer } = useFocusStore();
  const { data: session } = useSession();

  useEffect(() => {
    if (!session) return; // Don't fire API calls until session is confirmed
    loadBriefing();
    loadCerebraMessage();
    loadHabits();
    loadTodos();
    loadEmotionalDashboard();
    loadIntegrity();
  }, [session]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => {
        incrementTimer();
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, incrementTimer]);

  const loadBriefing = async () => {
    try {
      const response = await habitApi.getDailyBriefing();
      // Show briefing if we have focus blocks (even without habits)
      if (response.briefing && response.briefing.focusBlocks && response.briefing.focusBlocks.length > 0) {
        setBriefing(response.briefing);
      } else {
        setBriefing(null);
      }
    } catch (error) {
      console.log("No briefing data available");
      setBriefing(null);
    }
  };

  const loadCerebraMessage = async () => {
    if (subscriptionTier !== "pro" && subscriptionTier !== "elite") {
      setCerebraMessage(null);
      return;
    }

    try {
      const response = await habitApi.queryCerebra("What should I focus on today?");
      setCerebraMessage(response.response);
    } catch (error) {
      console.log("Cerebra not available");
      setCerebraMessage(null);
    }
  };

  const loadHabits = async () => {
    try {
      const response = await habitApi.getHabits();
      const allHabits = response.habits || [];
      // Only limit preview tier users; paid users see all habits
      const isPreview = subscriptionTier === "preview";
      setHabits(isPreview ? allHabits.slice(0, 3) : allHabits);
    } catch (error) {
      console.log("No habits data available");
      setHabits([]);
    }
  };

  const loadTodos = async () => {
    try {
      const response = await todosApi.getTodos();
      const incomplete = response.todos?.filter((t: Todo) => !t.completed) || [];
      // Only limit preview tier users; paid users see all todos
      const isPreview = subscriptionTier === "preview";
      setTodos(isPreview ? incomplete.slice(0, 3) : incomplete);
    } catch (error) {
      console.log("No todos data available");
      setTodos([]);
    }
  };

  const loadEmotionalDashboard = async () => {
    try {
      const response = await habitApi.getEmotionalDashboard();
      setEmotionalDashboard(response);
    } catch (error) {
      console.log("No emotional dashboard data available");
      setEmotionalDashboard(null);
    }
  };

  const loadIntegrity = async () => {
    try {
      const response = await api.get<any>("/api/protocol/integrity");
      if (response?.integrity !== undefined) {
        setIntegrity(response.integrity);
      }
    } catch (error) {
      console.log("No integrity data available");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadBriefing(), loadCerebraMessage(), loadHabits(), loadTodos(), loadEmotionalDashboard()]);
    setRefreshing(false);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  const getDailySubtitle = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Today's actions build tomorrow's identity.";
    if (hour < 17) return "Stay on route. Future You is watching.";
    return "Finish strong. Every rep counts.";
  };

  const shouldShowMorningPrompt = () => {
    const hour = new Date().getHours();
    // Show morning prompt if no intention set today AND it's before 6 PM
    return hour < 18 && !emotionalDashboard?.intention;
  };

  const shouldShowEveningPrompt = () => {
    const hour = new Date().getHours();
    // Show evening prompt if no reflection set today AND it's after 5 PM
    return hour >= 17 && !emotionalDashboard?.reflection;
  };

  const formatTimer = () => {
    const minutes = Math.floor(timer / 60);
    const seconds = timer % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleStartFocus = async () => {
    try {
      const taskName = task || "Focus Session";
      const response = await habitApi.startFocusSession(taskName);
      setIsRunning(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to start focus:", error);
    }
  };

  const handleStopFocus = async () => {
    try {
      // Get active session ID from response
      const activeResponse = await habitApi.getActiveSession();
      if (activeResponse.session) {
        // Store session info for reflection
        setCompletedSessionId(activeResponse.session.id);
        setCompletedSessionTask(activeResponse.session.task);
        const sessionDuration = timer; // Use the elapsed time
        setCompletedSessionDuration(sessionDuration);

        // Stop the timer UI
        setIsRunning(false);
        resetTimer();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        // Show reflection modal
        setShowReflection(true);
      }
    } catch (error) {
      console.error("Failed to stop focus:", error);
    }
  };

  const handleSetCustomTimer = () => {
    const minutes = parseInt(customMinutes, 10);
    if (!isNaN(minutes) && minutes > 0 && minutes <= 180) {
      setTargetDuration(minutes * 60);
      setShowTimerPicker(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  const handleTaskSelection = (taskName: string) => {
    useFocusStore.setState({ task: taskName });
    setShowTaskPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // After selecting task, start the focus session
    handleStartFocus();
  };

  const TASK_OPTIONS = [
    { name: "Deep Work", icon: "💻", color: "#00D4FF" },
    { name: "Exercise", icon: "🏃", color: "#FF00E5" },
    { name: "Meditation", icon: "🧘", color: "#8B5CF6" },
    { name: "Reading", icon: "📚", color: "#00FFB3" },
    { name: "Learning", icon: "🎓", color: "#FFB800" },
    { name: "Creative Work", icon: "🎨", color: "#FF3366" },
    { name: "Planning", icon: "📋", color: "#00D4FF" },
    { name: "Cleaning", icon: "🧹", color: "#8B5CF6" },
  ];

  const handleStartFlowSession = async (data: FlowSessionData) => {
    try {
      // Start a rich focus session with full context using authenticated API
      const result = await api.post<{ session: any }>("/api/focus/start-rich", {
        task: data.task,
        sessionType: data.sessionType,
        mood: data.mood,
        energyLevel: data.energyLevel,
        goalDescription: data.goalDescription,
      });

      // Update focus store
      setTimer(data.duration * 60);
      setTargetDuration(data.duration * 60);
      setCustomMinutes(data.duration.toString());
      setIsRunning(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log("Flow session started:", result.session);
    } catch (error) {
      console.error("Failed to start flow session:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Session Error",
        error instanceof Error ? error.message : "Failed to start flow session"
      );
    }
  };

  const handleCompleteReflection = async (reflection: SessionReflectionData) => {
    try {
      // Use authenticated API client
      await api.post("/api/focus/end-rich", {
        id: completedSessionId,
        completed: true,
        productivity: reflection.productivity,
        notes: reflection.notes,
        distractions: reflection.distractions,
        inFlowState: reflection.inFlowState,
      });

      // Voice feedback for flow session completion
      const durationMinutes = Math.floor(completedSessionDuration / 60);
      VoiceService.summarizeFlowSession(durationMinutes);

      console.log("Session reflection saved successfully");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Failed to save reflection:", error);
    } finally {
      setShowReflection(false);
    }
  };

  const handleSkipReflection = async () => {
    try {
      // End session without detailed reflection using authenticated API
      await habitApi.endFocusSession(completedSessionId, true);
    } catch (error) {
      console.error("Failed to end session:", error);
    } finally {
      setShowReflection(false);
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
          <View className="px-5 pt-4 pb-6 flex-row items-start justify-between">
            <View className="flex-1">
              <Text className="text-white text-3xl font-semibold">
                {getGreeting()}
                {userName ? `, ${userName}` : ""}
              </Text>
              <Text className="text-white/60 text-base mt-1">{getDailySubtitle()}</Text>
            </View>
            <View className="bg-[#00E5FF]/10 border border-[#00E5FF]/30 rounded-2xl px-4 py-2 items-center ml-3">
              <Text className="text-[#00E5FF] text-xl font-black">{integrity}%</Text>
              <Text className="text-[#00E5FF]/60 text-[9px] font-bold tracking-widest mt-0.5">INTEGRITY</Text>
            </View>
          </View>

          {/* Route Map Card */}
          <View className="mx-5 mb-5">
            <RouteMapCard
              userName={userName}
              goal={emotionalDashboard?.goal ?? null}
              habits={habits}
              integrity={integrity}
              todayCompletedCount={todayCompletedCount}
              todayTotalCount={todayTotalCount}
            />
          </View>

          {/* Morning Activation Prompt */}
          {shouldShowMorningPrompt() && (
            <Pressable
              onPress={() => {
                navigation.navigate("MorningActivation");
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
            >
              <GlassCard className="mx-5 mb-5 p-5">
                <View className="flex-row items-center">
                  <View className="bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full p-3 mr-4">
                    <Text className="text-2xl">🌅</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-lg mb-1">Start Your Morning</Text>
                    <Text className="text-white/60 text-sm">
                      Set your intention for the day
                    </Text>
                  </View>
                  <View className="bg-cyan-500/20 px-3 py-1 rounded-full">
                    <Text className="text-cyan-400 text-xs font-bold">NEW</Text>
                  </View>
                </View>
              </GlassCard>
            </Pressable>
          )}

          {/* Evening Reflection Prompt */}
          {shouldShowEveningPrompt() && (
            <Pressable
              onPress={() => {
                navigation.navigate("EveningReflection");
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              }}
            >
              <GlassCard className="mx-5 mb-5 p-5">
                <View className="flex-row items-center">
                  <View className="bg-gradient-to-r from-violet-500 to-magenta-500 rounded-full p-3 mr-4">
                    <Text className="text-2xl">🌙</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-lg mb-1">Reflect on Your Day</Text>
                    <Text className="text-white/60 text-sm">
                      Capture wins and insights
                    </Text>
                  </View>
                  <View className="bg-violet-500/20 px-3 py-1 rounded-full">
                    <Text className="text-violet-400 text-xs font-bold">READY</Text>
                  </View>
                </View>
              </GlassCard>
            </Pressable>
          )}

          {/* Identity Statement (if available) */}
          {emotionalDashboard?.identityStatement && (
            <GlassCard className="mx-5 mb-5 p-5">
              <View className="items-center">
                <Text className="text-2xl mb-3">✨</Text>
                <Text className="text-white text-center text-lg leading-relaxed">
                  {emotionalDashboard.identityStatement.statement}
                </Text>
              </View>
            </GlassCard>
          )}

          {briefing && briefing.focusBlocks && briefing.focusBlocks.length > 0 && (
            <GlassCard className="mx-5 mb-5 p-5">
              <Text className="text-white/60 text-xs font-semibold mb-4 tracking-wider">TODAY&apos;S RHYTHM</Text>
              {briefing.focusBlocks.map((block: any, index: number) => {
                const isActiveBlock = isRunning && task === block.task;
                return (
                  <Pressable
                    key={index}
                    onPress={async () => {
                      if (isActiveBlock) {
                        // Already running this block -- stop it
                        resetTimer();
                        setTask("");
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        return;
                      }
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      try {
                        await habitApi.startFocusSession(block.task);
                        resetTimer();
                        setTask(block.task);
                        setIsRunning(true);
                        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      } catch (error) {
                        console.log("Failed to start focus session");
                      }
                    }}
                    className={`flex-row items-center mb-3 rounded-xl p-3 active:scale-95 ${isActiveBlock ? "bg-white/10" : "bg-white/5"}`}
                    style={isActiveBlock ? { borderWidth: 1, borderColor: block.color + "60" } : undefined}
                  >
                    <View
                      className="w-1 h-10 rounded-full mr-3"
                      style={{ backgroundColor: block.color, opacity: isActiveBlock ? 1 : 0.7 }}
                    />
                    <View className="flex-1">
                      <Text className={`font-semibold mb-1 ${isActiveBlock ? "text-white" : "text-white/90"}`}>{block.task}</Text>
                      <View className="flex-row items-center">
                        <Clock size={12} color={isActiveBlock ? block.color : "#ffffff60"} />
                        <Text className={`text-sm ml-1 ${isActiveBlock ? "text-white/80" : "text-white/60"}`}>{block.time}</Text>
                      </View>
                    </View>
                    {isActiveBlock ? (
                      <View className="px-2 py-1 rounded-md" style={{ backgroundColor: block.color + "30" }}>
                        <Text className="text-xs font-semibold" style={{ color: block.color }}>Active</Text>
                      </View>
                    ) : block.suggested ? (
                      <View className="flex-row items-center bg-white/10 px-2 py-1 rounded-md">
                        <Play size={10} color="#00D4FF" />
                        <Text className="text-neon-cyan text-xs font-semibold ml-1">Up Next</Text>
                      </View>
                    ) : (
                      <View className="bg-white/5 px-2 py-1 rounded-md">
                        <Play size={10} color="#ffffff40" />
                      </View>
                    )}
                  </Pressable>
                );
              })}
              {briefing.suggestion && (
                <View className="mt-4 pt-4 border-t border-white/10">
                  <Text className="text-white/70 text-sm">{briefing.suggestion}</Text>
                </View>
              )}
            </GlassCard>
          )}

          {(subscriptionTier === "pro" || subscriptionTier === "elite") && cerebraMessage && (
            <CerebraCard
              message={cerebraMessage}
              onAccept={async () => {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                // Reload to get new suggestion
                await loadCerebraMessage();
              }}
              onDismiss={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                // Clear the current message
                setCerebraMessage(null);
              }}
            />
          )}

          {/* Cerebra Coach Entry */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              gatedNav.navigateGated("CerebraCoach", undefined, "pro", "Cerebra AI Coach");
            }}
            className="mx-5 mb-5 active:scale-[0.98]"
          >
            <LinearGradient
              colors={["rgba(139,92,246,0.15)", "rgba(0,212,255,0.08)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(139,92,246,0.2)" }}
            >
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1">
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center mr-4"
                    style={{ backgroundColor: "rgba(139,92,246,0.2)" }}
                  >
                    <Brain size={24} color="#8B5CF6" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-lg font-semibold mb-0.5">Cerebra Coach</Text>
                    <Text className="text-white/50 text-sm">AI accountability partner</Text>
                  </View>
                </View>
                <ChevronRight size={20} color="rgba(139,92,246,0.6)" />
              </View>
            </LinearGradient>
          </Pressable>

          {/* Habits Preview */}
          {habits.length > 0 && (
            <GlassCard className="mx-5 mb-5 p-5">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-white/60 text-xs font-semibold tracking-wider">TODAY&apos;S HABITS</Text>
                <Pressable
                  onPress={() => {
                    navigation.navigate("HabitsTab");
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  className="flex-row items-center gap-1"
                >
                  <Text className="text-neon-cyan text-xs font-semibold">View All</Text>
                  <ChevronRight size={14} color="#00D4FF" />
                </Pressable>
              </View>
              {habits.map((habit: any, index: number) => (
                <Pressable
                  key={habit.id}
                  onPress={async () => {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    try {
                      await habitApi.completeHabit(habit.id);
                      await loadHabits();
                      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                      // Check for achievements
                      const achievementTrigger = await achievementService.checkHabitCompletionAchievements(
                        habit.id,
                        habit.title
                      );

                      if (achievementTrigger) {
                        const achievement = await achievementService.createAchievement(achievementTrigger);

                        if (achievement && !achievement.alreadyExists) {
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
                    } catch (error) {
                      console.log("Failed to complete habit");
                    }
                  }}
                  className="flex-row items-center mb-3 last:mb-0 bg-white/5 rounded-xl p-3 active:scale-95"
                >
                  <View
                    className="w-10 h-10 rounded-full mr-3 items-center justify-center"
                    style={{ backgroundColor: habit.color || "#00D4FF" }}
                  >
                    {habit.completedToday >= habit.targetCount ? (
                      <CheckCircle2 size={20} color="#FFFFFF" />
                    ) : (
                      <Circle size={20} color="#FFFFFF" />
                    )}
                  </View>
                  <View className="flex-1">
                    <Text className="text-white font-semibold">{habit.title}</Text>
                    <Text className="text-white/60 text-xs mt-1">
                      {habit.completedToday}/{habit.targetCount} completed
                    </Text>
                  </View>
                </Pressable>
              ))}
            </GlassCard>
          )}

          {/* Todos Preview */}
          {todos.length > 0 && (
            <GlassCard className="mx-5 mb-5 p-5">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-white/60 text-xs font-semibold tracking-wider">ACTIVE TODOS</Text>
                <Pressable
                  onPress={() => {
                    navigation.navigate("TodosTab");
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  className="flex-row items-center gap-1"
                >
                  <Text className="text-neon-cyan text-xs font-semibold">View All</Text>
                  <ChevronRight size={14} color="#00D4FF" />
                </Pressable>
              </View>
              {todos.map((todo: Todo, index: number) => {
                const completedItems = todo.items?.filter(item => item.completed).length || 0;
                const totalItems = todo.items?.length || 0;
                const priorityColor = todo.priority === "high" ? "#FF00E5" : todo.priority === "medium" ? "#00D4FF" : "#8B5CF6";

                return (
                  <Pressable
                    key={todo.id}
                    onPress={async () => {
                      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      navigation.navigate("TodosTab");
                    }}
                    className="flex-row items-center mb-3 last:mb-0 bg-white/5 rounded-xl p-3 active:scale-95"
                  >
                    <View
                      className="w-1 h-12 rounded-full mr-3"
                      style={{ backgroundColor: priorityColor }}
                    />
                    <View className="flex-1">
                      <Text className="text-white font-semibold">{todo.title}</Text>
                      {totalItems > 0 && (
                        <Text className="text-white/60 text-xs mt-1">
                          {completedItems}/{totalItems} items completed
                        </Text>
                      )}
                    </View>
                    <ChevronRight size={16} color="#ffffff40" />
                  </Pressable>
                );
              })}
            </GlassCard>
          )}

          <View className="my-10">
            <FocusOrb size={150} timer={formatTimer()} />
            <View className="items-center mt-6">
              {/* Show task name if set */}
              {task && (
                <Text className="text-white/80 text-sm mb-2">
                  {task}
                </Text>
              )}
              {/* Show progress toward target */}
              {isRunning && (
                <Text className="text-white/50 text-xs mb-2">
                  Target: {Math.floor(targetDuration / 60)}:{(targetDuration % 60).toString().padStart(2, '0')}
                </Text>
              )}
              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={isRunning ? handleStopFocus : () => {
                    setShowTaskPicker(true);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  className="px-8 py-3 bg-white/10 border border-white/20 rounded-full active:scale-95"
                >
                  <Text className="text-white font-semibold">{isRunning ? "Stop Focus" : "Start Focus"}</Text>
                </Pressable>
                {!isRunning && (
                  <Pressable
                    onPress={() => {
                      setShowTimerPicker(true);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    className="p-3 bg-white/10 border border-white/20 rounded-full active:scale-95"
                  >
                    <Edit3 size={20} color="#00D4FF" />
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Timer Picker Modal */}
        <Modal
          visible={showTimerPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowTimerPicker(false)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.8)", justifyContent: "center", alignItems: "center" }}
            onPress={() => setShowTimerPicker(false)}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <GlassCard className="mx-5 p-6 w-80">
                <Text className="text-white text-xl font-semibold mb-4 text-center">Set Timer Duration</Text>
                <Text className="text-white/60 text-sm mb-4 text-center">Enter duration in minutes (1-180)</Text>

                <TextInput
                  value={customMinutes}
                  onChangeText={setCustomMinutes}
                  keyboardType="number-pad"
                  placeholder="25"
                  placeholderTextColor="#ffffff40"
                  className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-center text-2xl font-semibold mb-6"
                  selectTextOnFocus
                  autoFocus
                />

                <View className="flex-row gap-3">
                  <Pressable
                    onPress={() => {
                      setShowTimerPicker(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    className="flex-1 px-6 py-3 bg-white/10 border border-white/20 rounded-full active:scale-95"
                  >
                    <Text className="text-white/60 font-semibold text-center">Cancel</Text>
                  </Pressable>
                  <Pressable
                    onPress={handleSetCustomTimer}
                    className="flex-1 px-6 py-3 bg-neon-cyan/20 border border-neon-cyan/50 rounded-full active:scale-95"
                  >
                    <Text className="text-neon-cyan font-semibold text-center">Set Timer</Text>
                  </Pressable>
                </View>
              </GlassCard>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Task Picker Modal */}
        <Modal
          visible={showTaskPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowTaskPicker(false)}
        >
          <Pressable
            style={{ flex: 1, backgroundColor: "rgba(0, 0, 0, 0.8)", justifyContent: "flex-end" }}
            onPress={() => setShowTaskPicker(false)}
          >
            <Pressable onPress={(e) => e.stopPropagation()}>
              <GlassCard className="mx-0 rounded-t-[40px] rounded-b-none p-6">
                <Text className="text-white text-2xl font-semibold mb-2 text-center">What are you focusing on?</Text>
                <Text className="text-white/60 text-sm mb-6 text-center">Choose your activity</Text>

                <ScrollView className="max-h-96" showsVerticalScrollIndicator={false}>
                  <View className="gap-3">
                    {TASK_OPTIONS.map((option) => (
                      <Pressable
                        key={option.name}
                        onPress={() => handleTaskSelection(option.name)}
                        className="flex-row items-center bg-white/5 border border-white/10 rounded-2xl p-4 active:scale-95"
                      >
                        <View
                          className="w-12 h-12 rounded-full items-center justify-center mr-4"
                          style={{ backgroundColor: `${option.color}20` }}
                        >
                          <Text className="text-2xl">{option.icon}</Text>
                        </View>
                        <View className="flex-1">
                          <Text className="text-white font-semibold text-lg">{option.name}</Text>
                        </View>
                        <ChevronRight size={20} color="#ffffff40" />
                      </Pressable>
                    ))}
                  </View>
                </ScrollView>

                <Pressable
                  onPress={() => {
                    setShowTaskPicker(false);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  className="mt-6 px-6 py-3 bg-white/10 border border-white/20 rounded-full active:scale-95"
                >
                  <Text className="text-white/60 font-semibold text-center">Cancel</Text>
                </Pressable>
              </GlassCard>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Quick Flow Capture Modal */}
        <QuickFlowCapture
          visible={showFlowCapture}
          onClose={() => setShowFlowCapture(false)}
          onStartSession={handleStartFlowSession}
        />

        {/* Focus Session Reflection Modal */}
        <FocusSessionReflection
          visible={showReflection}
          sessionId={completedSessionId}
          task={completedSessionTask}
          duration={completedSessionDuration}
          onComplete={handleCompleteReflection}
          onSkip={handleSkipReflection}
        />

        {/* Flow Capture FAB */}
        <Pressable
          onPress={() => {
            setShowFlowCapture(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
          style={styles.fab}
        >
          <LinearGradient colors={["#00D4FF", "#FF00E5"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabGradient}>
            <Zap size={28} color="#FFFFFF" fill="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    shadowColor: "#00D4FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
});
