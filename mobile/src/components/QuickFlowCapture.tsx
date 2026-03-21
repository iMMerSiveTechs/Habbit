import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { GlassCard } from "./GlassCard";
import {
  Zap,
  Code,
  Palette,
  BookOpen,
  Wrench,
  Lightbulb,
  X,
  ChevronRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

interface QuickFlowCaptureProps {
  visible: boolean;
  onClose: () => void;
  onStartSession: (data: FlowSessionData) => void;
}

export interface FlowSessionData {
  task: string;
  sessionType: "creative" | "coding" | "planning" | "design" | "maintenance" | "learning";
  mood: "energized" | "focused" | "inspired" | "in_flow" | "calm" | "determined";
  energyLevel: number;
  goalDescription?: string;
  duration: number; // minutes
}

export function QuickFlowCapture({ visible, onClose, onStartSession }: QuickFlowCaptureProps) {
  const [mode, setMode] = useState<"quick" | "detailed">("quick");
  const [task, setTask] = useState("");
  const [sessionType, setSessionType] = useState<FlowSessionData["sessionType"]>("creative");
  const [mood, setMood] = useState<FlowSessionData["mood"]>("energized");
  const [energyLevel, setEnergyLevel] = useState(5);
  const [goalDescription, setGoalDescription] = useState("");
  const [duration, setDuration] = useState(60);
  const [isStarting, setIsStarting] = useState(false);

  const sessionTypes = [
    { value: "creative", label: "Creative", icon: Palette, color: "#FF00E5", gradient: ["#FF00E5", "#8B5CF6"] },
    { value: "coding", label: "Coding", icon: Code, color: "#00D4FF", gradient: ["#00D4FF", "#0EA5E9"] },
    { value: "planning", label: "Planning", icon: Lightbulb, color: "#FFD700", gradient: ["#FFD700", "#F59E0B"] },
    { value: "design", label: "Design", icon: Palette, color: "#8B5CF6", gradient: ["#8B5CF6", "#A78BFA"] },
    { value: "maintenance", label: "Maintenance", icon: Wrench, color: "#94A3B8", gradient: ["#94A3B8", "#64748B"] },
    { value: "learning", label: "Learning", icon: BookOpen, color: "#10B981", gradient: ["#10B981", "#059669"] },
  ];

  const moods = [
    { value: "energized", label: "Energized", emoji: "⚡" },
    { value: "focused", label: "Focused", emoji: "🎯" },
    { value: "inspired", label: "Inspired", emoji: "✨" },
    { value: "in_flow", label: "In Flow", emoji: "🌊" },
    { value: "calm", label: "Calm", emoji: "😌" },
    { value: "determined", label: "Determined", emoji: "💪" },
  ];

  const durations = [25, 45, 60, 90, 120];

  const handleClose = () => {
    // Reset state
    setMode("quick");
    setTask("");
    setSessionType("creative");
    setMood("energized");
    setEnergyLevel(5);
    setGoalDescription("");
    setDuration(60);
    onClose();
  };

  const handleStart = async () => {
    if (!task.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setIsStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const data: FlowSessionData = {
      task: task.trim(),
      sessionType,
      mood,
      energyLevel,
      goalDescription: goalDescription.trim() || undefined,
      duration,
    };

    onStartSession(data);

    // Small delay for better UX
    setTimeout(() => {
      setIsStarting(false);
      handleClose();
    }, 300);
  };

  const selectedTypeConfig = sessionTypes.find(t => t.value === sessionType);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View className="flex-1 bg-[#0A0F1C]">
        <LinearGradient
          colors={["#050813", "#0D1929"]}
          style={{ flex: 1 }}
        >
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pt-16 pb-4">
            <View>
              <Text className="text-white text-2xl font-bold">Start Flow Session</Text>
              <Text className="text-white/60 text-sm mt-1">Capture your productive moment</Text>
            </View>
            <TouchableOpacity
              onPress={handleClose}
              className="w-10 h-10 items-center justify-center rounded-full bg-white/10"
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
            {/* Mode Toggle */}
            <View className="flex-row gap-3 mb-6">
              <TouchableOpacity
                onPress={() => {
                  setMode("quick");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                className="flex-1"
              >
                <View
                  className={`p-4 rounded-2xl border ${
                    mode === "quick" ? "border-[#00D4FF] bg-[#00D4FF]/10" : "border-white/10 bg-white/5"
                  }`}
                >
                  <Text className={`text-center font-semibold ${mode === "quick" ? "text-[#00D4FF]" : "text-white/60"}`}>
                    Quick Start
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setMode("detailed");
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                className="flex-1"
              >
                <View
                  className={`p-4 rounded-2xl border ${
                    mode === "detailed" ? "border-[#00D4FF] bg-[#00D4FF]/10" : "border-white/10 bg-white/5"
                  }`}
                >
                  <Text className={`text-center font-semibold ${mode === "detailed" ? "text-[#00D4FF]" : "text-white/60"}`}>
                    Full Context
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* What are you working on? */}
            <Text className="text-white/80 text-base font-semibold mb-3">What are you working on?</Text>
            <TextInput
              value={task}
              onChangeText={setTask}
              placeholder="e.g., Building Vibecode app features"
              placeholderTextColor="#FFFFFF40"
              className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-base mb-6"
              multiline
              numberOfLines={2}
              textAlignVertical="top"
            />

            {/* Session Type */}
            <Text className="text-white/80 text-base font-semibold mb-3">Type of work</Text>
            <View className="flex-row flex-wrap gap-3 mb-6">
              {sessionTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = sessionType === type.value;
                return (
                  <TouchableOpacity
                    key={type.value}
                    onPress={() => {
                      setSessionType(type.value as any);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    className="w-[calc(33.33%-8px)]"
                  >
                    <View
                      className={`p-3 rounded-2xl border items-center ${
                        isSelected
                          ? `border-[${type.color}] bg-[${type.color}]/10`
                          : "border-white/10 bg-white/5"
                      }`}
                      style={
                        isSelected
                          ? { borderColor: type.color, backgroundColor: `${type.color}20` }
                          : {}
                      }
                    >
                      <Icon
                        size={24}
                        color={isSelected ? type.color : "#FFFFFF60"}
                      />
                      <Text
                        className={`text-xs mt-2 font-medium ${
                          isSelected ? "text-white" : "text-white/60"
                        }`}
                      >
                        {type.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {mode === "detailed" && (
              <>
                {/* How are you feeling? */}
                <Text className="text-white/80 text-base font-semibold mb-3">How are you feeling?</Text>
                <View className="flex-row flex-wrap gap-3 mb-6">
                  {moods.map((m) => {
                    const isSelected = mood === m.value;
                    return (
                      <TouchableOpacity
                        key={m.value}
                        onPress={() => {
                          setMood(m.value as any);
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        className="w-[calc(33.33%-8px)]"
                      >
                        <View
                          className={`p-3 rounded-2xl border items-center ${
                            isSelected
                              ? "border-[#00D4FF] bg-[#00D4FF]/10"
                              : "border-white/10 bg-white/5"
                          }`}
                        >
                          <Text className="text-2xl">{m.emoji}</Text>
                          <Text
                            className={`text-xs mt-1 font-medium ${
                              isSelected ? "text-white" : "text-white/60"
                            }`}
                          >
                            {m.label}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Energy Level */}
                <Text className="text-white/80 text-base font-semibold mb-3">
                  Energy Level: {energyLevel}/5
                </Text>
                <View className="flex-row gap-2 mb-6">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <TouchableOpacity
                      key={level}
                      onPress={() => {
                        setEnergyLevel(level);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }}
                      className="flex-1"
                    >
                      <View
                        className={`h-12 rounded-xl ${
                          energyLevel >= level ? "bg-[#00D4FF]" : "bg-white/10"
                        }`}
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Goal Description */}
                <Text className="text-white/80 text-base font-semibold mb-3">
                  What&apos;s your goal? (Optional)
                </Text>
                <TextInput
                  value={goalDescription}
                  onChangeText={setGoalDescription}
                  placeholder="e.g., Finish adaptive notification system"
                  placeholderTextColor="#FFFFFF40"
                  className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-base mb-6"
                  multiline
                  numberOfLines={2}
                  textAlignVertical="top"
                />
              </>
            )}

            {/* Duration */}
            <Text className="text-white/80 text-base font-semibold mb-3">How long?</Text>
            <View className="flex-row gap-3 mb-8">
              {durations.map((d) => {
                const isSelected = duration === d;
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => {
                      setDuration(d);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                    className="flex-1"
                  >
                    <View
                      className={`p-3 rounded-2xl border items-center ${
                        isSelected
                          ? "border-[#00D4FF] bg-[#00D4FF]/10"
                          : "border-white/10 bg-white/5"
                      }`}
                    >
                      <Text
                        className={`text-base font-semibold ${
                          isSelected ? "text-[#00D4FF]" : "text-white/60"
                        }`}
                      >
                        {d}m
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          {/* Start Button */}
          <View className="px-6 pb-8 pt-4">
            <TouchableOpacity
              onPress={handleStart}
              disabled={!task.trim() || isStarting}
              className="active:opacity-70"
            >
              <LinearGradient
                colors={(selectedTypeConfig?.gradient || ["#00D4FF", "#FF00E5"]) as [string, string, ...string[]]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 18,
                  paddingHorizontal: 32,
                  borderRadius: 16,
                  opacity: !task.trim() ? 0.5 : 1,
                }}
              >
                <View className="flex-row items-center justify-center">
                  {isStarting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Zap size={20} color="#FFFFFF" fill="#FFFFFF" />
                      <Text className="text-white text-lg font-bold ml-2">
                        Start Flow Session
                      </Text>
                      <ChevronRight size={20} color="#FFFFFF" className="ml-1" />
                    </>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}
