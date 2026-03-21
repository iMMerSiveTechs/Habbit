import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/types";
import { GlassCard } from "@/components/GlassCard";
import {
  Check,
  X,
  Crown,
  Sparkles,
  Zap,
  ChevronLeft,
  RotateCcw,
  Lock,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useSubscription } from "@/hooks/useSubscription";
import type { PurchasesPackage } from "react-native-purchases";
import {
  type SubscriptionTier,
  TIERS,
  meetsMinimumTier,
  PRIVACY_POLICY_URL,
  TERMS_OF_SERVICE_URL,
} from "@/constants/pricing";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type Props = NativeStackScreenProps<RootStackParamList, "Upgrade">;

const TIER_COLORS: Record<SubscriptionTier, { accent: string; bg: string; gradient: readonly [string, string] }> = {
  preview: {
    accent: "#6B7280",
    bg: "rgba(107,114,128,0.15)",
    gradient: ["#374151", "#1F2937"] as const,
  },
  core: {
    accent: "#00D4FF",
    bg: "rgba(0,212,255,0.12)",
    gradient: ["#0E7490", "#164E63"] as const,
  },
  pro: {
    accent: "#8B5CF6",
    bg: "rgba(139,92,246,0.12)",
    gradient: ["#7C3AED", "#5B21B6"] as const,
  },
  elite: {
    accent: "#F59E0B",
    bg: "rgba(245,158,11,0.12)",
    gradient: ["#D97706", "#92400E"] as const,
  },
};

const TIER_ICONS: Record<SubscriptionTier, React.ReactNode> = {
  preview: <Lock size={20} color="#6B7280" />,
  core: <Zap size={20} color="#00D4FF" />,
  pro: <Sparkles size={20} color="#8B5CF6" />,
  elite: <Crown size={20} color="#F59E0B" />,
};

