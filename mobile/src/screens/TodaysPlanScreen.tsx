import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Sun,
  Sunset,
  Moon,
  CheckCircle2,
  Circle,
  Clock,
  Target,
  Plus,
  ChevronRight,
  AlertCircle,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "@/components/GlassCard";
import { api } from "@/lib/habitApi";
import { todosApi } from "@/lib/todosApi";
import { useNavigation } from "@react-navigation/native";
import type { Todo } from "@/shared/contracts";

interface Habit {
  id: string;
  title: string;
  color: string;
  reminderTime?: string | null;
  completed?: boolean;
}

interface ScheduleItem {
  id: string;
  title: string;
  type: "habit" | "todo";
  time?: string;
  color: string;
  completed: boolean;
  priority?: string;
  dueDate?: string | null;
}

interface TimeBlock {
  name: string;
  icon: any;
  gradient: [string, string];
  items: ScheduleItem[];
  timeRange: string;
}

export default function TodaysPlanScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [intention, setIntention] = useState<any>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [intentionRes, habitsRes, todosRes] = await Promise.all([
        api.getTodayIntention().catch(() => ({ intention: null })),
        api.getHabits().catch(() => ({ habits: [] })),
        todosApi.getTodos().catch(() => ({ todos: [] })),
      ]);

      setIntention(intentionRes.intention);
      setHabits(habitsRes.habits || []);
      setTodos(todosRes.todos?.filter((t: Todo) => !t.completed && !t.archived) || []);

      // Organize into time blocks
      organizeTimeBlocks(habitsRes.habits || [], todosRes.todos || []);
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const organizeTimeBlocks = (habitsData: Habit[], todosData: Todo[]) => {
    const now = new Date();
    const currentHour = now.getHours();

    // Convert habits to schedule items
    const habitItems: ScheduleItem[] = habitsData.map((h) => ({
      id: h.id,
      title: h.title,
      type: "habit" as const,
      time: h.reminderTime || undefined,
      color: h.color || "#00D4FF",
      completed: h.completed || false,
    }));

    // Convert todos to schedule items
    const todoItems: ScheduleItem[] = todosData
      .filter((t: Todo) => !t.completed && !t.archived)
      .map((t) => ({
        id: t.id,
        title: t.title,
        type: "todo" as const,
        time: t.reminderTime || undefined,
        color: getPriorityColor(t.priority),
        completed: t.completed,
        priority: t.priority,
        dueDate: t.dueDate,
      }));

    const allItems = [...habitItems, ...todoItems];

    // Define time blocks
    const blocks: TimeBlock[] = [
      {
        name: "Morning",
        icon: Sun,
        gradient: ["#FFD700", "#FF8C00"],
        items: [],
        timeRange: "5:00 AM - 12:00 PM",
      },
      {
        name: "Afternoon",
        icon: Sunset,
        gradient: ["#00D4FF", "#8B5CF6"],
        items: [],
        timeRange: "12:00 PM - 6:00 PM",
      },
      {
        name: "Evening",
        icon: Moon,
        gradient: ["#8B5CF6", "#FF00E5"],
        items: [],
        timeRange: "6:00 PM - 11:00 PM",
      },
    ];

    // Sort items into time blocks
    allItems.forEach((item) => {
      if (!item.time) {
        // Items without time go to the current or next block
        if (currentHour < 12) blocks[0].items.push(item);
        else if (currentHour < 18) blocks[1].items.push(item);
        else blocks[2].items.push(item);
        return;
      }

      const hour = parseInt(item.time.split(":")[0]);
      if (hour >= 5 && hour < 12) {
        blocks[0].items.push(item);
      } else if (hour >= 12 && hour < 18) {
        blocks[1].items.push(item);
      } else {
        blocks[2].items.push(item);
      }
    });

    // Sort items within each block by time
    blocks.forEach((block) => {
      block.items.sort((a, b) => {
        if (!a.time && !b.time) return 0;
        if (!a.time) return 1;
        if (!b.time) return -1;
        return a.time.localeCompare(b.time);
      });
    });

    setTimeBlocks(blocks);
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high":
        return "#FF3B30";
      case "medium":
        return "#FF9500";
      case "low":
        return "#00D4FF";
      default:
        return "#8E8E93";
    }
  };

  const isItemOverdue = (item: ScheduleItem): boolean => {
    if (item.type !== "todo" || !item.dueDate || item.completed) {
      return false;
    }
    const now = new Date();
    const dueDate = new Date(item.dueDate);
    return dueDate < now;
  };

  const hasTimeConflict = (item: ScheduleItem, allItems: ScheduleItem[]): boolean => {
    if (!item.time) return false;

    const itemHour = parseInt(item.time.split(':')[0]);

    // Check if any other item has the same time
    return allItems.some(otherItem => {
      if (otherItem.id === item.id || !otherItem.time) return false;
      const otherHour = parseInt(otherItem.time.split(':')[0]);
      return itemHour === otherHour;
    });
  };

  const handleItemPress = (item: ScheduleItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Navigate to habits or todos tab using nested navigation
    if (item.type === "habit") {
      navigation.navigate("Tabs", { screen: "HabitsTab" });
    } else {
      navigation.navigate("Tabs", { screen: "TodosTab" });
    }
  };

  const handleStartDay = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // Navigate to Today tab using nested navigation
    navigation.navigate("Tabs", { screen: "TodayTab" });
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#00D4FF" />
            <Text className="text-white/60 mt-4">Loading your plan...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const totalItems = timeBlocks.reduce((sum, block) => sum + block.items.length, 0);
  const completedItems = timeBlocks.reduce(
    (sum, block) => sum + block.items.filter((i) => i.completed).length,
    0
  );

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View className="py-6">
            <Text className="text-white/60 text-sm mb-2">Today&apos;s Focus</Text>
            <Text className="text-white text-3xl font-bold mb-4">Your Plan</Text>
          </View>

          {/* Big Win Card */}
          {intention && (
            <GlassCard intensity="medium" className="p-6 mb-6">
              <View className="flex-row items-center mb-3">
                <View className="bg-gradient-to-r from-cyan-500 to-magenta-500 rounded-full p-2 mr-3">
                  <Target size={20} color="#FFF" />
                </View>
                <Text className="text-white/60 text-sm font-semibold">ONE BIG WIN</Text>
              </View>
              <Text className="text-white text-xl font-bold">{intention.oneBigWin}</Text>
            </GlassCard>
          )}

          {/* Progress Overview */}
          <GlassCard intensity="light" className="p-4 mb-6">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-white/60 text-xs mb-1">Today&apos;s Schedule</Text>
                <Text className="text-white text-2xl font-bold">
                  {totalItems} {totalItems === 1 ? "item" : "items"}
                </Text>
              </View>
              {completedItems > 0 && (
                <View className="items-end">
                  <Text className="text-green-400 text-xs mb-1">Completed</Text>
                  <Text className="text-green-400 text-2xl font-bold">
                    {completedItems}/{totalItems}
                  </Text>
                </View>
              )}
            </View>
          </GlassCard>

          {/* Time Blocks */}
          {timeBlocks.map((block, blockIndex) => {
            if (block.items.length === 0) return null;

            const Icon = block.icon;

            return (
              <View key={block.name} className="mb-6">
                {/* Block Header */}
                <View className="flex-row items-center mb-3">
                  <LinearGradient
                    colors={block.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      borderRadius: 12,
                      padding: 8,
                      marginRight: 12,
                    }}
                  >
                    <Icon size={20} color="#FFF" />
                  </LinearGradient>
                  <View className="flex-1">
                    <Text className="text-white font-bold text-lg">{block.name}</Text>
                    <Text className="text-white/40 text-xs">{block.timeRange}</Text>
                  </View>
                  <View className="bg-white/10 px-3 py-1 rounded-full">
                    <Text className="text-white/60 text-xs font-semibold">
                      {block.items.length} {block.items.length === 1 ? "item" : "items"}
                    </Text>
                  </View>
                </View>

                {/* Block Items */}
                <View className="gap-2">
                  {block.items.map((item) => {
                    const allBlockItems = timeBlocks.reduce((acc, b) => [...acc, ...b.items], [] as ScheduleItem[]);
                    const hasConflict = hasTimeConflict(item, allBlockItems);

                    return (
                    <TouchableOpacity
                      key={item.id}
                      onPress={() => handleItemPress(item)}
                      activeOpacity={0.7}
                    >
                      <GlassCard intensity="medium" className="p-4">
                        <View className="flex-row items-center">
                          {/* Status Icon */}
                          {item.completed ? (
                            <CheckCircle2 size={24} color="#00D4FF" />
                          ) : (
                            <Circle size={24} color={item.color} />
                          )}

                          {/* Content */}
                          <View className="flex-1 ml-3">
                            <View className="flex-row items-center">
                              <Text
                                className={`text-white font-semibold flex-1 ${
                                  item.completed ? "line-through opacity-60" : ""
                                }`}
                              >
                                {item.title}
                              </Text>
                              {/* Overdue Badge */}
                              {isItemOverdue(item) && (
                                <View className="flex-row items-center bg-red-500/20 px-2 py-1 rounded ml-2">
                                  <AlertCircle size={12} color="#FF3B30" />
                                  <Text className="text-red-500 text-xs font-semibold ml-1">Overdue</Text>
                                </View>
                              )}
                            </View>
                            <View className="flex-row items-center mt-1">
                              {item.time && (
                                <View className="flex-row items-center mr-3">
                                  <Clock size={12} color="rgba(255,255,255,0.4)" />
                                  <Text className="text-white/40 text-xs ml-1">{item.time}</Text>
                                  {hasConflict && (
                                    <View className="flex-row items-center bg-yellow-500/20 px-1.5 py-0.5 rounded ml-1.5">
                                      <AlertCircle size={10} color="#FFB800" />
                                      <Text className="text-yellow-500 text-xs font-semibold ml-0.5">Conflict</Text>
                                    </View>
                                  )}
                                </View>
                              )}
                              <View
                                className="px-2 py-0.5 rounded"
                                style={{ backgroundColor: `${item.color}20` }}
                              >
                                <Text
                                  className="text-xs font-semibold"
                                  style={{ color: item.color }}
                                >
                                  {item.type === "habit" ? "Habit" : "Todo"}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Arrow */}
                          <ChevronRight size={20} color="rgba(255,255,255,0.3)" />
                        </View>
                      </GlassCard>
                    </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            );
          })}

          {/* Empty State */}
          {totalItems === 0 && (
            <GlassCard intensity="medium" className="p-8 items-center justify-center">
              <Plus size={48} color="rgba(255,255,255,0.2)" />
              <Text className="text-white/60 text-center mt-4">
                No scheduled items yet.{"\n"}Add some habits or todos to get started!
              </Text>
            </GlassCard>
          )}

          {/* Start Day Button */}
          <TouchableOpacity
            onPress={handleStartDay}
            activeOpacity={0.8}
            className="mb-8 mt-4"
          >
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
              <Text className="text-white font-bold text-xl">Let&apos;s Go!</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
