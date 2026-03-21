import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Bell } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { GlassCard } from "@/components/GlassCard";
import { api } from "@/lib/habitApi";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";

type Props = NativeStackScreenProps<RootStackParamList, "EditHabit">;

const COLORS = ["#00D4FF", "#FF00E5", "#8B5CF6", "#00FFB3", "#FFB800", "#FF3366"];

export default function EditHabitScreen({ route, navigation }: Props) {
  const { habitId } = route.params;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [reminderTime, setReminderTime] = useState("09:00");
  const [reminderEnabled, setReminderEnabled] = useState(false);

  useEffect(() => {
    loadHabit();
  }, [habitId]);

  const loadHabit = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getHabit(habitId);
      const habit = response.habit;
      setTitle(habit.title || "");
      setDescription(habit.description || "");
      setSelectedColor(habit.color || COLORS[0]);
      setReminderTime(habit.reminderTime || "09:00");
      setReminderEnabled(habit.reminderEnabled || false);
    } catch (err) {
      console.error("Failed to load habit for editing:", err);
      setError("Failed to load habit. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Validation", "Habit name is required.");
      return;
    }

    try {
      setSaving(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await api.updateHabit(habitId, {
        title: title.trim(),
        description: description.trim() || undefined,
        color: selectedColor,
        reminderTime: reminderEnabled ? reminderTime : undefined,
        reminderEnabled,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } catch (err) {
      console.error("Failed to save habit:", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to save habit. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator size="large" color="#00D4FF" />
            <Text className="text-white/60 mt-4">Loading habit...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }}>
            <Text className="text-white/60 text-center mb-4">{error}</Text>
            <TouchableOpacity onPress={loadHabit} className="px-6 py-3 rounded-xl bg-cyan-500/20">
              <Text className="text-cyan-400 font-semibold">Retry</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        {/* Header */}
        <View className="px-6 py-4 flex-row items-center justify-between border-b border-white/5">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            className="w-10 h-10 items-center justify-center"
          >
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>

          <Text className="text-white text-lg font-bold">Edit Habit</Text>

          <TouchableOpacity
            onPress={handleSave}
            disabled={saving || !title.trim()}
            className="px-4 py-2 rounded-xl"
            style={{ backgroundColor: saving || !title.trim() ? "rgba(0,212,255,0.2)" : "rgba(0,212,255,0.3)" }}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#00D4FF" />
            ) : (
              <Text className="text-cyan-400 font-semibold">Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 24, paddingBottom: 60 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Name & Description */}
          <GlassCard className="p-5 mb-5">
            <Text className="text-white/60 text-xs font-semibold mb-4">HABIT DETAILS</Text>

            <View className="mb-4">
              <Text className="text-white/70 text-sm mb-2 font-semibold">Habit Name</Text>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Morning Meditation"
                placeholderTextColor="rgba(255,255,255,0.3)"
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white"
              />
            </View>

            <View>
              <Text className="text-white/70 text-sm mb-2 font-semibold">Description (Optional)</Text>
              <TextInput
                value={description}
                onChangeText={setDescription}
                placeholder="What does this habit involve?"
                placeholderTextColor="rgba(255,255,255,0.3)"
                className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white"
                multiline
                numberOfLines={2}
                style={{ textAlignVertical: "top" }}
              />
            </View>
          </GlassCard>

          {/* Color Picker */}
          <GlassCard className="p-5 mb-5">
            <Text className="text-white/60 text-xs font-semibold mb-4">COLOR</Text>
            <View className="flex-row gap-3">
              {COLORS.map((color) => (
                <TouchableOpacity
                  key={color}
                  onPress={() => {
                    setSelectedColor(color);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  className="w-12 h-12 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: color,
                    opacity: selectedColor === color ? 1 : 0.45,
                    borderWidth: selectedColor === color ? 3 : 0,
                    borderColor: "#ffffff",
                  }}
                />
              ))}
            </View>
          </GlassCard>

          {/* Reminder */}
          <GlassCard className="p-5 mb-5">
            <Text className="text-white/60 text-xs font-semibold mb-4">REMINDER</Text>

            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Bell size={20} color="#00D4FF" />
                <Text className="text-white font-semibold ml-2">Enable Reminder</Text>
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

            {reminderEnabled && (
              <View>
                <Text className="text-white/70 text-sm mb-2 font-semibold">Reminder Time (HH:MM)</Text>
                <TextInput
                  value={reminderTime}
                  onChangeText={setReminderTime}
                  placeholder="09:00"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  className="bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white"
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
            )}
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
