import { StyleSheet, View, Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Home, ListTodo, TrendingUp, Settings, CheckSquare, Calendar } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";

import type { BottomTabParamList, RootStackParamList } from "@/navigation/types";
import WelcomeScreen from "@/screens/WelcomeScreen";
import PricingScreen from "@/screens/PricingScreen";
import ContractScreen from "@/screens/ContractScreen";
import ProfileSetupScreen from "@/screens/ProfileSetupScreen";
import LocationOnboardingScreen from "@/screens/LocationOnboardingScreen";
import TodayScreenConnected from "@/screens/TodayScreenConnected";
import HabitsScreenConnected from "@/screens/HabitsScreenConnected";
import TodosScreen from "@/screens/TodosScreen";
import InsightsScreenConnected from "@/screens/InsightsScreenConnected";
import SettingsScreen from "@/screens/SettingsScreen";
import LoginModalScreen from "@/screens/LoginModalScreen";
import ForgotPasswordScreen from "@/screens/ForgotPasswordScreen";
import LocationReminderScreen from "@/screens/LocationReminderScreen";
import MorningActivationScreen from "@/screens/MorningActivationScreen";
import TodaysPlanScreen from "@/screens/TodaysPlanScreen";
import PlanTomorrowScreen from "@/screens/PlanTomorrowScreen";
import HabitDetailScreen from "@/screens/HabitDetailScreen";
import EveningReflectionScreen from "@/screens/EveningReflectionScreen";
import AchievementCelebrationScreen from "@/screens/AchievementCelebrationScreen";
import WeeklyInsightsScreen from "@/screens/WeeklyInsightsScreen";
import PatternInsightsScreen from "@/screens/PatternInsightsScreen";
import CategoryAnalyticsScreen from "@/screens/CategoryAnalyticsScreen";
import AdvancedAnalyticsScreen from "@/screens/AdvancedAnalyticsScreen";
import { CalendarScreen } from "@/screens/CalendarScreen";
import MarketplaceScreen from "@/screens/MarketplaceScreen";
import VaultScreen from "@/screens/VaultScreen";
import CerebraCoachScreen from "@/screens/CerebraCoachScreen";
import UpgradeScreen from "@/screens/UpgradeScreen";
import NotificationSettingsScreen from "@/screens/NotificationSettingsScreen";
import EditHabitScreen from "@/screens/EditHabitScreen";
import { useAppStore } from "@/state/appStore";
import { useSession } from "@/lib/useSession";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { api } from "@/lib/habitApi";
import { authEvents, resetSessionExpiredFlag } from "@/lib/api";

const RootStack = createNativeStackNavigator<RootStackParamList>();

const LoadingScreen = () => (
  <View style={{ flex: 1, backgroundColor: "#050813", alignItems: "center", justifyContent: "center" }}>
    <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 16 }}>Loading...</Text>
  </View>
);

