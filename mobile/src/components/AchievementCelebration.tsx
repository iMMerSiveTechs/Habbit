/**
 * Achievement Celebration Animation
 * Enhanced visual celebration when unlocking achievements
 */

import { View, Text, Modal, Pressable, Animated } from "react-native";
import { useEffect, useRef } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Trophy, Sparkles, X } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import ConfettiCannon from "react-native-confetti-cannon";
import type { Badge } from "./AchievementBadges";

interface AchievementCelebrationProps {
  visible: boolean;
  badge: Badge | null;
  onClose: () => void;
}

const RARITY_COLORS = {
  common: {
    primary: "#9CA3AF",
    secondary: "#6B7280",
    glow: "rgba(156, 163, 175, 0.3)",
  },
  rare: {
    primary: "#60A5FA",
    secondary: "#3B82F6",
    glow: "rgba(59, 130, 246, 0.3)",
  },
  epic: {
    primary: "#A78BFA",
    secondary: "#8B5CF6",
    glow: "rgba(139, 92, 246, 0.3)",
  },
  legendary: {
    primary: "#FBBF24",
    secondary: "#F59E0B",
    glow: "rgba(245, 158, 11, 0.3)",
  },
};

export function AchievementCelebration({ visible, badge, onClose }: AchievementCelebrationProps) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const sparkleRotate = useRef(new Animated.Value(0)).current;
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    if (visible && badge) {
      // Fire confetti
      confettiRef.current?.start();

      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Scale in animation
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();

      // Glow pulse animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Sparkle rotation
      Animated.loop(
        Animated.timing(sparkleRotate, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      scaleAnim.setValue(0);
      glowAnim.setValue(0);
      sparkleRotate.setValue(0);
    }
  }, [visible, badge]);

  if (!badge) return null;

  const rarityData = RARITY_COLORS[badge.rarity];
  const sparkleRotateInterpolate = sparkleRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* Confetti */}
      <ConfettiCannon
        ref={confettiRef}
        count={200}
        origin={{ x: -10, y: 0 }}
        fadeOut
        autoStart={false}
      />

      {/* Blur Background */}
      <BlurView intensity={80} style={{ flex: 1 }} tint="dark">
        <View className="flex-1 items-center justify-center px-6">
          {/* Close button */}
          <Pressable
            onPress={onClose}
            className="absolute top-12 right-6 w-10 h-10 items-center justify-center bg-white/10 rounded-full active:scale-90"
          >
            <X size={24} color="#fff" />
          </Pressable>

          {/* Main Card */}
          <Animated.View
            style={{
              transform: [{ scale: scaleAnim }],
            }}
            className="w-full max-w-sm"
          >
            {/* Glow Effect */}
            <Animated.View
              className="absolute inset-0 rounded-3xl"
              style={{
                backgroundColor: rarityData.glow,
                transform: [{ scale: glowScale }],
                opacity: glowAnim,
              }}
            />

            {/* Card Content */}
            <View className="bg-obsidian/95 rounded-3xl border-2 overflow-hidden" style={{ borderColor: rarityData.primary }}>
              {/* Gradient Header */}
              <LinearGradient
                colors={[rarityData.primary, rarityData.secondary, "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ opacity: 0.4 }}
                className="absolute top-0 left-0 right-0 h-64"
              />

              <View className="p-8 items-center">
                {/* "ACHIEVEMENT UNLOCKED" Label */}
                <View className="bg-white/10 px-4 py-2 rounded-full mb-6">
                  <Text className="text-white text-xs font-bold tracking-wider">
                    🎉 ACHIEVEMENT UNLOCKED
                  </Text>
                </View>

                {/* Badge Icon with Sparkles */}
                <View className="relative mb-6">
                  {/* Rotating sparkles */}
                  <Animated.View
                    style={{
                      transform: [{ rotate: sparkleRotateInterpolate }],
                      position: "absolute",
                      top: -20,
                      left: -20,
                      right: -20,
                      bottom: -20,
                    }}
                  >
                    <Sparkles size={60} color={rarityData.primary} style={{ position: "absolute", top: 0, left: "50%" }} />
                    <Sparkles size={40} color={rarityData.primary} style={{ position: "absolute", bottom: 0, right: "10%" }} />
                    <Sparkles size={50} color={rarityData.primary} style={{ position: "absolute", top: "30%", left: 0 }} />
                  </Animated.View>

                  {/* Main Badge Circle */}
                  <View
                    className="w-32 h-32 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: `${rarityData.primary}20`,
                      borderWidth: 4,
                      borderColor: rarityData.primary,
                    }}
                  >
                    <Trophy size={56} color={rarityData.primary} />
                  </View>
                </View>

                {/* Rarity Label */}
                <View
                  className="px-4 py-1 rounded-full mb-3"
                  style={{ backgroundColor: `${rarityData.primary}30` }}
                >
                  <Text className="text-sm font-bold" style={{ color: rarityData.primary }}>
                    {badge.rarity.toUpperCase()}
                  </Text>
                </View>

                {/* Title */}
                <Text className="text-white text-3xl font-bold text-center mb-3">
                  {badge.title}
                </Text>

                {/* Description */}
                <Text className="text-white/70 text-base text-center mb-6">
                  {badge.description}
                </Text>

                {/* Continue Button */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onClose();
                  }}
                  className="w-full active:scale-95"
                >
                  <LinearGradient
                    colors={[rarityData.primary, rarityData.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="py-4 rounded-2xl items-center"
                  >
                    <Text className="text-white text-lg font-bold">Continue</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            </View>
          </Animated.View>
        </View>
      </BlurView>
    </Modal>
  );
}
