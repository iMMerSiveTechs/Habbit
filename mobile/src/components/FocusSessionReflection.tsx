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
import { CheckCircle, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";

interface FocusSessionReflectionProps {
  visible: boolean;
  sessionId: string;
  task: string;
  duration: number; // in seconds
  onComplete: (reflection: SessionReflectionData) => void;
  onSkip: () => void;
}

export interface SessionReflectionData {
  productivity: number; // 1-5
  notes?: string;
  distractions?: number;
  inFlowState: boolean;
}

export function FocusSessionReflection({
  visible,
  sessionId,
  task,
  duration,
  onComplete,
  onSkip,
}: FocusSessionReflectionProps) {
  const [productivity, setProductivity] = useState(3);
  const [notes, setNotes] = useState("");
  const [distractions, setDistractions] = useState(0);
  const [inFlowState, setInFlowState] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const data: SessionReflectionData = {
      productivity,
      notes: notes.trim() || undefined,
      distractions: distractions > 0 ? distractions : undefined,
      inFlowState,
    };

    onComplete(data);

    // Reset state
    setTimeout(() => {
      setIsSubmitting(false);
      setProductivity(3);
      setNotes("");
      setDistractions(0);
      setInFlowState(false);
    }, 300);
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProductivity(3);
    setNotes("");
    setDistractions(0);
    setInFlowState(false);
    onSkip();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleSkip}
    >
      <View className="flex-1 bg-[#0A0F1C]">
        <LinearGradient colors={["#050813", "#0D1929"]} style={{ flex: 1 }}>
          {/* Header */}
          <View className="flex-row items-center justify-between px-6 pt-16 pb-4">
            <View>
              <Text className="text-white text-2xl font-bold">Session Complete! 🎉</Text>
              <Text className="text-white/60 text-sm mt-1">
                {formatDuration(duration)} of focused work
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleSkip}
              className="w-10 h-10 items-center justify-center rounded-full bg-white/10"
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
            {/* Task Summary */}
            <GlassCard className="p-5 mb-6">
              <Text className="text-white/60 text-xs font-semibold mb-2">YOU WORKED ON</Text>
              <Text className="text-white text-lg font-semibold">{task}</Text>
            </GlassCard>

            {/* Productivity Rating */}
            <Text className="text-white/80 text-base font-semibold mb-3">
              How productive was this session?
            </Text>
            <View className="flex-row justify-between mb-6">
              {[1, 2, 3, 4, 5].map((level) => (
                <TouchableOpacity
                  key={level}
                  onPress={() => {
                    setProductivity(level);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  className="flex-1 mx-1"
                >
                  <View
                    className={`h-16 rounded-2xl items-center justify-center ${
                      productivity >= level ? "bg-[#00D4FF]" : "bg-white/10"
                    }`}
                  >
                    <Text
                      className={`text-xl font-bold ${
                        productivity >= level ? "text-white" : "text-white/40"
                      }`}
                    >
                      {level}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <View className="flex-row justify-between mb-8">
              <Text className="text-white/40 text-xs">Not productive</Text>
              <Text className="text-white/40 text-xs">Very productive</Text>
            </View>

            {/* Flow State */}
            <Text className="text-white/80 text-base font-semibold mb-3">
              Did you achieve flow state?
            </Text>
            <View className="flex-row gap-3 mb-6">
              <TouchableOpacity
                onPress={() => {
                  setInFlowState(true);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                className="flex-1"
              >
                <View
                  className={`p-4 rounded-2xl border ${
                    inFlowState
                      ? "border-[#00D4FF] bg-[#00D4FF]/10"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      inFlowState ? "text-[#00D4FF]" : "text-white/60"
                    }`}
                  >
                    Yes, I was in the zone! 🌊
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setInFlowState(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                className="flex-1"
              >
                <View
                  className={`p-4 rounded-2xl border ${
                    !inFlowState
                      ? "border-white/20 bg-white/5"
                      : "border-white/10 bg-white/5"
                  }`}
                >
                  <Text
                    className={`text-center font-semibold ${
                      !inFlowState ? "text-white" : "text-white/60"
                    }`}
                  >
                    Not this time
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Distractions */}
            <Text className="text-white/80 text-base font-semibold mb-3">
              How many distractions? (Optional)
            </Text>
            <View className="flex-row gap-2 mb-6">
              {[0, 1, 2, 3, 5, 10].map((count) => (
                <TouchableOpacity
                  key={count}
                  onPress={() => {
                    setDistractions(count);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  className="flex-1"
                >
                  <View
                    className={`py-3 rounded-xl border ${
                      distractions === count
                        ? "border-[#FF00E5] bg-[#FF00E5]/10"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <Text
                      className={`text-center font-semibold ${
                        distractions === count ? "text-[#FF00E5]" : "text-white/60"
                      }`}
                    >
                      {count === 10 ? "10+" : count}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text className="text-white/80 text-base font-semibold mb-3">
              Notes or reflections (Optional)
            </Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="What went well? What could be better?"
              placeholderTextColor="#FFFFFF40"
              className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-base mb-8"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </ScrollView>

          {/* Action Buttons */}
          <View className="px-6 pb-8 pt-4">
            <TouchableOpacity
              onPress={handleComplete}
              disabled={isSubmitting}
              className="mb-3 active:opacity-70"
            >
              <LinearGradient
                colors={["#00D4FF", "#8B5CF6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 18,
                  paddingHorizontal: 32,
                  borderRadius: 16,
                }}
              >
                <View className="flex-row items-center justify-center">
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <CheckCircle size={20} color="#FFFFFF" />
                      <Text className="text-white text-lg font-bold ml-2">
                        Complete Reflection
                      </Text>
                    </>
                  )}
                </View>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSkip}
              className="py-4 active:opacity-70"
            >
              <Text className="text-white/60 text-center font-semibold">
                Skip for now
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    </Modal>
  );
}
