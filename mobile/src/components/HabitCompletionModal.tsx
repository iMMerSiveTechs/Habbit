/**
 * Habit Completion Modal
 * Enhanced modal for completing habits with notes and mood tracking
 */

import { View, Text, Modal, Pressable, TextInput, ScrollView } from "react-native";
import { useState, useEffect } from "react";
import { BlurView } from "expo-blur";
import { GlassCard } from "./GlassCard";
import { LinearGradient } from "expo-linear-gradient";
import { X, CheckCircle2, Heart, Smile, Meh, Frown, AlertCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";

interface HabitCompletionModalProps {
  visible: boolean;
  habitTitle: string;
  habitColor: string;
  onComplete: (note?: string, mood?: number) => void;
  onClose: () => void;
  allowNotes?: boolean;
  allowMood?: boolean;
}

const MOOD_OPTIONS = [
  { value: 1, icon: Frown, color: "#EF4444", label: "Struggled", emoji: "😣" },
  { value: 2, icon: Meh, color: "#F59E0B", label: "Okay", emoji: "😐" },
  { value: 3, icon: Smile, color: "#10B981", label: "Good", emoji: "🙂" },
  { value: 4, icon: Heart, color: "#8B5CF6", label: "Great", emoji: "😊" },
  { value: 5, icon: CheckCircle2, color: "#00D4FF", label: "Amazing", emoji: "🤩" },
];

export function HabitCompletionModal({
  visible,
  habitTitle,
  habitColor,
  onComplete,
  onClose,
  allowNotes = true,
  allowMood = true,
}: HabitCompletionModalProps) {
  const [note, setNote] = useState("");
  const [selectedMood, setSelectedMood] = useState<number | undefined>(undefined);
  const [showQuickNotes, setShowQuickNotes] = useState(false);

  // Reset state when modal closes
  useEffect(() => {
    if (!visible) {
      setNote("");
      setSelectedMood(undefined);
      setShowQuickNotes(false);
    }
  }, [visible]);

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onComplete(note.trim() || undefined, selectedMood);
    onClose();
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onComplete(undefined, undefined);
    onClose();
  };

  // Quick note templates
  const quickNotes = [
    "Felt great!",
    "Was tough but did it",
    "Easy today",
    "Needed motivation",
    "Best session yet",
    "Could be better",
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <BlurView intensity={80} style={{ flex: 1 }} tint="dark">
        <View className="flex-1 justify-end">
          <View className="bg-obsidian rounded-t-3xl border-t-2" style={{ borderTopColor: habitColor }}>
            {/* Header */}
            <View className="px-6 pt-6 pb-4 flex-row items-center justify-between border-b border-white/10">
              <View className="flex-1">
                <Text className="text-white/60 text-sm mb-1">Completing</Text>
                <Text className="text-white text-xl font-bold" numberOfLines={1}>
                  {habitTitle}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                className="w-10 h-10 items-center justify-center bg-white/10 rounded-full active:scale-90"
              >
                <X size={20} color="#fff" />
              </Pressable>
            </View>

            <ScrollView className="max-h-[600px]" showsVerticalScrollIndicator={false}>
              <View className="px-6 py-6">
                {/* Mood Selector */}
                {allowMood && (
                  <View className="mb-6">
                    <Text className="text-white text-base font-semibold mb-3">How did it go?</Text>
                    <View className="flex-row justify-between">
                      {MOOD_OPTIONS.map((mood) => {
                        const isSelected = selectedMood === mood.value;
                        const IconComponent = mood.icon;
                        return (
                          <Pressable
                            key={mood.value}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setSelectedMood(mood.value);
                            }}
                            className="items-center flex-1 active:scale-95"
                          >
                            <View
                              className={`w-14 h-14 rounded-full items-center justify-center mb-2 ${
                                isSelected ? "border-2" : "border border-white/20"
                              }`}
                              style={{
                                backgroundColor: isSelected ? `${mood.color}30` : "rgba(255,255,255,0.05)",
                                borderColor: isSelected ? mood.color : undefined,
                              }}
                            >
                              <Text className="text-2xl">{mood.emoji}</Text>
                            </View>
                            <Text
                              className={`text-xs font-medium ${
                                isSelected ? "text-white" : "text-white/50"
                              }`}
                            >
                              {mood.label}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Notes Section */}
                {allowNotes && (
                  <View className="mb-6">
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="text-white text-base font-semibold">Add a note (optional)</Text>
                      <Pressable
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setShowQuickNotes(!showQuickNotes);
                        }}
                        className="active:scale-95"
                      >
                        <Text className="text-cyan text-sm font-medium">Quick notes</Text>
                      </Pressable>
                    </View>

                    {/* Quick Notes */}
                    {showQuickNotes && (
                      <View className="flex-row flex-wrap gap-2 mb-3">
                        {quickNotes.map((quickNote, index) => (
                          <Pressable
                            key={index}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setNote(quickNote);
                              setShowQuickNotes(false);
                            }}
                            className="bg-white/10 px-3 py-2 rounded-full active:scale-95"
                          >
                            <Text className="text-white/70 text-sm">{quickNote}</Text>
                          </Pressable>
                        ))}
                      </View>
                    )}

                    {/* Text Input */}
                    <GlassCard className="p-4">
                      <TextInput
                        value={note}
                        onChangeText={setNote}
                        placeholder="What did you notice? How did you feel?"
                        placeholderTextColor="rgba(255,255,255,0.4)"
                        multiline
                        numberOfLines={4}
                        maxLength={300}
                        className="text-white text-base"
                        style={{ minHeight: 80, textAlignVertical: "top" }}
                      />
                      <Text className="text-white/40 text-xs mt-2 text-right">
                        {note.length}/300
                      </Text>
                    </GlassCard>

                    {/* Note Tips */}
                    <View className="mt-3 bg-cyan/10 p-3 rounded-xl flex-row">
                      <AlertCircle size={16} color="#00D4FF" style={{ marginTop: 2 }} />
                      <Text className="text-cyan/80 text-xs ml-2 flex-1">
                        Notes help you track patterns and understand what works for you
                      </Text>
                    </View>
                  </View>
                )}

                {/* Action Buttons */}
                <View className="gap-3">
                  {/* Complete Button */}
                  <Pressable onPress={handleComplete} className="active:scale-95">
                    <LinearGradient
                      colors={[habitColor, `${habitColor}CC`]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      className="py-4 rounded-2xl items-center flex-row justify-center"
                    >
                      <CheckCircle2 size={20} color="#fff" />
                      <Text className="text-white text-lg font-bold ml-2">Complete</Text>
                    </LinearGradient>
                  </Pressable>

                  {/* Quick Complete Button */}
                  <Pressable
                    onPress={handleSkip}
                    className="bg-white/10 py-4 rounded-2xl items-center active:scale-95"
                  >
                    <Text className="text-white/70 text-base font-medium">
                      Complete without notes
                    </Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
          </View>
        </View>
      </BlurView>
    </Modal>
  );
}