export default function UpgradeScreen({ navigation, route }: Props) {
  const requiredTier = route.params?.requiredTier ?? "core";
  const featureName = route.params?.featureName;

  const {
    tier: currentTier,
    packages,
    loading,
    purchasing,
    loadOfferings,
    purchase,
    restore,
  } = useSubscription();

  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>(requiredTier);

  useEffect(() => {
    loadOfferings();
  }, [loadOfferings]);

  const getPackageForTier = useCallback(
    (t: SubscriptionTier): PurchasesPackage | undefined => {
      const config = TIERS[t];
      if (!config.packageIdentifier) return undefined;
      return packages.find(
        (p) =>
          p.identifier === config.packageIdentifier ||
          p.product?.identifier === config.packageIdentifier ||
          p.product?.identifier === `${t}_monthly` ||
          p.product?.identifier?.includes(t)
      );
    },
    [packages],
  );

  const handlePurchase = async () => {
    const pkg = getPackageForTier(selectedTier);
    if (!pkg) {
      Alert.alert("Unavailable", "This package is not available right now.");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const success = await purchase(pkg);
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.goBack();
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        "Purchase Failed",
        "The purchase could not be completed. Please try again."
      );
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const success = await restore();
    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Restored", "Your purchases have been restored.");
      navigation.goBack();
    } else {
      Alert.alert("No Purchases", "No previous purchases found to restore.");
    }
  };

  const upgradeableTiers: SubscriptionTier[] = (
    ["core", "pro", "elite"] as const
  ).filter((t) => !meetsMinimumTier(currentTier, t));

  return (
    <View style={{ flex: 1, backgroundColor: "#050813" }}>
      <LinearGradient
        colors={["#050813", "#0A0F1C", "#0D1929"]}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
            {/* Header */}
          <View className="flex-row items-center px-5 pt-2 pb-4">
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.goBack();
              }}
              className="mr-4 p-2"
            >
              <ChevronLeft size={24} color="#fff" />
            </Pressable>
            <View className="flex-1">
              <Text className="text-white text-xl font-bold">Unlock Your Route</Text>
            </View>
            <Pressable
              onPress={handleRestore}
              className="flex-row items-center p-2"
            >
              <RotateCcw size={16} color="rgba(255,255,255,0.5)" />
              <Text className="text-white/50 text-sm ml-1.5">Restore</Text>
            </Pressable>
          </View>

          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: 140 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Section */}
            {featureName && (
              <Animated.View entering={FadeInDown.duration(400)} className="px-5 mb-6">
                <View
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: TIER_COLORS[requiredTier].bg }}
                >
                  <View className="flex-row items-center">
                    <Lock size={18} color={TIER_COLORS[requiredTier].accent} />
                    <Text
                      className="text-sm font-semibold ml-2"
                      style={{ color: TIER_COLORS[requiredTier].accent }}
                    >
                      {TIERS[requiredTier].displayName} route required
                    </Text>
                  </View>
                  <Text className="text-white text-lg font-bold mt-2">
                    Unlock {featureName}
                  </Text>
                  <Text className="text-white/60 text-sm mt-1">
                    This feature is part of your {TIERS[requiredTier].displayName} route.
                  </Text>
                </View>
              </Animated.View>
            )}

            {!featureName && (
              <Animated.View entering={FadeInDown.duration(400)} className="px-5 mb-6">
                <Text className="text-white text-2xl font-bold text-center">
                  Choose Your Route
                </Text>
                <Text className="text-white/50 text-center mt-2 text-base">
                  Every great destination needs a plan.
                </Text>
              </Animated.View>
            )}

            {/* Protocol Routes preview */}
            <Animated.View entering={FadeInDown.delay(100).duration(400)} className="px-5 mb-6">
              <View className="rounded-2xl overflow-hidden" style={{ borderWidth: 1, borderColor: "rgba(139,92,246,0.3)" }}>
                <LinearGradient colors={["rgba(139,92,246,0.15)", "rgba(0,0,0,0.3)"]} style={{ padding: 16 }}>
                  <View className="flex-row items-center mb-3">
                    <Sparkles size={16} color="#8B5CF6" />
                    <Text className="text-[#8B5CF6] text-xs font-bold tracking-widest ml-2">PRE-BUILT ROUTES</Text>
                  </View>
                  <Text className="text-white text-base font-bold mb-1">Done-for-you 30-day plans</Text>
                  <Text className="text-white/50 text-sm mb-4">Pick a destination. We map the route.</Text>
                  <View className="flex-row flex-wrap" style={{ gap: 8 }}>
                    {["🏃 Become Disciplined", "🧘 Master Focus", "💪 Build Strength", "📚 Daily Reader", "🌅 Morning Athlete", "💼 High Performer"].map((route) => (
                      <View key={route} className="rounded-full px-3 py-1.5" style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                        <Text className="text-white/70 text-xs">{route}</Text>
                      </View>
                    ))}
                  </View>
                  <Text className="text-white/30 text-xs mt-3">Included in Core, Pro & Elite routes</Text>
                </LinearGradient>
              </View>
            </Animated.View>

            {/* Tier Cards */}
            {upgradeableTiers.map((tierKey, index) => {
              const config = TIERS[tierKey];
              const colors = TIER_COLORS[tierKey];
              const isSelected = selectedTier === tierKey;
              const pkg = getPackageForTier(tierKey);
              const displayPrice = pkg?.product?.priceString ?? `$${config.price}`;

              return (
                <Animated.View
                  key={tierKey}
                  entering={FadeInUp.delay(index * 100).duration(400)}
                >
                  <Pressable
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedTier(tierKey);
                    }}
                    className="mx-5 mb-4"
                  >
                    <View
                      className="rounded-3xl overflow-hidden"
                      style={{
                        borderWidth: isSelected ? 2 : 1,
                        borderColor: isSelected
                          ? colors.accent
                          : "rgba(255,255,255,0.1)",
                      }}
                    >
                      <LinearGradient
                        colors={
                          isSelected
                            ? [colors.bg, "rgba(0,0,0,0.3)"]
                            : ["rgba(255,255,255,0.03)", "rgba(0,0,0,0.2)"]
                        }
                        style={{ padding: 20 }}
                      >
                        {/* Tier Header */}
                        <View className="flex-row items-center justify-between mb-3">
                          <View className="flex-row items-center">
                            {TIER_ICONS[tierKey]}
                            <Text
                              className="text-xl font-bold ml-2"
                              style={{
                                color: isSelected ? colors.accent : "#fff",
                              }}
                            >
                              {config.displayName}
                            </Text>
                          </View>
                          {tierKey === "pro" && (
                            <View
                              className="px-3 py-1 rounded-full"
                              style={{
                                backgroundColor: "rgba(139,92,246,0.25)",
                              }}
                            >
                              <Text className="text-[#8B5CF6] text-xs font-bold">
                                POPULAR
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Price */}
                        <View className="flex-row items-baseline mb-4">
                          <Text className="text-white text-3xl font-black">
                            {displayPrice}
                          </Text>
                          <Text className="text-white/40 text-sm ml-1">
                            /month
                          </Text>
                        </View>

                        {/* Tagline */}
                        <Text className="text-white/50 text-sm mb-4">
                          {config.tagline}
                        </Text>

                        {/* Features */}
                        {config.features.map((feature, i) => (
                          <View
                            key={i}
                            className="flex-row items-center mb-2.5"
                          >
                            <Check size={14} color={colors.accent} />
                            <Text className="text-white/80 text-sm ml-2.5">
                              {feature}
                            </Text>
                          </View>
                        ))}
                      </LinearGradient>
                    </View>
                  </Pressable>
                </Animated.View>
              );
            })}
          </ScrollView>

          {/* Bottom CTA */}
          <View
            className="absolute bottom-0 left-0 right-0 px-5 pb-10 pt-4"
            style={{
              backgroundColor: "rgba(5,8,19,0.95)",
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.08)",
            }}
          >
            <Pressable
              onPress={handlePurchase}
              disabled={purchasing || loading}
              className="active:scale-[0.97]"
            >
              <LinearGradient
                colors={TIER_COLORS[selectedTier].gradient as unknown as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 16,
                  borderRadius: 16,
                  alignItems: "center",
                }}
              >
                {purchasing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="text-white text-lg font-bold">
                    Unlock {TIERS[selectedTier].displayName} Route
                  </Text>
                )}
              </LinearGradient>
            </Pressable>
            <Text className="text-white/30 text-xs text-center mt-3">
              Cancel anytime. Subscription auto-renews monthly.
            </Text>
            <View className="flex-row justify-center mt-2 gap-4">
              <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
                <Text className="text-white/25 text-xs underline">Privacy Policy</Text>
              </Pressable>
              <Text className="text-white/20 text-xs">·</Text>
              <Pressable onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}>
                <Text className="text-white/25 text-xs underline">Terms of Service</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}
