/**
 * Achievement Badges Component
 * Visual display of earned achievements and badges
 */

import { View, Text, ScrollView, Pressable } from "react-native";
import { GlassCard } from "./GlassCard";
import { LinearGradient } from "expo-linear-gradient";
import {
  Trophy,
  Target,
  Flame,
  Zap,
  Star,
  Crown,
  Award,
  TrendingUp,
  Calendar,
  Clock,
  Heart,
  Sparkles,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";

export interface Badge {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: "trophy" | "target" | "flame" | "zap" | "star" | "crown" | "award" | "trending" | "calendar" | "clock" | "heart" | "sparkles";
  color: string;
  rarity: "common" | "rare" | "epic" | "legendary";
  earnedAt: string;
  habitId?: string;
}

interface AchievementBadgesProps {
  badges: Badge[];
  onBadgeTap?: (badge: Badge) => void;
}

const BADGE_ICONS = {
  trophy: Trophy,
  target: Target,
  flame: Flame,
  zap: Zap,
  star: Star,
  crown: Crown,
  award: Award,
  trending: TrendingUp,
  calendar: Calendar,
  clock: Clock,
  heart: Heart,
  sparkles: Sparkles,
};

const RARITY_COLORS = {
  common: {
    bg: ["#6B7280", "#9CA3AF"],
    border: "#9CA3AF",
    text: "#D1D5DB",
    label: "Common",
  },
  rare: {
    bg: ["#3B82F6", "#60A5FA"],
    border: "#60A5FA",
    text: "#BFDBFE",
    label: "Rare",
  },
  epic: {
    bg: ["#8B5CF6", "#A78BFA"],
    border: "#A78BFA",
    text: "#DDD6FE",
    label: "Epic",
  },
  legendary: {
    bg: ["#F59E0B", "#FBBF24"],
    border: "#FBBF24",
    text: "#FEF3C7",
    label: "Legendary",
  },
};

export function AchievementBadges({ badges, onBadgeTap }: AchievementBadgesProps) {
  if (badges.length === 0) {
    return (
      <GlassCard className="p-8 items-center">
        <Trophy size={48} color="rgba(255,255,255,0.2)" />
        <Text className="text-white/60 text-center mt-4">
          No badges yet.{"\n"}Complete habits to earn achievements!
        </Text>
      </GlassCard>
    );
  }

  // Group badges by rarity
  const groupedBadges = badges.reduce((acc, badge) => {
    if (!acc[badge.rarity]) acc[badge.rarity] = [];
    acc[badge.rarity].push(badge);
    return acc;
  }, {} as Record<string, Badge[]>);

  // Sort by rarity (legendary first)
  const rarityOrder: Array<"legendary" | "epic" | "rare" | "common"> = ["legendary", "epic", "rare", "common"];

  return (
    <View>
      {/* Stats Overview */}
      <GlassCard className="p-5 mb-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-white text-xl font-bold">Your Achievements</Text>
          <View className="bg-gold/20 px-3 py-1 rounded-full">
            <Text className="text-gold text-sm font-bold">{badges.length} Earned</Text>
          </View>
        </View>

        {/* Rarity Breakdown */}
        <View className="flex-row flex-wrap gap-2">
          {rarityOrder.map((rarity) => {
            const count = groupedBadges[rarity]?.length || 0;
            const rarityData = RARITY_COLORS[rarity];
            return (
              <View
                key={rarity}
                className="bg-white/5 px-3 py-2 rounded-lg flex-row items-center"
              >
                <View
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: rarityData.border }}
                />
                <Text className="text-white/70 text-xs">
                  {rarityData.label}: <Text className="text-white font-semibold">{count}</Text>
                </Text>
              </View>
            );
          })}
        </View>
      </GlassCard>

      {/* Badges Grid */}
      {rarityOrder.map((rarity) => {
        const badgesForRarity = groupedBadges[rarity];
        if (!badgesForRarity || badgesForRarity.length === 0) return null;

        const rarityData = RARITY_COLORS[rarity];

        return (
          <View key={rarity} className="mb-4">
            <View className="flex-row items-center mb-3">
              <View
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: rarityData.border }}
              />
              <Text className="text-white text-lg font-bold">{rarityData.label}</Text>
              <Text className="text-white/60 text-sm ml-2">({badgesForRarity.length})</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 20 }}
            >
              {badgesForRarity.map((badge) => {
                const IconComponent = BADGE_ICONS[badge.icon];
                return (
                  <Pressable
                    key={badge.id}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onBadgeTap?.(badge);
                    }}
                    className="mr-3 active:scale-95"
                  >
                    <GlassCard
                      className="w-36 overflow-hidden"
                      style={{
                        borderColor: rarityData.border,
                        borderWidth: 2,
                      }}
                    >
                      {/* Gradient Background */}
                      <LinearGradient
                        colors={[rarityData.bg[0], rarityData.bg[1], "transparent"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          opacity: 0.3,
                        }}
                      />

                      {/* Content */}
                      <View className="p-4 items-center">
                        {/* Icon Circle */}
                        <View
                          className="w-16 h-16 rounded-full items-center justify-center mb-3"
                          style={{
                            backgroundColor: `${rarityData.border}40`,
                            borderWidth: 2,
                            borderColor: rarityData.border,
                          }}
                        >
                          <IconComponent size={28} color={rarityData.border} />
                        </View>

                        {/* Title */}
                        <Text
                          className="text-white text-sm font-bold text-center mb-1"
                          numberOfLines={2}
                        >
                          {badge.title}
                        </Text>

                        {/* Description */}
                        <Text
                          className="text-white/60 text-xs text-center"
                          numberOfLines={2}
                        >
                          {badge.description}
                        </Text>

                        {/* Date */}
                        <View className="mt-3 bg-white/10 px-2 py-1 rounded">
                          <Text className="text-white/50 text-[10px]">
                            {new Date(badge.earnedAt).toLocaleDateString()}
                          </Text>
                        </View>
                      </View>
                    </GlassCard>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        );
      })}
    </View>
  );
}

/**
 * Mini Badge Display - Compact version for showing recent badges
 */
export function MiniBadge({ badge }: { badge: Badge }) {
  const IconComponent = BADGE_ICONS[badge.icon];
  const rarityData = RARITY_COLORS[badge.rarity];

  return (
    <Pressable
      onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
      className="active:scale-95"
    >
      <View
        className="w-12 h-12 rounded-full items-center justify-center"
        style={{
          backgroundColor: `${rarityData.border}20`,
          borderWidth: 2,
          borderColor: rarityData.border,
        }}
      >
        <IconComponent size={20} color={rarityData.border} />
      </View>
    </Pressable>
  );
}
