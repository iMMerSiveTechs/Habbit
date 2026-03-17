import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, TextInput } from "react-native";
import { AlertCircle, CheckCircle, Clock, X, Calendar, Trash2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { GlassCard } from "@/components/GlassCard";
import { AdaptiveIntelligenceService } from "@/services/adaptiveIntelligence";

interface MissedItem {
  id: string;
  itemType: "habit" | "todo";
  itemTitle: string;
  scheduledTime?: string;
  responded: boolean;
  responseType?: string;
}

interface MissedItemsReviewProps {
  missedItems: MissedItem[];
  onComplete: () => void;
}

export function MissedItemsReview({ missedItems, onComplete }: MissedItemsReviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responseNote, setResponseNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentItem = missedItems[currentIndex];
  const isLastItem = currentIndex === missedItems.length - 1;

  if (!currentItem) {
    return null;
  }

  const handleResponse = async (
    responseType: "skip_once" | "reschedule" | "adjust_time" | "remove" | "completed_late"
  ) => {
    try {
      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      await AdaptiveIntelligenceService.respondToMissedItem(
        currentItem.id,
        responseType,
        responseNote || undefined
      );

      // Move to next item or finish
      if (isLastItem) {
        onComplete();
      } else {
        setCurrentIndex(currentIndex + 1);
        setResponseNote("");
      }
    } catch (error) {
      console.error("Failed to record response:", error);
      alert("Failed to save your response. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getResponseColor = (type: string) => {
    switch (type) {
      case "completed_late":
        return "#00D4FF";
      case "skip_once":
        return "#8B5CF6";
      case "reschedule":
        return "#FFD700";
      case "adjust_time":
        return "#FF8C00";
      case "remove":
        return "#FF6B6B";
      default:
        return "#00D4FF";
    }
  };

  return (
    <View className="flex-1">
      {/* Progress indicator */}
      <View className="mb-6 px-6">
        <Text className="text-white/60 text-sm mb-2">
          Missed Item {currentIndex + 1} of {missedItems.length}
        </Text>
        <View className="flex-row gap-2">
          {missedItems.map((_, index) => (
            <View
              key={index}
              className="flex-1 h-1 rounded-full"
              style={{
                backgroundColor: index <= currentIndex ? "#00D4FF" : "#FFFFFF20",
              }}
            />
          ))}
        </View>
      </View>

      <ScrollView className="flex-1 px-6" showsVerticalScrollIndicator={false}>
        {/* Missed item card */}
        <GlassCard intensity="medium" className="p-6 mb-6">
          <View className="flex-row items-start mb-4">
            <View
              className="w-12 h-12 rounded-full items-center justify-center mr-4"
              style={{ backgroundColor: "#FF6B6B20" }}
            >
              <AlertCircle size={24} color="#FF6B6B" />
            </View>
            <View className="flex-1">
              <Text className="text-white text-lg font-semibold mb-1">
                {currentItem.itemTitle}
              </Text>
              <Text className="text-white/60 text-sm capitalize">
                {currentItem.itemType} • Missed today
              </Text>
            </View>
          </View>

          <Text className="text-white/80 text-base mb-4">
            We noticed you didn&apos;t complete this today. What happened?
          </Text>

          {/* Response note input */}
          <TextInput
            value={responseNote}
            onChangeText={setResponseNote}
            placeholder="Optional: Let us know what got in the way..."
            placeholderTextColor="#FFFFFF40"
            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white text-base mb-4"
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </GlassCard>

        {/* Response options */}
        <Text className="text-white/60 text-sm mb-3 px-2">Choose what to do:</Text>

        <View className="gap-3 mb-6">
          {/* Completed Late */}
          <TouchableOpacity
            onPress={() => handleResponse("completed_late")}
            disabled={isSubmitting}
            className="active:opacity-70"
          >
            <GlassCard intensity="light" className="p-4">
              <View className="flex-row items-center">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: "#00D4FF20" }}
                >
                  <CheckCircle size={20} color="#00D4FF" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-base mb-0.5">
                    I did it, just forgot to mark it
                  </Text>
                  <Text className="text-white/60 text-sm">
                    Great! We&apos;ll count it as complete
                  </Text>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>

          {/* Skip Once */}
          <TouchableOpacity
            onPress={() => handleResponse("skip_once")}
            disabled={isSubmitting}
            className="active:opacity-70"
          >
            <GlassCard intensity="light" className="p-4">
              <View className="flex-row items-center">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: "#8B5CF620" }}
                >
                  <X size={20} color="#8B5CF6" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-base mb-0.5">
                    Skip just today
                  </Text>
                  <Text className="text-white/60 text-sm">
                    No big deal, keep going tomorrow
                  </Text>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>

          {/* Reschedule */}
          <TouchableOpacity
            onPress={() => handleResponse("reschedule")}
            disabled={isSubmitting}
            className="active:opacity-70"
          >
            <GlassCard intensity="light" className="p-4">
              <View className="flex-row items-center">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: "#FFD70020" }}
                >
                  <Calendar size={20} color="#FFD700" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-base mb-0.5">
                    Reschedule for tomorrow
                  </Text>
                  <Text className="text-white/60 text-sm">
                    Move it to a better time
                  </Text>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>

          {/* Adjust Time */}
          <TouchableOpacity
            onPress={() => handleResponse("adjust_time")}
            disabled={isSubmitting}
            className="active:opacity-70"
          >
            <GlassCard intensity="light" className="p-4">
              <View className="flex-row items-center">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: "#FF8C0020" }}
                >
                  <Clock size={20} color="#FF8C00" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-base mb-0.5">
                    This time doesn&apos;t work for me
                  </Text>
                  <Text className="text-white/60 text-sm">
                    We&apos;ll suggest a better time
                  </Text>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>

          {/* Remove */}
          <TouchableOpacity
            onPress={() => handleResponse("remove")}
            disabled={isSubmitting}
            className="active:opacity-70"
          >
            <GlassCard intensity="light" className="p-4">
              <View className="flex-row items-center">
                <View
                  className="w-10 h-10 rounded-full items-center justify-center mr-3"
                  style={{ backgroundColor: "#FF6B6B20" }}
                >
                  <Trash2 size={20} color="#FF6B6B" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold text-base mb-0.5">
                    I don&apos;t want to do this anymore
                  </Text>
                  <Text className="text-white/60 text-sm">
                    Remove from your list
                  </Text>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
