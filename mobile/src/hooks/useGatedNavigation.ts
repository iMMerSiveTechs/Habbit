import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/types";
import { useAppStore } from "@/state/appStore";
import {
  type SubscriptionTier,
  meetsMinimumTier,
} from "@/constants/pricing";
import * as Haptics from "expo-haptics";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Hook that provides gated navigation - if the user's tier is below
 * the required tier, they get sent to the Upgrade screen instead.
 */
export function useGatedNavigation() {
  const navigation = useNavigation<Nav>();
  const subscriptionTier = useAppStore((s) => s.subscriptionTier);

  const navigateGated = <T extends keyof RootStackParamList>(
    screen: T,
    params: RootStackParamList[T],
    requiredTier: "core" | "pro" | "elite",
    featureName: string,
  ) => {
    if (meetsMinimumTier(subscriptionTier, requiredTier)) {
      // User has access - navigate normally
      (navigation.navigate as Function)(screen, params);
    } else {
      // User needs upgrade
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      navigation.navigate("Upgrade", { requiredTier, featureName });
    }
  };

  return { navigateGated, navigation };
}
