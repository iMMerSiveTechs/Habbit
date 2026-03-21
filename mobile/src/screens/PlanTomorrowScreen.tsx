import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  Sun,
  Calendar,
  Plus,
  Clock,
  Sparkles,
  Zap,
  TrendingUp,
  X,
  Check,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { GlassCard } from "@/components/GlassCard";
import { DateTimePickerComponent } from "@/components/DateTimePicker";
import { todosApi } from "@/lib/todosApi";
import { api } from "@/lib/habitApi";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "PlanTomorrowScreen">;

interface PlannedItem {
  id: string;
  title: string;
  time: string;
  timeBlock: "morning" | "afternoon" | "evening";
  type: "todo" | "template";
  priority: "low" | "medium" | "high";
}

interface RecurringPattern {
  title: string;
  frequency: number;
  lastDates: string[];
  suggestedAsHabit: boolean;
}

const TIME_BLOCKS = [
  { id: "morning", label: "Morning", icon: Sun, range: "5:00 AM - 12:00 PM", suggestedTimes: ["06:00", "07:00", "08:00", "09:00", "10:00"] },
  { id: "afternoon", label: "Afternoon", icon: Sun, range: "12:00 PM - 6:00 PM", suggestedTimes: ["12:00", "13:00", "14:00", "15:00", "16:00"] },
  { id: "evening", label: "Evening", icon: Sun, range: "6:00 PM - 11:00 PM", suggestedTimes: ["18:00", "19:00", "20:00", "21:00", "22:00"] },
];

const QUICK_TEMPLATES = [
  { title: "Morning Workout", time: "06:00", block: "morning", priority: "high" },
  { title: "Check Email", time: "09:00", block: "morning", priority: "medium" },
  { title: "Lunch Break", time: "12:00", block: "afternoon", priority: "low" },
  { title: "Deep Work Session", time: "14:00", block: "afternoon", priority: "high" },
  { title: "Evening Walk", time: "18:00", block: "evening", priority: "medium" },
  { title: "Review Day", time: "21:00", block: "evening", priority: "medium" },
];