const RootNavigator = () => {
  const onboardingStage = useAppStore((state) => state.onboardingStage);
  const pendingGoal = useAppStore((s) => s.pendingGoal);
  const setPendingGoal = useAppStore((s) => s.setPendingGoal);
  const { data: session, isPending: isSessionLoading, refetch: refetchSession } = useSession();

  // Force redirect to Welcome when session expires mid-session
  const [sessionExpired, setSessionExpired] = useState(false);
  useEffect(() => {
    const handler = () => {
      setSessionExpired(true);
      refetchSession();
    };
    authEvents.on("sessionExpired", handler);
    return () => { authEvents.off("sessionExpired", handler); };
  }, [refetchSession]);

  // Reset sessionExpired flag once user has a valid session again
  useEffect(() => {
    if (session) {
      setSessionExpired(false);
      resetSessionExpiredFlag();
    }
  }, [session]);

  // Sync pending goal to the server once the user is authenticated
  const hasSyncedGoal = useRef(false);
  useEffect(() => {
    if (session && pendingGoal && !hasSyncedGoal.current) {
      hasSyncedGoal.current = true;
      api.createUserGoal(pendingGoal)
        .then(() => setPendingGoal(null))
        .catch(() => { hasSyncedGoal.current = false; });
    }
  }, [session, pendingGoal]);

  // Determine initial route based on auth and onboarding status
  const getInitialRoute = (): keyof RootStackParamList => {
    if (isSessionLoading) {
      return "Loading";
    }

    if (!session || sessionExpired) {
      return "Welcome";
    }

    // Authenticated: route based on onboarding stage
    switch (onboardingStage) {
      case "done":
        return "Tabs";
      case "profile":
        return "ProfileSetup";
      case "notifications":
        return "NotificationSettings";
      case "location":
        return "LocationOnboarding";
      case "pricing":
        return "Pricing";
      case "welcome":
      default:
        return "Welcome";
    }
  };

  // No auto-advancement: respect the persisted onboarding stage

  // Key causes navigator to remount when session or onboarding stage changes
  const navKey = `nav-${Boolean(session) && !sessionExpired}-${onboardingStage ?? "none"}`;

  return (
    <RootStack.Navigator
      key={navKey}
      initialRouteName={getInitialRoute()}
    >
      <RootStack.Screen
        name="Loading"
        component={LoadingScreen}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="Welcome"
        component={WelcomeScreen}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="Pricing"
        component={PricingScreen}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="Contract"
        component={ContractScreen}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="ProfileSetup"
        component={ProfileSetupScreen}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="LocationOnboarding"
        component={LocationOnboardingScreen}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="Tabs"
        component={BottomTabNavigator}
        options={{ headerShown: false }}
      />
      <RootStack.Screen
        name="LoginModalScreen"
        options={{ presentation: "modal", title: "Sign In", headerShown: false }}
      >{(props) => <ErrorBoundary><LoginModalScreen {...props} /></ErrorBoundary>}</RootStack.Screen>
      <RootStack.Screen
        name="ForgotPassword"
        options={{ presentation: "modal", title: "Reset Password", headerShown: false }}
      >{(props) => <ErrorBoundary><ForgotPasswordScreen {...props} /></ErrorBoundary>}</RootStack.Screen>
      <RootStack.Screen
        name="LocationReminder"
        options={{ headerShown: false }}
      >{(props) => <ErrorBoundary><LocationReminderScreen {...props} /></ErrorBoundary>}</RootStack.Screen>
      <RootStack.Screen
        name="MorningActivation"
        options={{
          headerShown: false,
          presentation: "modal"
        }}
      >{(props) => <ErrorBoundary><MorningActivationScreen {...props} /></ErrorBoundary>}</RootStack.Screen>
      <RootStack.Screen
        name="TodaysPlan"
        options={{
          headerShown: false
        }}
      >{(props) => <ErrorBoundary><TodaysPlanScreen {...props} /></ErrorBoundary>}</RootStack.Screen>
      <RootStack.Screen
        name="PlanTomorrowScreen"
        options={{
          headerShown: false
        }}
      >{(props) => <ErrorBoundary><PlanTomorrowScreen {...props} /></ErrorBoundary>}</RootStack.Screen>
      <RootStack.Screen
        name="HabitDetailScreen"
        options={{
          headerShown: false
        }}
      >{(props) => <ErrorBoundary><HabitDetailScreen {...props} /></ErrorBoundary>}</RootStack.Screen>
      <RootStack.Screen
        name="EveningReflection"
        options={{
          headerShown: false,
          presentation: "modal"
        }}
      >{(props) => <ErrorBoundary><EveningReflectionScreen {...props} /></ErrorBoundary>}</RootStack.Screen>
      <RootStack.Screen
        name="AchievementCelebration"
        options={{
          headerShown: false,
          presentation: "modal"
        }}
      >{(props) => <ErrorBoundary><AchievementCelebrationScreen {...props} /></ErrorBoundary>}</RootStack.Screen>
      <RootStack.Screen
        name="WeeklyInsights"
        options={{
          headerShown: false
        }}
      >{(props) => <ErrorBoundary><WeeklyInsightsScreen {...props} /></ErrorBoundary>}</RootStack.Screen>
      <RootStack.Screen
        name="PatternInsights"
        options={{
          headerShown: false
        }}
      >{(props) => <ErrorBoundary><PatternInsightsScreen {...props} /></ErrorBoundary>}</RootStack.Screen>
      <RootStack.Screen
        name="CategoryAnalytics"
        options={{
          headerShown: false
        }}
      >{(props) => <ErrorBoundary><CategoryAnalyticsScreen {...props} /></ErrorBoundary>}</RootStack.Screen>
      <RootStack.Screen
        name="AdvancedAnalytics"
        options={{
          headerShown: false
        }}
      >{(props) => <ErrorBoundary><AdvancedAnalyticsScreen {...props} /></ErrorBoundary>}</RootStack.Screen>
      <RootStack.Screen
        name="Marketplace"
        options={{
          headerShown: false
        }}
      >{(props) => <ErrorBoundary><MarketplaceScreen {...props} /></ErrorBoundary>}</RootStack.Screen>
      <RootStack.Screen
        name="Vault"
        options={{
          headerShown: false
        }}
      >{(props) => <ErrorBoundary><VaultScreen {...props} /></ErrorBoundary>}</RootStack.Screen>
      <RootStack.Screen
        name="CerebraCoach"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      >{(props) => <ErrorBoundary><CerebraCoachScreen {...props} /></ErrorBoundary>}</RootStack.Screen>
      <RootStack.Screen
        name="Upgrade"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      >{(props) => <ErrorBoundary><UpgradeScreen {...props} /></ErrorBoundary>}</RootStack.Screen>
      <RootStack.Screen
        name="NotificationSettings"
        options={{ headerShown: false }}
      >{(props) => <ErrorBoundary><NotificationSettingsScreen {...props} /></ErrorBoundary>}</RootStack.Screen>
      <RootStack.Screen
        name="EditHabit"
        options={{ headerShown: false }}
      >{(props) => <ErrorBoundary><EditHabitScreen {...props} /></ErrorBoundary>}</RootStack.Screen>
    </RootStack.Navigator>
  );
};

