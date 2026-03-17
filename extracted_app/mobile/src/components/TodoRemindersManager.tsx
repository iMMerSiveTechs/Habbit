import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Plus, Trash2, Clock, Calendar, Bell } from "lucide-react-native";
import { DateTimePickerComponent } from "./DateTimePicker";
import * as Haptics from "expo-haptics";

export interface LocalReminder {
  id: string;
  reminderTime: string; // HH:MM
  recurringType: string;
  recurringDays?: string | null;
  enabled: boolean;
}

interface TodoRemindersManagerProps {
  reminders: LocalReminder[];
  onRemindersChange: (reminders: LocalReminder[]) => void;
  accentColor?: string;
}

const RECURRING_TYPES = [
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekends", label: "Weekends" },
  { value: "weekly", label: "Weekly" },
];

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

let localIdCounter = 0;

export function TodoRemindersManager({
  reminders,
  onRemindersChange,
  accentColor = "#00D4FF",
}: TodoRemindersManagerProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReminderTime, setNewReminderTime] = useState(() => {
    const date = new Date();
    date.setHours(9, 0, 0, 0);
    return date;
  });
  const [newRecurringType, setNewRecurringType] = useState("daily");
  const [newRecurringDays, setNewRecurringDays] = useState<number[]>([]);

  const handleAddReminder = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const hours = newReminderTime.getHours().toString().padStart(2, "0");
    const minutes = newReminderTime.getMinutes().toString().padStart(2, "0");
    const reminderTime = `${hours}:${minutes}`;

    const newReminder: LocalReminder = {
      id: `local_${Date.now()}_${localIdCounter++}`,
      reminderTime,
      recurringType: newRecurringType,
      recurringDays:
        newRecurringType === "weekly" && newRecurringDays.length > 0
          ? JSON.stringify(newRecurringDays)
          : null,
      enabled: true,
    };

    onRemindersChange([...reminders, newReminder]);
    setShowAddForm(false);

    // Reset form
    const resetDate = new Date();
    resetDate.setHours(9, 0, 0, 0);
    setNewReminderTime(resetDate);
    setNewRecurringType("daily");
    setNewRecurringDays([]);
  };

  const handleDeleteReminder = (reminderId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRemindersChange(reminders.filter((r) => r.id !== reminderId));
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
    const hour = parseInt(hours || "0", 10);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getRecurringLabel = (type: string, days?: string | null) => {
    if (type === "weekly" && days) {
      try {
        const selectedDays = JSON.parse(days);
        return selectedDays.map((d: number) => DAY_NAMES[d]).join(", ");
      } catch {
        return "Weekly";
      }
    }
    return RECURRING_TYPES.find((t) => t.value === type)?.label || type;
  };

  return (
    <View className="mb-4">
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-4 py-3 rounded-2xl mb-2"
        style={{
          backgroundColor: "rgba(30, 35, 45, 0.5)",
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.1)",
        }}
      >
        <View className="flex-row items-center">
          <Bell size={20} color={accentColor} />
          <Text className="text-white font-semibold ml-2">
            Reminders{reminders.length > 0 ? ` (${reminders.length})` : ""}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setShowAddForm(!showAddForm);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          className="flex-row items-center px-3 py-1.5 rounded-xl"
          style={{
            backgroundColor: `${accentColor}20`,
          }}
        >
          <Plus size={14} color={accentColor} />
          <Text
            className="text-sm font-semibold ml-1"
            style={{ color: accentColor }}
          >
            Add
          </Text>
        </TouchableOpacity>
      </View>

      {/* Existing Reminders List */}
      {reminders.map((reminder) => (
        <View
          key={reminder.id}
          className="flex-row items-center px-4 py-3 rounded-2xl mb-2"
          style={{
            backgroundColor: "rgba(30, 35, 45, 0.5)",
            borderWidth: 1,
            borderColor: "rgba(255, 255, 255, 0.08)",
          }}
        >
          <Clock size={16} color={accentColor} />
          <View className="flex-1 ml-3">
            <Text className="text-white font-semibold text-base">
              {formatTime(reminder.reminderTime)}
            </Text>
            <Text className="text-white/50 text-xs mt-0.5">
              {getRecurringLabel(reminder.recurringType, reminder.recurringDays)}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => handleDeleteReminder(reminder.id)}
            className="w-8 h-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: "rgba(255, 59, 48, 0.15)" }}
          >
            <Trash2 size={14} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      ))}

      {/* No reminders message */}
      {reminders.length === 0 && !showAddForm && (
        <Text className="text-white/30 text-xs text-center py-2">
          No reminders set
        </Text>
      )}

      {/* Add Reminder Form */}
      {showAddForm && (
        <View
          className="p-4 rounded-2xl mb-2"
          style={{
            backgroundColor: "rgba(30, 35, 45, 0.7)",
            borderWidth: 1,
            borderColor: `${accentColor}30`,
          }}
        >
          <Text className="text-white/70 text-sm mb-2 font-medium">Time</Text>
          <DateTimePickerComponent
            mode="time"
            value={newReminderTime}
            onChange={setNewReminderTime}
          />

          <Text className="text-white/70 text-sm mb-2 mt-3 font-medium">
            Repeat
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-3">
            {RECURRING_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                onPress={() => {
                  setNewRecurringType(type.value);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                className="px-4 py-2 rounded-2xl"
                style={{
                  backgroundColor:
                    newRecurringType === type.value
                      ? `${accentColor}20`
                      : "rgba(30, 35, 45, 0.5)",
                  borderWidth: newRecurringType === type.value ? 1.5 : 1,
                  borderColor:
                    newRecurringType === type.value
                      ? accentColor
                      : "rgba(255, 255, 255, 0.1)",
                }}
              >
                <Text
                  className="text-sm font-semibold"
                  style={{
                    color:
                      newRecurringType === type.value
                        ? accentColor
                        : "#ffffff50",
                  }}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Day Selector for Weekly */}
          {newRecurringType === "weekly" && (
            <View className="mb-3">
              <Text className="text-white/70 text-sm mb-2 font-medium">
                Select Days
              </Text>
              <View className="flex-row gap-2">
                {DAY_NAMES.map((day, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => toggleDay(index)}
                    className="flex-1 py-2 rounded-xl items-center"
                    style={{
                      backgroundColor: newRecurringDays.includes(index)
                        ? "#8B5CF620"
                        : "rgba(30, 35, 45, 0.5)",
                      borderWidth: newRecurringDays.includes(index) ? 1.5 : 1,
                      borderColor: newRecurringDays.includes(index)
                        ? "#8B5CF6"
                        : "rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{
                        color: newRecurringDays.includes(index)
                          ? "#8B5CF6"
                          : "#ffffff50",
                      }}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View className="flex-row gap-2 mt-1">
            <TouchableOpacity
              onPress={() => setShowAddForm(false)}
              className="flex-1 py-3 rounded-xl items-center"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
            >
              <Text className="text-white/60 font-semibold text-sm">
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAddReminder}
              className="flex-1 py-3 rounded-xl items-center"
              style={{ backgroundColor: accentColor }}
            >
              <Text className="text-white font-semibold text-sm">
                Add Reminder
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
