import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, Alert, Linking } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/types";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "@/components/GlassCard";
import { Check, RotateCcw } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useSubscription } from "@/hooks/useSubscription";
import type { PurchasesPackage } from "react-native-purchases";
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "@/constants/pricing";

type Props = NativeStackScreenProps<RootStackParamList, "Pricing">;

const TIER_META: Record<"core" | "pro" | "elite", {
  name: string;
  tagline: string;
  fallbackPrice: string;
  rcIdentifier: string; // $rc_monthly package inside each offering
  offeringId: string;
  features: string[];
  recommended?: boolean;
}> = {
  core: {
    name: "Core",
    tagline: "Unlock your full route",
    fallbackPrice: "$8.99/mo",
    rcIdentifier: "$rc_monthly",
    offeringId: "core",
    features: [
      "Unlimited habits & todos",
      "Protocol routes (30-day plans)",
      "Focus timer & deep work tracking",
      "Calendar & progress views",
      "Data export",
    ],
  },
  pro: {
    name: "Pro",
    tagline: "Your AI accountability partner",
    fallbackPrice: "$13.99/mo",
    rcIdentifier: "$rc_custom_pro_monthly",
    offeringId: "pro",
    recommended: true,
    features: [
      "Everything in Core",
      "Cerebra AI Coach (Claude-powered)",
      "Location intelligence",
      "Advanced analytics & patterns",
      "Smart adaptive notifications",
      "Morning & evening reflection AI",
    ],
  },
  elite: {
    name: "Elite",
    tagline: "Total cognitive optimization",
    fallbackPrice: "$21.99/mo",
    rcIdentifier: "$rc_custom_elite_monthly",
    offeringId: "elite",
    features: [
      "Everything in Pro",
      "Predictive intelligence engine",
      "Custom voice profiles",
      "Priority AI (faster, longer context)",
      "Unlimited conversation history",
    ],
  },
};

