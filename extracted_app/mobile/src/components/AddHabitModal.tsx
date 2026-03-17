import { useState } from "react";
import { View, Text, TextInput, Pressable, Modal, ScrollView, Switch } from "react-native";
import { GlassCard } from "./GlassCard";
import { DateTimePickerComponent } from "./DateTimePicker";
import { X, Plus, Clock, Bell } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import type { CreateHabitRequest, HabitCategory } from "@/shared/contracts";

interface AddHabitModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (habit: CreateHabitRequest) => void;
}

const COLORS = ["#00D4FF", "#FF00E5", "#8B5CF6", "#00FFB3", "#FFB800", "#FF3366"];
const FREQUENCIES = ["daily", "weekly", "weekdays", "weekends"];
const RECURRING_TYPES = [
  { value: "daily", label: "Daily" },
  { value: "hourly", label: "Every Hour" },
  { value: "weekly", label: "Weekly" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "custom", label: "Custom" },
];
const CATEGORIES: { value: HabitCategory; label: string; emoji: string }[] = [
  { value: "health", label: "Health", emoji: "💪" },
  { value: "mind", label: "Mind", emoji: "🧠" },
  { value: "work", label: "Work", emoji: "💼" },
  { value: "growth", label: "Growth", emoji: "🌱" },
  { value: "fitness", label: "Fitness", emoji: "🏃" },
  { value: "mindfulness", label: "Mindfulness", emoji: "🧘" },
  { value: "social", label: "Social", emoji: "👥" },
  { value: "leisure", label: "Leisure", emoji: "🎮" },
  { value: "general", label: "General", emoji: "📌" },
];

