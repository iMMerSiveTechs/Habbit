import { View, Text, Pressable } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/types";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useState, useEffect } from "react";
import { useAppStore } from "@/state/appStore";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

const IDENTITY_CHIPS = ["Disciplined", "Focused", "Consistent"];

const TAGLINES = [
  "Become who you're meant to be.",
  "Your goals. Your route. Your identity.",
  "Google Maps for your future self.",
];

const STATS = [
  { value: "30-day", label: "ROUTE MAP" },
  { value: "AI", label: "COACH" },
  { value: "Identity", label: "FIRST" },
];

export default function WelcomeScreen({ navigation }: Props) {
  const [taglineIndex, setTaglineIndex] = useState(0);
  const setOnboardingStage = useAppStore((s) => s.setOnboardingStage);

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglineIndex((i) => (i + 1) % TAGLINES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <LinearGradient
      colors={["#050813", "#0A0F1C", "#0D1929"]}
      style={{ flex: 1 }}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {/* Atmospheric glow orbs */}
      <View
        style={{
          position: "absolute",
          top: -60,
          right: -60,
          width: 200,
          height: 200,
          borderRadius: 9999,
          backgroundColor: "#8B5CF6",
          opacity: 0.07,
        }}
      />
      <View
        style={{
          position: "absolute",
          bottom: -40,
          left: -60,
          width: 200,
          height: 200,
          borderRadius: 9999,
          backgroundColor: "#00D4FF",
          opacity: 0.06,
        }}
      />

      <View className="flex-1 px-8" style={{ justifyContent: "space-between", paddingTop: 120, paddingBottom: 48 }}>

        {/* Top section — identity chips */}
        <View className="flex-row gap-2 items-center justify-center">
          {IDENTITY_CHIPS.map((chip) => (
            <View
              key={chip}
              style={{
                backgroundColor: "rgba(255,255,255,0.08)",
                borderColor: "rgba(255,255,255,0.15)",
                borderWidth: 1,
                borderRadius: 9999,
                paddingHorizontal: 12,
                paddingVertical: 4,
              }}
            >
              <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{chip}</Text>
            </View>
          ))}
        </View>

        {/* Middle hero */}
        <View className="items-center">
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 64,
              fontWeight: "900",
              letterSpacing: -2,
              textAlign: "center",
            }}
          >
            Habit
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.70)",
              fontSize: 18,
              textAlign: "center",
              marginTop: 16,
              lineHeight: 28,
              paddingHorizontal: 32,
            }}
          >
            {TAGLINES[taglineIndex]}
          </Text>
        </View>

        {/* Social proof strip */}
        <View className="flex-row justify-between items-center px-6">
          {STATS.map((stat, index) => (
            <View key={index} className="items-center">
              <Text style={{ color: "#00D4FF", fontSize: 18, fontWeight: "900" }}>
                {stat.value}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.30)",
                  fontSize: 9,
                  letterSpacing: 2,
                  marginTop: 2,
                  textTransform: "uppercase",
                }}
              >
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* CTA section */}
        <View className="items-center gap-4">
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setOnboardingStage("pricing");
              navigation.navigate("Pricing");
            }}
            className="w-full active:scale-95"
          >
            <LinearGradient
              colors={["#0E7490", "#0A4A6E"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: "center",
              }}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 18, fontWeight: "700" }}>
                Build My Future Self →
              </Text>
            </LinearGradient>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate("LoginModalScreen");
            }}
            className="active:scale-95"
          >
            <Text className="text-cyan text-sm font-medium">
              Already have an account? Sign In
            </Text>
          </Pressable>
        </View>

      </View>
    </LinearGradient>
  );
}
