import { ScrollView, View, Text, Pressable } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "@/navigation/types";
import { LinearGradient } from "expo-linear-gradient";
import { GlassCard } from "@/components/GlassCard";
import { useAppStore } from "@/state/appStore";
import * as Haptics from "expo-haptics";

type Props = NativeStackScreenProps<RootStackParamList, "Contract">;

export default function ContractScreen({ navigation, route }: Props) {
  const { tier } = route.params;
  const setOnboardingStage = useAppStore((s) => s.setOnboardingStage);

  const handleAccept = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setOnboardingStage("profile");
    navigation.navigate("ProfileSetup");
  };

  return (
    <LinearGradient colors={["#050813", "#0A0F1C", "#0D1929"]} style={{ flex: 1 }}>
      <View className="flex-1 px-5 pt-16 pb-32">
        <GlassCard className="flex-1 p-6">
          <Text className="text-white text-2xl font-bold text-center mb-6">Subscription Agreement</Text>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <Text className="text-white text-base font-bold mb-4">Welcome to Habit — your investment in rhythm and focus.</Text>

            <Text className="text-white/70 text-sm leading-6 mb-4">By continuing, you acknowledge and agree to the following:</Text>

            <View className="mb-4">
              <Text className="text-white font-semibold mb-2">1. Billing:</Text>
              <Text className="text-white/70 text-sm leading-6">
                Your chosen plan will begin immediately after any trial period and renew automatically until cancelled.
              </Text>
            </View>

            <View className="mb-4">
              <Text className="text-white font-semibold mb-2">2. Grandfather Guarantee:</Text>
              <Text className="text-white/70 text-sm leading-6">
                Your introductory rate remains locked for 12 months if you maintain continuous subscription status. Lapsed accounts forfeit the discount.
              </Text>
            </View>

            <View className="mb-4">
              <Text className="text-white font-semibold mb-2">3. Trial Policy:</Text>
              <Text className="text-white/70 text-sm leading-6">
                Trials convert to active plans unless cancelled 24 hours before expiration.
              </Text>
            </View>

            <View className="mb-4">
              <Text className="text-white font-semibold mb-2">4. Data Integrity:</Text>
              <Text className="text-white/70 text-sm leading-6">
                Habit securely stores your data using encrypted services. You retain ownership and can export at any time.
              </Text>
            </View>

            <View className="mb-4">
              <Text className="text-white font-semibold mb-2">5. Privacy:</Text>
              <Text className="text-white/70 text-sm leading-6">
                Your AI interactions are private and used only to enhance your experience.
              </Text>
            </View>

            <View className="mb-4">
              <Text className="text-white font-semibold mb-2">6. Cancellation:</Text>
              <Text className="text-white/70 text-sm leading-6">
                You may cancel any time from Settings → Subscription; access continues until the end of the billing cycle.
              </Text>
            </View>

            <Text className="text-white/70 text-sm leading-6 mt-4">
              By continuing, you agree to these terms and authorize Habit to manage your subscription under Apple App Store / Google Play billing policies.
            </Text>
          </ScrollView>
        </GlassCard>
      </View>

      <View className="absolute bottom-0 left-0 right-0 p-5 bg-obsidian-dark/90 border-t border-white/10">
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => navigation.goBack()}
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-4 items-center active:scale-95"
          >
            <Text className="text-white/70 font-semibold">Back</Text>
          </Pressable>
          <Pressable onPress={handleAccept} className="flex-[2] bg-neon-cyan/20 border border-neon-cyan/40 rounded-2xl py-4 items-center active:scale-95">
            <Text className="text-white font-semibold">Accept and Continue</Text>
          </Pressable>
        </View>
      </View>
    </LinearGradient>
  );
}
