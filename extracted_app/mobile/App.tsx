import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer, LinkingOptions } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { queryClient } from "@/lib/queryClient";
import RootStackNavigator from "@/navigation/RootNavigator";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppState, AppStateStatus } from 'react-native';
import { useEffect, useState } from "react";
import { useSession } from "@/lib/useSession";
import { setUserId } from "@/lib/revenuecatClient";
import { useAppStore } from "@/state/appStore";
import { api } from "@/lib/api";
import { NotificationService } from "@/services/notificationService";
import { NotificationActionHandler, navigationRef } from "@/services/notificationActionHandler";
import { AdaptiveIntelligenceService } from "@/services/adaptiveIntelligence";
import { OfflineSyncBanner } from "@/components/OfflineSyncBanner";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import * as Linking from "expo-linking";

const prefix = Linking.createURL('/');

const linking: LinkingOptions<any> = {
  prefixes: ['habbit://', prefix],
  config: {
    screens: {
      Tabs: {
        screens: {
          TodayTab: 'today',
          HabitsTab: 'habits',
          TodosTab: 'todos',
          CalendarTab: 'calendar',
          InsightsTab: 'insights',
          SettingsTab: 'settings',
        },
      },
      HabitDetailScreen: 'habit/:id',
      EditHabit: 'habit/:id/edit',
      LoginModalScreen: 'login',
      ForgotPassword: 'forgot-password',
      MorningActivation: 'morning-activation',
      TodaysPlan: 'todays-plan',
      PlanTomorrowScreen: 'plan-tomorrow',
      EveningReflection: 'evening-reflection',
      AchievementCelebration: 'achievement',
      WeeklyInsights: 'weekly-insights',
      PatternInsights: 'pattern-insights',
      CategoryAnalytics: 'category-analytics',
      AdvancedAnalytics: 'advanced-analytics',
      Marketplace: 'marketplace',
      Vault: 'vault',
      CerebraCoach: 'coach',
      Upgrade: 'upgrade',
      NotificationSettings: 'notification-settings',
      Welcome: 'welcome',
      Pricing: 'pricing',
      Contract: 'contract',
      ProfileSetup: 'profile-setup',
      LocationOnboarding: 'location-onboarding',
      LocationReminder: 'location-reminder',
    },
  },
};

// v1.0.1 - Cache cleared
export default function App() {
  const [isReady, setIsReady] = useState(false);
  const { data: session, isPending: isSessionLoading } = useSession();
  const onboardingStage = useAppStore((s) => s.onboardingStage);

  // Initialize notification service and adaptive intelligence
  useEffect(() => {
    NotificationService.configure();
    NotificationActionHandler.initialize();

    // Adaptive intelligence is initialized after onboarding (see RootNavigator)
    // Do NOT initialize at boot to avoid battery/review risk

    // Cleanup on unmount
    return () => {
      NotificationActionHandler.cleanup();
    };
  }, []);

  useEffect(() => {
    if (!isSessionLoading) {
      // Ensure session is persisted even after hot reloads
      if (session) {
        console.log("Session recovered from storage:", session.user.email);
      }
      setIsReady(true);
    }
  }, [isSessionLoading, session]);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // Run audit when app comes to foreground
        api.post('/api/habits/audit', {}).catch(() => {
          console.log('Audit skipped (not authenticated)');
        });
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, []);

  // Link RevenueCat identity to auth user
  useEffect(() => {
    if (session?.user?.id) {
      setUserId(session.user.id).catch(() => {
        // RevenueCat not configured or failed — silent
      });
    }
  }, [session?.user?.id]);

  // Initialize adaptive intelligence only after onboarding is complete
  useEffect(() => {
    if (onboardingStage === "done") {
      AdaptiveIntelligenceService.initialize().catch(() => {
        // Non-blocking
      });
    }
  }, [onboardingStage]);

  if (!isReady) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <KeyboardProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
              <NavigationContainer ref={navigationRef} linking={linking}>
                <RootStackNavigator />
                <OfflineSyncBanner />
                <StatusBar style="light" />
              </NavigationContainer>
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </KeyboardProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
