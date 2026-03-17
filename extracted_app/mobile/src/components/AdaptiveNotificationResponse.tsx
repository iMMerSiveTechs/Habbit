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
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "./GlassCard";
import { CheckCircle, Clock, Calendar, Trash2, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";

interface AdaptiveNotificationResponseProps {
  visible: boolean;
  notification: {
    id: string;
    itemType: "habit" | "todo";
    itemTitle: string;
    message: string;
  } | null;
  onResponse: (responseType: string, note?: string) => void;
  onClose: () => void;
}

export function AdaptiveNotificationResponse({
  visible,
  notification,
  onResponse,
  onClose,
}: AdaptiveNotificationResponseProps) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!notification) return null;

  const handleResponse = async (responseType: string) => {
    try {
      setSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await onResponse(responseType, note || undefined);
      setNote("");
      onClose();
    } catch (error) {
      console.error("Failed to respond:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const responseOptions = [
    {
      type: "completed_late",
      label: "Done!",
      icon: CheckCircle,
      color: "#00D4FF",
      gradient: ["#00D4FF", "#8B5CF6"],
    },
    {
      type: "skip_once",
      label: "Skip Today",
      icon: X,
      color: "#8B5CF6",
      gradient: ["#8B5CF6", "#FF00E5"],
    },
    {
      type: "reschedule",
      label: "Do Later",
      icon: Clock,
      color: "#FFD700",
      gradient: ["#FFD700", "#FF8C00"],
    },
    {
      type: "adjust_time",
      label: "Wrong Time",
      icon: Calendar,
      color: "#FF8C00",
      gradient: ["#FF8C00", "#FF6B6B"],
    },
    {
      type: "remove",
      label: "Remove It",
      icon: Trash2,
      color: "#FF6B6B",
      gradient: ["#FF6B6B", "#FF00E5"],
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      transparent={false}
    >
      <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
        <LinearGradient colors={["#050813", "#0D1929"]} style={{ flex: 1 }}>
          {/* Header */}
          <View className="px-6 pt-16 pb-4">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white text-2xl font-bold">Quick Check-In</Text>
              <TouchableOpacity
                onPress={onClose}
                className="w-10 h-10 items-center justify-center rounded-full bg-white/10"
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <GlassCard className="p-4">
              <Text className="text-white/60 text-xs font-semibold mb-2">
                {notification.itemType.toUpperCase()}
              </Text>
              <Text className="text-white text-lg font-bold mb-2">
                {notification.itemTitle}
              </Text>
              <Text className="text-white/70 text-base">{notification.message}</Text>
            </GlassCard>
          </View>

          <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
            {/* Response Options */}
            <Text className="text-white/80 text-base font-semibold mb-3">
              What&apos;s the situation?
            </Text>
            <View className="gap-3 mb-6">
              {responseOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <TouchableOpacity
                    key={option.type}
                    onPress={() => handleResponse(option.type)}
                    disabled={submitting}
                    activeOpacity={0.7}
                  >
                    <GlassCard className="p-4">
                      <View className="flex-row items-center">
                        <View
                          className="w-12 h-12 rounded-full items-center justify-center mr-4"
                          style={{ backgroundColor: `${option.color}20` }}
                        >
                          <Icon size={24} color={option.color} />
                        </View>
                        <View className="flex-1">
                          <Text className="text-white text-lg font-semibold">
                            {option.label}
                          </Text>
                          <Text className="text-white/50 text-sm">
                            {option.type === "completed_late" && "I already completed it"}
                            {option.type === "skip_once" && "Not doing it today"}
                            {option.type === "reschedule" && "I'll do it later today"}
                            {option.type === "adjust_time" && "This time doesn't work"}
                            {option.type === "remove" && "Not relevant anymore"}
                          </Text>
                        </View>
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Optional Note */}
            <Text className="text-white/80 text-base font-semibold mb-3">
              Add a note (Optional)
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Why did you skip? Any context..."
              placeholderTextColor="#FFFFFF40"
              className="bg-white/5 border border-white/10 rounded-2xl px-4 py-4 text-white text-base mb-6"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!submitting}
            />
          </ScrollView>

          {submitting && (
            <View className="absolute inset-0 items-center justify-center bg-black/50">
              <ActivityIndicator size="large" color="#00D4FF" />
            </View>
          )}
        </LinearGradient>
      </View>
    </Modal>
  );
}
