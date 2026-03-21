import React, { useEffect, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Trophy, Zap, Award, Star, Crown, Flame, Share2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import ConfettiCannon from "react-native-confetti-cannon";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { SocialSharingService } from "@/services/socialSharingService";

type AchievementType = "first_completion" | "7_day_streak" | "30_day_streak" | "90_day_streak" | "morning_stack_complete" | "focus_master" | "consistency_king";

interface Achievement {
  id: string;
  type: AchievementType;
  title: string;
  description: string;
  habitId?: string | null;
}

type RouteParams = {
  AchievementCelebration: {
    achievement: Achievement;
  };
};

export default function AchievementCelebrationScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RouteParams, "AchievementCelebration">>();
  const { achievement } = route.params;

  const confettiRef = useRef<any>(null);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const handleShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    await SocialSharingService.shareAchievement(
      achievement.title,
      achievement.description,
      achievement.habitId || undefined
    );
  };

  useEffect(() => {
    // Trigger confetti
    setTimeout(() => {
      confettiRef.current?.start();
    }, 100);

    // Haptic celebration
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 200);

    // Animate badge
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 1.2,
        tension: 50,
        friction: 3,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Fade in text
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      delay: 300,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim, fadeAnim]);

  const identityStatement = getIdentityStatement(achievement.type as AchievementType);

  const getAchievementConfig = (type: AchievementType) => {
    const configs = {
      first_completion: {
        icon: Zap,
        color: "#00D4FF",
        gradient: ["#00D4FF", "#FF00E5"],
        emoji: "🎯",
      },
      "7_day_streak": {
        icon: Flame,
        color: "#FF8C00",
        gradient: ["#FF8C00", "#FF00E5"],
        emoji: "🔥",
      },
      "30_day_streak": {
        icon: Trophy,
        color: "#FFD700",
        gradient: ["#FFD700", "#FF00E5"],
        emoji: "🏆",
      },
      "90_day_streak": {
        icon: Crown,
        color: "#FF00E5",
        gradient: ["#FF00E5", "#8B5CF6"],
        emoji: "👑",
      },
      morning_stack_complete: {
        icon: Star,
        color: "#00D4FF",
        gradient: ["#00D4FF", "#8B5CF6"],
        emoji: "⭐",
      },
      focus_master: {
        icon: Award,
        color: "#8B5CF6",
        gradient: ["#8B5CF6", "#00D4FF"],
        emoji: "🎖️",
      },
      consistency_king: {
        icon: Crown,
        color: "#FFD700",
        gradient: ["#FFD700", "#00D4FF"],
        emoji: "👑",
      },
    };
    return configs[type] || configs.first_completion;
  };

  const config = getAchievementConfig(achievement.type);
  const Icon = config.icon;
  const { width, height } = Dimensions.get("window");

  return (
    <View style={{ flex: 1, backgroundColor: "#0A0F1C" }}>
      <ConfettiCannon
        ref={confettiRef}
        count={150}
        origin={{ x: width / 2, y: 0 }}
        autoStart={false}
        fadeOut
        explosionSpeed={350}
        fallSpeed={2500}
      />

      <SafeAreaView edges={["top", "bottom"]} style={{ flex: 1 }}>
        <View className="flex-1 items-center justify-center px-8">
          {/* Animated Badge */}
          <Animated.View
            style={{
              transform: [{ scale: scaleAnim }],
              marginBottom: 32,
            }}
          >
            <LinearGradient
              colors={config.gradient as [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                width: 160,
                height: 160,
                borderRadius: 80,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: config.color,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              <Icon size={80} color="#FFF" strokeWidth={2.5} />
            </LinearGradient>
          </Animated.View>

          {/* Achievement Text */}
          <Animated.View style={{ opacity: fadeAnim, alignItems: "center" }}>
            <Text className="text-6xl mb-4">{config.emoji}</Text>
            <Text className="text-4xl font-bold text-white text-center mb-4">
              {achievement.title}
            </Text>
            <Text className="text-xl text-white/60 text-center mb-8 px-4">
              {achievement.description}
            </Text>

            {/* Identity Statement */}
            <View className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8">
              <Text className="text-white text-center text-lg leading-relaxed">
                {getIdentityStatement(achievement.type)}
              </Text>
            </View>
          </Animated.View>

          {/* Identity Statement */}
          <Animated.View style={{ opacity: fadeAnim }}>
            <View className="bg-white/5 rounded-2xl p-6 mb-8">
              <Text className="text-center text-white/60 text-sm mb-2 tracking-wider">YOUR NEW IDENTITY</Text>
              <Text className="text-center text-white text-lg leading-relaxed">
                {identityStatement}
              </Text>
            </View>
          </Animated.View>

          {/* Continue Button */}
          <Animated.View style={{ opacity: fadeAnim, width: "100%" }}>
            {/* Share Button */}
            <TouchableOpacity
              onPress={handleShare}
              activeOpacity={0.8}
              style={{ marginBottom: 16 }}
            >
              <View
                style={{
                  borderRadius: 16,
                  padding: 18,
                  alignItems: "center",
                  backgroundColor: "rgba(255, 255, 255, 0.1)",
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.2)",
                  flexDirection: "row",
                  justifyContent: "center",
                }}
              >
                <Share2 size={20} color="#FFF" style={{ marginRight: 8 }} />
                <Text className="text-white font-semibold text-lg">Share Achievement</Text>
              </View>
            </TouchableOpacity>

            {/* Continue Button */}
            <TouchableOpacity
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.goBack();
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={config.gradient as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  borderRadius: 16,
                  padding: 20,
                  alignItems: "center",
                }}
              >
                <Text className="text-white font-bold text-xl">Continue</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function getIdentityStatement(type: AchievementType): string {
  const statements = {
    first_completion: "You're someone who takes action. This is just the beginning.",
    "7_day_streak": "You're building consistency. One week strong.",
    "30_day_streak": "This is who you are now. You're someone who shows up every day.",
    "90_day_streak": "You're legendary. 90 days of unstoppable momentum.",
    morning_stack_complete: "You're someone who starts the day with intention and power.",
    focus_master: "You're someone who protects their focus and does deep work.",
    consistency_king: "You're the definition of consistency. You never miss.",
  };
  return statements[type] || "You're becoming the person you want to be.";
}
