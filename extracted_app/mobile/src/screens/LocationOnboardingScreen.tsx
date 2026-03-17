import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "@/components/GlassCard";
import { MapPin, Navigation, Brain, Check, AlertCircle } from "lucide-react-native";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { RootStackScreenProps } from "@/navigation/types";
import { useAppStore } from "@/state/appStore";

type Props = RootStackScreenProps<"LocationOnboarding">;

export default function LocationOnboardingScreen({ navigation, route }: Props) {
  const fromOnboarding = route.params?.fromOnboarding ?? false;
  const [isGranting, setIsGranting] = useState(false);
  const [granted, setGranted] = useState(false);
  const [denied, setDenied] = useState(false);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const finishOnboarding = () => {
    if (fromOnboarding) {
      completeOnboarding();
      navigation.reset({ index: 0, routes: [{ name: "Tabs", params: { screen: "TodayTab" } }] });
    } else {
      navigation.goBack();
    }
  };

  const handleEnableLocation = async () => {
    try {
      setIsGranting(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === "granted") {
        console.log("📍 Location permission granted");
        setGranted(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        setTimeout(() => {
          finishOnboarding();
        }, 800);
      } else {
        console.log("📍 Location permission denied");
        setDenied(true);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setIsGranting(false);
      }
    } catch (error) {
      console.log("Location permission error:", error);
      setIsGranting(false);
    }
  };

  const handleSkip = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    finishOnboarding();
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient colors={["#050813", "#0A0F1C", "#0D1929"]} style={{ flex: 1 }}>
        <View className="flex-1 justify-center px-6">
          <View className="items-center mb-12">
            <View className="w-32 h-32 rounded-full bg-neon-cyan/10 items-center justify-center mb-6">
              <MapPin size={64} color="#00D4FF" />
            </View>
            <Text className="text-white text-3xl font-bold text-center mb-3">
              Location-Based Habits
            </Text>
            <Text className="text-white/60 text-center text-base leading-6">
              Trigger habits automatically when you arrive at places like home, work, or the gym.
            </Text>
          </View>

          <View className="gap-3 mb-8">
            <GlassCard className="p-4 flex-row items-start">
              <View className="w-10 h-10 rounded-full bg-neon-cyan/20 items-center justify-center mr-4">
                <Navigation size={20} color="#00D4FF" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold mb-1">Location When in Use</Text>
                <Text className="text-white/60 text-sm">
                  We only read your location when the app is open to detect nearby habit zones.
                </Text>
              </View>
            </GlassCard>

            <GlassCard className="p-4 flex-row items-start">
              <View className="w-10 h-10 rounded-full bg-neon-magenta/20 items-center justify-center mr-4">
                <Brain size={20} color="#FF00E5" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold mb-1">Smart Reminders</Text>
                <Text className="text-white/60 text-sm">
                  Set up habit zones in Settings to get reminders when you arrive at key places.
                </Text>
              </View>
            </GlassCard>

            <GlassCard className="p-4 flex-row items-start">
              <View className="w-10 h-10 rounded-full bg-neon-violet/20 items-center justify-center mr-4">
                <MapPin size={20} color="#8B5CF6" />
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold mb-1">Privacy First</Text>
                <Text className="text-white/60 text-sm">
                  Location data never leaves your device and is never shared.
                </Text>
              </View>
            </GlassCard>
          </View>

          {denied && (
            <View className="flex-row items-center bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
              <AlertCircle size={18} color="#F59E0B" />
              <Text className="text-amber-400 text-sm ml-2 flex-1">
                Location denied. You can enable it later in your phone&apos;s Settings. Location features will be limited.
              </Text>
            </View>
          )}

          <Pressable
            onPress={granted || denied ? handleSkip : handleEnableLocation}
            disabled={isGranting && !denied}
            className="active:scale-95"
            style={styles.enableButton}
          >
            <LinearGradient
              colors={granted ? ["#10B981", "#059669"] : ["#00D4FF", "#0099CC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              {granted ? (
                <View className="flex-row items-center">
                  <Check size={24} color="#FFFFFF" />
                  <Text className="text-white font-bold text-lg ml-2">Location Enabled</Text>
                </View>
              ) : denied ? (
                <Text className="text-white font-bold text-lg">
                  {fromOnboarding ? "Continue Without Location" : "Done"}
                </Text>
              ) : (
                <Text className="text-white font-bold text-lg">
                  {isGranting ? "Requesting..." : "Enable Location"}
                </Text>
              )}
            </LinearGradient>
          </Pressable>

          {!granted && !denied && (
            <Pressable onPress={handleSkip} className="mt-4 py-4 items-center active:scale-95">
              <Text className="text-white/60 font-medium">Skip for now</Text>
            </Pressable>
          )}
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  enableButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  buttonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
