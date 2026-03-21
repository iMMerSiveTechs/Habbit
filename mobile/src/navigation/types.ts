import type { BottomTabScreenProps as BottomTabScreenPropsBase } from "@react-navigation/bottom-tabs";
import { CompositeScreenProps, NavigatorScreenParams } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}

export type RootStackParamList = {
  Welcome: undefined;
  Pricing: undefined;
  Contract: { tier: "core" | "pro" | "elite" };
  ProfileSetup: undefined;
  LocationOnboarding: { fromOnboarding?: boolean } | undefined;
  Tabs: NavigatorScreenParams<BottomTabParamList> | undefined;
  LoginModalScreen: undefined;
  ForgotPassword: undefined;
  LocationReminder: undefined;
  MorningActivation: undefined;
  TodaysPlan: undefined;
  EditHabit: { habitId: string };
  PlanTomorrowScreen: undefined;
  HabitDetailScreen: { habitId: string };
  EveningReflection: undefined;
  AchievementCelebration: {
    achievement: {
      id: string;
      type: string;
      title: string;
      description: string;
      habitId?: string | null;
    };
  };
  WeeklyInsights: undefined;
  PatternInsights: undefined;
  CategoryAnalytics: undefined;
  AdvancedAnalytics: undefined;
  Marketplace: undefined;
  Vault: undefined;
  CerebraCoach: undefined;
  Upgrade: { requiredTier?: "core" | "pro" | "elite"; featureName?: string } | undefined;
  NotificationSettings: { fromOnboarding?: boolean } | undefined;
  Loading: undefined;
};

export type BottomTabParamList = {
  TodayTab: undefined;
  HabitsTab: undefined;
  TodosTab: undefined;
  CalendarTab: undefined;
  InsightsTab: undefined;
  SettingsTab: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type BottomTabScreenProps<Screen extends keyof BottomTabParamList> = CompositeScreenProps<
  BottomTabScreenPropsBase<BottomTabParamList, Screen>,
  NativeStackScreenProps<RootStackParamList>
>;