export function AddHabitModal({ visible, onClose, onSubmit }: AddHabitModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [selectedCategory, setSelectedCategory] = useState<HabitCategory>("general");
  const [frequency, setFrequency] = useState("daily");
  const [targetCount, setTargetCount] = useState(1);

  // New recurring schedule fields
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [recurringType, setRecurringType] = useState<"daily" | "hourly" | "weekly" | "custom" | "weekdays" | "weekends" | "none">("daily");
  const [recurringInterval, setRecurringInterval] = useState(1);
  const [recurringDays, setRecurringDays] = useState<number[]>([]);

  // Use Date object for time picker
  const [reminderTimeDate, setReminderTimeDate] = useState(() => {
    const date = new Date();
    date.setHours(9, 0, 0, 0);
    return date;
  });

  const handleSubmit = () => {
    if (!title.trim()) return;

    // Convert Date to HH:MM string
    const hours = reminderTimeDate.getHours().toString().padStart(2, "0");
    const minutes = reminderTimeDate.getMinutes().toString().padStart(2, "0");
    const reminderTime = `${hours}:${minutes}`;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      color: selectedColor,
      category: selectedCategory,
      frequency,
      targetCount,
      reminderEnabled,
      recurringType: reminderEnabled ? recurringType : undefined,
      recurringInterval: reminderEnabled && (recurringType === "hourly" || recurringType === "custom") ? recurringInterval : undefined,
      recurringDays: reminderEnabled && recurringType === "weekly" && recurringDays.length > 0 ? recurringDays : undefined,
      reminderTime: reminderEnabled ? reminderTime : undefined,
      habitType: "standard",
    });

    // Reset form
    setTitle("");
    setDescription("");
    setSelectedColor(COLORS[0]);
    setSelectedCategory("general");
    setFrequency("daily");
    setTargetCount(1);
    setReminderEnabled(false);
    setRecurringType("daily");
    setRecurringInterval(1);
    setRecurringDays([]);
    const resetDate = new Date();
    resetDate.setHours(9, 0, 0, 0);
    setReminderTimeDate(resetDate);
    onClose();
  };

  const toggleDay = (day: number) => {
    if (recurringDays.includes(day)) {
      setRecurringDays(recurringDays.filter((d) => d !== day));
    } else {
      setRecurringDays([...recurringDays, day].sort());
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View className="flex-1 bg-obsidian-dark/95 justify-end">
        <GlassCard className="m-0 rounded-t-[40px] rounded-b-none p-6" intensity="strong">
          <View className="flex-row items-center justify-between mb-6">
            <Text className="text-white text-2xl font-bold">New Habit</Text>
            <Pressable onPress={onClose} className="w-10 h-10 items-center justify-center active:scale-90">
              <X size={24} color="#ffffff" />
            </Pressable>
          </View>

          <ScrollView className="max-h-[500px]" showsVerticalScrollIndicator={false}>
            {/* Title Input */}
            <View className="mb-4">
              <Text className="text-white/70 text-sm mb-2 font-semibold">Habit Name</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Morning Meditation"
                placeholderTextColor="rgba(255,255,255,0.3)"
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white"
                autoFocus
              />
            </View>

            {/* Description */}
            <View className="mb-4">
              <Text className="text-white/70 text-sm mb-2 font-semibold">Description (Optional)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="What does this habit involve?"
                placeholderTextColor="rgba(255,255,255,0.3)"
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white"
                multiline
                numberOfLines={2}
              />
            </View>

            {/* Color Picker */}
            <View className="mb-4">
              <Text className="text-white/70 text-sm mb-2 font-semibold">Color</Text>
              <View className="flex-row gap-3">
                {COLORS.map((color) => (
                  <Pressable
                    key={color}
                    onPress={() => {
                      setSelectedColor(color);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    className="w-12 h-12 rounded-full items-center justify-center active:scale-90"
                    style={{
                      backgroundColor: color,
                      opacity: selectedColor === color ? 1 : 0.5,
                      borderWidth: selectedColor === color ? 3 : 0,
                      borderColor: "#ffffff",
                    }}
                  />
                ))}
              </View>
            </View>

            {/* Category Picker */}
            <View className="mb-4">
              <Text className="text-white/70 text-sm mb-2 font-semibold">Category</Text>
              <View className="flex-row flex-wrap gap-2">
                {CATEGORIES.map((cat) => (
                  <Pressable
                    key={cat.value}
                    onPress={() => {
                      setSelectedCategory(cat.value);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    className={`px-4 py-2 rounded-full border flex-row items-center gap-2 ${
                      selectedCategory === cat.value
                        ? "bg-neon-cyan/20 border-neon-cyan"
                        : "bg-white/5 border-white/20"
                    } active:scale-95`}
                  >
                    <Text className="text-lg">{cat.emoji}</Text>
                    <Text className={selectedCategory === cat.value ? "text-neon-cyan font-semibold" : "text-white/70"}>
                      {cat.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Frequency */}
            <View className="mb-4">
              <Text className="text-white/70 text-sm mb-2 font-semibold">Frequency</Text>
              <View className="flex-row flex-wrap gap-2">
                {FREQUENCIES.map((freq) => (
                  <Pressable
                    key={freq}
                    onPress={() => {
                      setFrequency(freq);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    className={`px-4 py-2 rounded-full border ${
                      frequency === freq
                        ? "bg-neon-cyan/20 border-neon-cyan"
                        : "bg-white/5 border-white/20"
                    } active:scale-95`}
                  >
                    <Text className={frequency === freq ? "text-neon-cyan font-semibold" : "text-white/70"}>
                      {freq.charAt(0).toUpperCase() + freq.slice(1)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Target Count */}
            <View className="mb-6">
              <Text className="text-white/70 text-sm mb-2 font-semibold">Times per day</Text>
              <View className="flex-row gap-2">
                {[1, 2, 3, 4, 5].map((count) => (
                  <Pressable
                    key={count}
                    onPress={() => {
                      setTargetCount(count);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    className={`flex-1 py-3 rounded-xl border ${
                      targetCount === count
                        ? "bg-neon-violet/20 border-neon-violet"
                        : "bg-white/5 border-white/20"
                    } items-center active:scale-95`}
                  >
                    <Text
                      className={`font-semibold ${
                        targetCount === count ? "text-neon-violet" : "text-white/70"
                      }`}
                    >
                      {count}x
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Reminder Toggle */}
            <View className="mb-4 flex-row items-center justify-between bg-white/5 px-4 py-3 rounded-xl">
              <View className="flex-row items-center">
                <Bell size={20} color="#00D4FF" />
                <Text className="text-white font-semibold ml-2">Enable Reminders</Text>
              </View>
              <Switch
                value={reminderEnabled}
                onValueChange={(value) => {
                  setReminderEnabled(value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                trackColor={{ false: "#767577", true: "#00D4FF" }}
                thumbColor={reminderEnabled ? "#ffffff" : "#f4f3f4"}
              />
            </View>

            {/* Recurring Schedule Options */}
            {reminderEnabled && (
              <>
                <View className="mb-4">
                  <Text className="text-white/70 text-sm mb-2 font-semibold">Reminder Schedule</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {RECURRING_TYPES.map((type) => (
                      <Pressable
                        key={type.value}
                        onPress={() => {
                          setRecurringType(type.value as any);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        className={`px-3 py-2 rounded-full border ${
                          recurringType === type.value
                            ? "bg-neon-magenta/20 border-neon-magenta"
                            : "bg-white/5 border-white/20"
                        } active:scale-95`}
                      >
                        <Text className={recurringType === type.value ? "text-neon-magenta font-semibold text-xs" : "text-white/70 text-xs"}>
                          {type.label}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>

                {/* Interval for hourly or custom */}
                {(recurringType === "hourly" || recurringType === "custom") && (
                  <View className="mb-4">
                    <Text className="text-white/70 text-sm mb-2 font-semibold">
                      {recurringType === "hourly" ? "Every X Hours" : "Every X Days"}
                    </Text>
                    <View className="flex-row gap-2">
                      {[1, 2, 3, 4, 6, 8, 12].map((interval) => (
                        <Pressable
                          key={interval}
                          onPress={() => {
                            setRecurringInterval(interval);
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }}
                          className={`px-4 py-2 rounded-xl border ${
                            recurringInterval === interval
                              ? "bg-neon-cyan/20 border-neon-cyan"
                              : "bg-white/5 border-white/20"
                          } active:scale-95`}
                        >
                          <Text className={recurringInterval === interval ? "text-neon-cyan font-semibold" : "text-white/70"}>
                            {interval}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                {/* Day selection for weekly */}
                {recurringType === "weekly" && (
                  <View className="mb-4">
                    <Text className="text-white/70 text-sm mb-2 font-semibold">Select Days</Text>
                    <View className="flex-row gap-2">
                      {dayNames.map((day, index) => (
                        <Pressable
                          key={index}
                          onPress={() => toggleDay(index)}
                          className={`flex-1 py-2 rounded-xl border ${
                            recurringDays.includes(index)
                              ? "bg-neon-violet/20 border-neon-violet"
                              : "bg-white/5 border-white/20"
                          } items-center active:scale-95`}
                        >
                          <Text className={recurringDays.includes(index) ? "text-neon-violet font-semibold text-xs" : "text-white/70 text-xs"}>
                            {day}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>
                )}

                {/* Time picker */}
                <View className="mb-4">
                  <DateTimePickerComponent
                    mode="time"
                    value={reminderTimeDate}
                    onChange={setReminderTimeDate}
                    label="Reminder Time"
                  />
                </View>
              </>
            )}
          </ScrollView>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={!title.trim()}
            className={`py-4 rounded-2xl items-center active:scale-95 mt-4 ${
              title.trim()
                ? "bg-gradient-to-r from-neon-cyan to-neon-magenta"
                : "bg-white/10"
            }`}
            style={{
              backgroundColor: title.trim() ? undefined : "rgba(255,255,255,0.1)",
            }}
          >
            <Text className={`font-semibold text-lg ${title.trim() ? "text-white" : "text-white/40"}`}>
              Create Habit
            </Text>
          </Pressable>
        </GlassCard>
      </View>
    </Modal>
  );
}