export default function PlanTomorrowScreen({ navigation }: Props) {
  const [plannedItems, setPlannedItems] = useState<PlannedItem[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [recurringPatterns, setRecurringPatterns] = useState<RecurringPattern[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [newItemTitle, setNewItemTitle] = useState("");
  const [selectedTime, setSelectedTime] = useState(new Date());
  const [selectedPriority, setSelectedPriority] = useState<"low" | "medium" | "high">("medium");
  const [selectedBlock, setSelectedBlock] = useState<"morning" | "afternoon" | "evening">("morning");

  useEffect(() => {
    loadRecurringPatterns();
  }, []);

  const loadRecurringPatterns = async () => {
    try {
      // Analyze todos from past 30 days to find patterns
      const response = await todosApi.getTodos();
      const todos = response.todos;

      // Group by title and check frequency
      const titleMap = new Map<string, string[]>();
      todos.forEach(todo => {
        const dates = titleMap.get(todo.title) || [];
        dates.push(todo.createdAt);
        titleMap.set(todo.title, dates);
      });

      // Find items that appear 3+ times in different days
      const patterns: RecurringPattern[] = [];
      titleMap.forEach((dates, title) => {
        if (dates.length >= 3) {
          const uniqueDays = new Set(dates.map(d => new Date(d).toDateString())).size;
          if (uniqueDays >= 3) {
            patterns.push({
              title,
              frequency: dates.length,
              lastDates: dates.slice(-5),
              suggestedAsHabit: dates.length >= 5,
            });
          }
        }
      });

      setRecurringPatterns(patterns.slice(0, 5));
    } catch (error) {
      console.error("Failed to load patterns:", error);
    }
  };

  const addPlannedItem = () => {
    if (!newItemTitle.trim()) return;

    const hours = selectedTime.getHours().toString().padStart(2, "0");
    const minutes = selectedTime.getMinutes().toString().padStart(2, "0");
    const timeStr = `${hours}:${minutes}`;

    const newItem: PlannedItem = {
      id: Date.now().toString(),
      title: newItemTitle.trim(),
      time: timeStr,
      timeBlock: selectedBlock,
      type: "todo",
      priority: selectedPriority,
    };

    setPlannedItems([...plannedItems, newItem]);
    setNewItemTitle("");
    setShowAddModal(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const addTemplate = (template: typeof QUICK_TEMPLATES[0]) => {
    const newItem: PlannedItem = {
      id: Date.now().toString(),
      title: template.title,
      time: template.time,
      timeBlock: template.block as any,
      type: "template",
      priority: template.priority as any,
    };
    setPlannedItems([...plannedItems, newItem]);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removePlannedItem = (id: string) => {
    setPlannedItems(plannedItems.filter(item => item.id !== id));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const convertToHabit = async (pattern: RecurringPattern) => {
    try {
      await api.createHabit({
        title: pattern.title,
        color: "#00D4FF",
        frequency: "daily",
        targetCount: 1,
        reminderEnabled: true,
        recurringType: "daily",
        reminderTime: "09:00",
      });

      Alert.alert(
        "Habit Created!",
        `"${pattern.title}" has been converted to a daily habit.`,
        [{ text: "Great!", style: "default" }]
      );

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      loadRecurringPatterns();
    } catch (error) {
      console.error("Failed to create habit:", error);
      Alert.alert("Error", "Failed to create habit");
    }
  };

  const commitPlan = async () => {
    if (plannedItems.length === 0) {
      Alert.alert("No Items", "Add some items to your plan first!");
      return;
    }

    try {
      setLoading(true);

      // Get tomorrow's date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      // Create todos for all planned items
      for (const item of plannedItems) {
        const [hours, minutes] = item.time.split(':');
        const dueDate = new Date(tomorrow);
        dueDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

        await todosApi.createTodo({
          title: item.title,
          priority: item.priority,
          dueDate: dueDate.toISOString(),
          reminderEnabled: true,
          reminderTime: item.time,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Plan Created!",
        `${plannedItems.length} tasks scheduled for tomorrow.`,
        [
          {
            text: "View Plan",
            onPress: () => navigation.navigate("TodaysPlan" as never),
          },
          {
            text: "Done",
            style: "cancel",
          },
        ]
      );

      setPlannedItems([]);
    } catch (error) {
      console.error("Failed to commit plan:", error);
      Alert.alert("Error", "Failed to create plan");
    } finally {
      setLoading(false);
    }
  };

  const getBlockIcon = (blockId: string) => {
    const block = TIME_BLOCKS.find(b => b.id === blockId);
    return block?.icon || Sun;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "#FF00E5";
      case "medium": return "#00D4FF";
      case "low": return "#8B5CF6";
      default: return "#00D4FF";
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        {/* Header */}
        <View className="px-6 py-6">
          <Text className="text-white text-3xl font-bold">Plan Tomorrow</Text>
          <Text className="text-white/60 text-sm mt-2">
            Design your perfect day before bed
          </Text>
        </View>

        <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
          {/* Recurring Patterns */}
          {recurringPatterns.length > 0 && (
            <View className="mb-6">
              <View className="flex-row items-center mb-3">
                <TrendingUp size={18} color="#FFB800" />
                <Text className="text-white font-bold ml-2">Recurring Patterns Detected</Text>
              </View>

              {recurringPatterns.map((pattern, index) => (
                <GlassCard key={index} intensity="medium" className="p-4 mb-2">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-white font-semibold">{pattern.title}</Text>
                      <Text className="text-white/60 text-xs mt-1">
                        Completed {pattern.frequency} times
                      </Text>
                    </View>
                    {pattern.suggestedAsHabit && (
                      <TouchableOpacity
                        onPress={() => convertToHabit(pattern)}
                        className="bg-neon-cyan/20 px-3 py-2 rounded-lg ml-2"
                      >
                        <View className="flex-row items-center">
                          <Zap size={14} color="#00D4FF" />
                          <Text className="text-neon-cyan text-xs font-semibold ml-1">
                            Make Habit
                          </Text>
                        </View>
                      </TouchableOpacity>
                    )}
                  </View>
                </GlassCard>
              ))}
            </View>
          )}

          {/* Quick Templates */}
          <View className="mb-6">
            <View className="flex-row items-center mb-3">
              <Sparkles size={18} color="#8B5CF6" />
              <Text className="text-white font-bold ml-2">Quick Add Templates</Text>
            </View>

            <View className="flex-row flex-wrap gap-2">
              {QUICK_TEMPLATES.map((template, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => addTemplate(template)}
                  className="bg-white/5 px-3 py-2 rounded-lg border border-white/10"
                >
                  <Text className="text-white/70 text-xs">{template.title}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Planned Items by Time Block */}
          {TIME_BLOCKS.map(block => {
            const blockItems = plannedItems.filter(item => item.timeBlock === block.id);
            if (blockItems.length === 0) return null;

            const Icon = block.icon;

            return (
              <View key={block.id} className="mb-6">
                <View className="flex-row items-center mb-3">
                  <LinearGradient
                    colors={["#00D4FF", "#8B5CF6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ borderRadius: 8, padding: 8, marginRight: 12 }}
                  >
                    <Icon size={16} color="#FFF" />
                  </LinearGradient>
                  <View className="flex-1">
                    <Text className="text-white font-bold">{block.label}</Text>
                    <Text className="text-white/40 text-xs">{block.range}</Text>
                  </View>
                  <Text className="text-white/60 text-xs">{blockItems.length} items</Text>
                </View>

                {blockItems.map(item => (
                  <GlassCard key={item.id} intensity="medium" className="p-4 mb-2">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-1">
                        <Text className="text-white font-semibold">{item.title}</Text>
                        <View className="flex-row items-center mt-1">
                          <Clock size={12} color="rgba(255,255,255,0.4)" />
                          <Text className="text-white/40 text-xs ml-1">{item.time}</Text>
                          <View
                            className="px-2 py-0.5 rounded ml-2"
                            style={{ backgroundColor: `${getPriorityColor(item.priority)}20` }}
                          >
                            <Text
                              className="text-xs font-semibold"
                              style={{ color: getPriorityColor(item.priority) }}
                            >
                              {item.priority}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => removePlannedItem(item.id)}
                        className="ml-2"
                      >
                        <X size={20} color="rgba(255,255,255,0.6)" />
                      </TouchableOpacity>
                    </View>
                  </GlassCard>
                ))}
              </View>
            );
          })}

          {/* Empty State */}
          {plannedItems.length === 0 && (
            <GlassCard intensity="light" className="p-8 items-center justify-center mb-6">
              <Calendar size={48} color="rgba(255,255,255,0.2)" />
              <Text className="text-white/60 text-center mt-4">
                No items planned yet.{"\n"}Add some tasks to design your perfect day!
              </Text>
            </GlassCard>
          )}

          <View className="h-32" />
        </ScrollView>

        {/* Bottom Action Bar */}
        <View className="px-6 py-4 border-t border-white/5">
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => setShowAddModal(true)}
              className="flex-1"
            >
              <LinearGradient
                colors={["#8B5CF6", "#FF00E5"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ borderRadius: 12, padding: 16, alignItems: "center" }}
              >
                <View className="flex-row items-center">
                  <Plus size={20} color="#FFF" />
                  <Text className="text-white font-bold ml-2">Add Item</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {plannedItems.length > 0 && (
              <TouchableOpacity
                onPress={commitPlan}
                disabled={loading}
                className="flex-1"
              >
                <LinearGradient
                  colors={["#00D4FF", "#00FFB3"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ borderRadius: 12, padding: 16, alignItems: "center" }}
                >
                  <View className="flex-row items-center">
                    <Check size={20} color="#FFF" />
                    <Text className="text-white font-bold ml-2">
                      {loading ? "Creating..." : "Commit Plan"}
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Add Item Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
          <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
            <View className="px-6 py-4 border-b border-white/5 flex-row items-center justify-between">
              <Text className="text-white text-xl font-bold">Add to Tomorrow</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-6 py-6">
              {/* Title */}
              <View className="mb-4">
                <Text className="text-white/60 text-sm mb-2 font-medium">What do you want to do?</Text>
                <TextInput
                  value={newItemTitle}
                  onChangeText={setNewItemTitle}
                  placeholder="e.g., Morning workout, Review project..."
                  placeholderTextColor="#ffffff30"
                  className="text-white px-4 py-3.5 rounded-2xl border"
                  style={{
                    backgroundColor: "rgba(30, 35, 45, 0.5)",
                    borderColor: "rgba(255, 255, 255, 0.1)",
                  }}
                  autoFocus
                />
              </View>

              {/* Time Block Selection */}
              <View className="mb-4">
                <Text className="text-white/60 text-sm mb-2 font-medium">When?</Text>
                <View className="flex-row gap-2">
                  {TIME_BLOCKS.map(block => (
                    <TouchableOpacity
                      key={block.id}
                      onPress={() => setSelectedBlock(block.id as any)}
                      className="flex-1 py-3 rounded-2xl items-center"
                      style={{
                        backgroundColor: selectedBlock === block.id ? "#00D4FF20" : "rgba(30, 35, 45, 0.5)",
                        borderWidth: selectedBlock === block.id ? 1.5 : 1,
                        borderColor: selectedBlock === block.id ? "#00D4FF" : "rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: selectedBlock === block.id ? "#00D4FF" : "#ffffff50" }}
                      >
                        {block.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Time Picker */}
              <View className="mb-4">
                <DateTimePickerComponent
                  mode="time"
                  value={selectedTime}
                  onChange={setSelectedTime}
                  label="Specific Time"
                />
              </View>

              {/* Priority */}
              <View className="mb-4">
                <Text className="text-white/60 text-sm mb-2 font-medium">Priority</Text>
                <View className="flex-row gap-3">
                  {(["low", "medium", "high"] as const).map(p => (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setSelectedPriority(p)}
                      className="flex-1 py-3 rounded-2xl items-center"
                      style={{
                        backgroundColor: selectedPriority === p ? `${getPriorityColor(p)}20` : "rgba(30, 35, 45, 0.5)",
                        borderWidth: selectedPriority === p ? 1.5 : 1,
                        borderColor: selectedPriority === p ? getPriorityColor(p) : "rgba(255, 255, 255, 0.1)",
                      }}
                    >
                      <Text
                        className="text-sm font-semibold capitalize"
                        style={{ color: selectedPriority === p ? getPriorityColor(p) : "#ffffff50" }}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View className="px-6 py-4 border-t border-white/5">
              <TouchableOpacity
                onPress={addPlannedItem}
                disabled={!newItemTitle.trim()}
                style={{
                  backgroundColor: newItemTitle.trim() ? "#00D4FF" : "rgba(255, 255, 255, 0.1)",
                  borderRadius: 12,
                  padding: 16,
                  alignItems: "center",
                }}
              >
                <Text
                  className="font-semibold text-lg"
                  style={{ color: newItemTitle.trim() ? "#ffffff" : "#ffffff40" }}
                >
                  Add to Plan
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </View>
  );
}
