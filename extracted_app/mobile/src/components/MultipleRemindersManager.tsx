import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { GlassCard } from "./GlassCard";
import { Plus, Trash2, Clock, Calendar } from "lucide-react-native";
import { DateTimePickerComponent } from "./DateTimePicker";
import * as Haptics from "expo-haptics";
import { api } from "@/lib/api";

interface HabitReminder {
  id: string;
  reminderTime: string;
  recurringType: string;
  recurringDays?: string;
  enabled: boolean;
}

interface MultipleRemindersManagerProps {
  habitId: string;
  onUpdate?: () => void;
}

const RECURRING_TYPES = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "weekly", label: "Weekly" },
];

export function MultipleRemindersManager({ habitId, onUpdate }: MultipleRemindersManagerProps) {
  const [reminders, setReminders] = useState<HabitReminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const [newReminderTime, setNewReminderTime] = useState(() => {
    const date = new Date();
    date.setHours(9, 0, 0, 0);
    return date;
  });
  const [newRecurringType, setNewRecurringType] = useState("daily");
  const [newRecurringDays, setNewRecurringDays] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReminders();
  }, [habitId]);

  const loadReminders = async () => {
    try {
      setLoading(true);
      const response = await api.get<{ reminders: HabitReminder[] }>(
        `/api/habits/${habitId}/reminders`
      );
      setReminders(response.reminders || []);
    } catch (error) {
      console.error("Failed to load reminders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddReminder = async () => {
    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const hours = newReminderTime.getHours().toString().padStart(2, "0");
      const minutes = newReminderTime.getMinutes().toString().padStart(2, "0");
      const reminderTime = `${hours}:${minutes}`;

      await api.post(`/api/habits/${habitId}/reminders`, {
        reminderTime,
        recurringType: newRecurringType,
        recurringDays:
          newRecurringType === "weekly" && newRecurringDays.length > 0
            ? JSON.stringify(newRecurringDays)
            : undefined,
        enabled: true,
      });

      await loadReminders();
      setShowAddReminder(false);

      // Reset form
      const resetDate = new Date();
      resetDate.setHours(9, 0, 0, 0);
      setNewReminderTime(resetDate);
      setNewRecurringType("daily");
      setNewRecurringDays([]);

      if (onUpdate) onUpdate();
    } catch (error) {
      console.error("Failed to add reminder:", error);
      Alert.alert("Error", "Failed to add reminder. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReminder = async (reminderId: string) => {
    Alert.alert(
      "Delete Reminder",
      "Are you sure you want to delete this reminder?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await api.delete(`/api/habits/${habitId}/reminders/${reminderId}`);
              await loadReminders();
              if (onUpdate) onUpdate();
            } catch (error) {
              console.error("Failed to delete reminder:", error);
              Alert.alert("Error", "Failed to delete reminder. Please try again.");
            }
          },
        },
      ]
    );
  };

  const toggleDay = (day: number) => {
    if (newRecurringDays.includes(day)) {
      setNewRecurringDays(newRecurringDays.filter((d) => d !== day));
    } else {
      setNewRecurringDays([...newRecurringDays, day].sort());
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getRecurringLabel = (type: string, days?: string) => {
    if (type === "weekly" && days) {
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const selectedDays = JSON.parse(days);
      return selectedDays.map((d: number) => dayNames[d]).join(", ");
    }
    return RECURRING_TYPES.find((t) => t.value === type)?.label || type;
  };

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  if (loading) {
    return (
      <View className="py-4">
        <ActivityIndicator size="small" color="#00D4FF" />
      </View>
    );
  }

  return (
    <View>
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Clock size={20} color="#00D4FF" />
          <Text className="text-white/70 text-sm font-semibold ml-2">
            Reminders ({reminders.length})
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowAddReminder(!showAddReminder)}
          className="flex-row items-center px-3 py-2 bg-cyan-500/20 rounded-lg active:scale-95"
        >
          <Plus size={16} color="#00D4FF" />
          <Text className="text-cyan-400 text-sm font-semibold ml-1">Add</Text>
        </TouchableOpacity>
      </View>

      {/* Existing Reminders List */}
      {reminders.length > 0 && (
        <ScrollView className="mb-4 max-h-48" nestedScrollEnabled>
          {reminders.map((reminder) => (
            <GlassCard key={reminder.id} intensity="medium" className="p-3 mb-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-white font-bold text-lg mb-1">
                    {formatTime(reminder.reminderTime)}
                  </Text>
                  <View className="flex-row items-center">
                    <Calendar size={12} color="#8B5CF6" />
                    <Text className="text-white/60 text-xs ml-1">
                      {getRecurringLabel(reminder.recurringType, reminder.recurringDays)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleDeleteReminder(reminder.id)}
                  className="w-8 h-8 items-center justify-center bg-red-500/20 rounded-lg active:scale-95"
                >
                  <Trash2 size={16} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            </GlassCard>
          ))}
        </ScrollView>
      )}

      {/* Add New Reminder Form */}
      {showAddReminder && (
        <GlassCard intensity="strong" className="p-4 mb-4">
          <Text className="text-white font-semibold mb-3">Add New Reminder</Text>

          {/* Time Picker */}
          <View className="mb-4">
            <Text className="text-white/70 text-sm mb-2">Time</Text>
            <DateTimePickerComponent
              mode="time"
              value={newReminderTime}
              onChange={setNewReminderTime}
            />
          </View>

          {/* Recurring Type */}
          <View className="mb-4">
            <Text className="text-white/70 text-sm mb-2">Repeat</Text>
            <View className="flex-row flex-wrap gap-2">
              {RECURRING_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  onPress={() => {
                    setNewRecurringType(type.value);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  className={`px-4 py-2 rounded-lg ${
                    newRecurringType === type.value
                      ? "bg-cyan-500/30 border border-cyan-500"
                      : "bg-white/10 border border-white/20"
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      newRecurringType === type.value ? "text-cyan-400" : "text-white/70"
                    }`}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Day Selector for Weekly */}
          {newRecurringType === "weekly" && (
            <View className="mb-4">
              <Text className="text-white/70 text-sm mb-2">Select Days</Text>
              <View className="flex-row flex-wrap gap-2">
                {dayNames.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => toggleDay(index)}
                    className={`w-12 h-12 rounded-full items-center justify-center ${
                      newRecurringDays.includes(index)
                        ? "bg-cyan-500/30 border-2 border-cyan-500"
                        : "bg-white/10 border border-white/20"
                    }`}
                  >
                    <Text
                      className={`text-sm font-semibold ${
                        newRecurringDays.includes(index) ? "text-cyan-400" : "text-white/70"
                      }`}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setShowAddReminder(false)}
              className="flex-1 py-3 bg-white/10 rounded-lg items-center active:scale-95"
            >
              <Text className="text-white/70 font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAddReminder}
              disabled={submitting}
              className="flex-1 py-3 bg-cyan-500 rounded-lg items-center active:scale-95"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text className="text-white font-semibold">Add Reminder</Text>
              )}
            </TouchableOpacity>
          </View>
        </GlassCard>
      )}

      {reminders.length === 0 && !showAddReminder && (
        <Text className="text-white/40 text-sm text-center py-4">
          No reminders set. Tap &quot;Add&quot; to create one.
        </Text>
      )}
    </View>
  );
}