export default function PricingScreen({ navigation }: Props) {
  const [selectedTier, setSelectedTier] = useState<"core" | "pro" | "elite">("pro");
  const { packages, loading, purchasing, loadOfferings, purchase, restore, isRevenueCatEnabled } = useSubscription();

  useEffect(() => {
    if (isRevenueCatEnabled) {
      loadOfferings();
    }
  }, [isRevenueCatEnabled]);

  // Find package for a given tier — matches by RC package lookup_key OR product identifier
  const getPackageForTier = (tier: "core" | "pro" | "elite"): PurchasesPackage | undefined => {
    const rcIdentifier = TIER_META[tier].rcIdentifier;
    return packages.find(
      (pkg) =>
        pkg.identifier === rcIdentifier ||
        pkg.product?.identifier === rcIdentifier ||
        pkg.product?.identifier === `${tier}_monthly` ||
        pkg.product?.identifier?.includes(tier)
    );
  };

  const getPriceString = (tier: "core" | "pro" | "elite"): string => {
    const pkg = getPackageForTier(tier);
    return pkg?.product?.priceString ?? TIER_META[tier].fallbackPrice;
  };

  const handleContinue = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isRevenueCatEnabled) {
      const pkg = getPackageForTier(selectedTier);
      if (pkg) {
        const success = await purchase(pkg);
        if (!success) return; // purchase cancelled or failed
      }
    }

    // Navigate to Contract for legal acceptance
    navigation.navigate("Contract", { tier: selectedTier });
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const success = await restore();
    if (success) {
      Alert.alert("Restored", "Your purchases have been restored.", [
        { text: "Continue", onPress: () => navigation.navigate("Contract", { tier: selectedTier }) },
      ]);
    } else {
      Alert.alert("No Purchases Found", "No previous purchases found for this account.");
    }
  };

  return (
    <LinearGradient colors={["#050813", "#0A0F1C", "#0D1929"]} style={{ flex: 1 }}>
      <ScrollView className="flex-1 px-5 pt-16" contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="mb-8">
          <Text className="text-white text-3xl font-bold text-center mb-2">Choose Your Route</Text>
          <Text className="text-white/50 text-base text-center leading-relaxed">
            Early-adopter pricing — locked in for 12 months.
          </Text>
        </View>

        {loading && isRevenueCatEnabled && (
          <View className="items-center py-4">
            <ActivityIndicator color="#00D4FF" />
            <Text className="text-white/40 text-sm mt-2">Loading prices...</Text>
          </View>
        )}

        {(["core", "pro", "elite"] as const).map((tierId) => {
          const meta = TIER_META[tierId];
          const isSelected = selectedTier === tierId;
          return (
            <Pressable
              key={tierId}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedTier(tierId);
              }}
              className="mb-4 active:scale-[0.98]"
            >
              <GlassCard
                style={{
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? "#00D4FF" : "rgba(255,255,255,0.1)",
                  padding: 20,
                }}
              >
                {meta.recommended && (
                  <View className="absolute top-3 right-3 bg-[#8B5CF6] px-3 py-1 rounded-full">
                    <Text className="text-white text-xs font-bold">POPULAR</Text>
                  </View>
                )}

                <Text className="text-white text-xl font-bold mb-0.5">{meta.name}</Text>
                <Text className="text-white/50 text-sm mb-3">{meta.tagline}</Text>

                <View
                  className="self-start mb-4"
                  style={{
                    backgroundColor: "rgba(0,212,255,0.12)",
                    borderWidth: 1,
                    borderColor: "rgba(0,212,255,0.3)",
                    borderRadius: 9999,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                  }}
                >
                  <Text style={{ color: "#00D4FF", fontSize: 10, fontWeight: "700" }}>
                    FOUNDER RATE — LOCKED 12 MONTHS
                  </Text>
                </View>

                <View className="flex-row items-baseline mb-4">
                  <Text className="text-white text-3xl font-black">{getPriceString(tierId)}</Text>
                </View>

                {meta.features.map((feature, index) => (
                  <View key={index} className="flex-row items-center mb-2">
                    <Check size={14} color="#00D4FF" />
                    <Text className="text-white/75 text-sm ml-2.5">{feature}</Text>
                  </View>
                ))}
              </GlassCard>
            </Pressable>
          );
        })}

        <Pressable onPress={handleRestore} className="items-center py-3 active:opacity-60">
          <View className="flex-row items-center gap-2">
            <RotateCcw size={14} color="rgba(255,255,255,0.4)" />
            <Text className="text-white/40 text-sm">Restore Purchases</Text>
          </View>
        </Pressable>

        <View className="mt-2 mb-4 px-2">
          <Text className="text-white/30 text-xs text-center leading-relaxed">
            Cancel anytime from Settings. Subscription renews monthly until cancelled.{"\n"}
            Managed by the App Store.
          </Text>
          <View className="flex-row justify-center mt-3 gap-4">
            <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
              <Text className="text-white/30 text-xs underline">Privacy Policy</Text>
            </Pressable>
            <Text className="text-white/20 text-xs">·</Text>
            <Pressable onPress={() => Linking.openURL(TERMS_OF_SERVICE_URL)}>
              <Text className="text-white/30 text-xs underline">Terms of Service</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      <View
        className="absolute bottom-0 left-0 right-0 p-5"
        style={{
          backgroundColor: "rgba(5,8,19,0.95)",
          borderTopWidth: 1,
          borderTopColor: "rgba(255,255,255,0.08)",
        }}
      >
        <Pressable
          onPress={handleContinue}
          disabled={purchasing}
          className="rounded-2xl py-4 items-center active:scale-[0.97]"
          style={{ backgroundColor: purchasing ? "rgba(0,212,255,0.5)" : "#00D4FF" }}
        >
          {purchasing ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={{ color: "#000", fontSize: 18, fontWeight: "700" }}>
              {isRevenueCatEnabled
                ? `Unlock ${TIER_META[selectedTier].name} Route →`
                : `Continue with ${TIER_META[selectedTier].name} →`}
            </Text>
          )}
        </Pressable>
      </View>
    </LinearGradient>
  );
}