const BottomTab = createBottomTabNavigator<BottomTabParamList>();
const BottomTabNavigator = () => {
  return (
    <BottomTab.Navigator
      initialRouteName="TodayTab"
      screenOptions={{
        tabBarStyle: {
          position: "absolute",
          backgroundColor: "rgba(10, 15, 28, 0.95)",
          borderTopWidth: 1,
          borderTopColor: "rgba(255, 255, 255, 0.1)",
        },
        tabBarActiveTintColor: "#00D4FF",
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.4)",
        headerShown: false,
      }}
      screenListeners={() => ({
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        },
      })}
    >
      <BottomTab.Screen
        name="TodayTab"
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      >
        {(props) => (
          <ErrorBoundary>
            <TodayScreenConnected {...props} />
          </ErrorBoundary>
        )}
      </BottomTab.Screen>
      <BottomTab.Screen
        name="HabitsTab"
        options={{
          title: "Habits",
          tabBarIcon: ({ color, size }) => <ListTodo size={size} color={color} />,
        }}
      >
        {(props) => (
          <ErrorBoundary>
            <HabitsScreenConnected {...props} />
          </ErrorBoundary>
        )}
      </BottomTab.Screen>
      <BottomTab.Screen
        name="TodosTab"
        options={{
          title: "Todos",
          tabBarIcon: ({ color, size }) => <CheckSquare size={size} color={color} />,
        }}
      >
        {() => (
          <ErrorBoundary>
            <TodosScreen />
          </ErrorBoundary>
        )}
      </BottomTab.Screen>
      <BottomTab.Screen
        name="CalendarTab"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
        }}
      >
        {() => (
          <ErrorBoundary>
            <CalendarScreen />
          </ErrorBoundary>
        )}
      </BottomTab.Screen>
      <BottomTab.Screen
        name="InsightsTab"
        options={{
          title: "Insights",
          tabBarIcon: ({ color, size }) => <TrendingUp size={size} color={color} />,
        }}
      >
        {(props) => (
          <ErrorBoundary>
            <InsightsScreenConnected {...props} />
          </ErrorBoundary>
        )}
      </BottomTab.Screen>
      <BottomTab.Screen
        name="SettingsTab"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
        }}
      >
        {(props) => (
          <ErrorBoundary>
            <SettingsScreen {...props} />
          </ErrorBoundary>
        )}
      </BottomTab.Screen>
    </BottomTab.Navigator>
  );
};

export default RootNavigator;
