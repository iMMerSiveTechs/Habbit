import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

type OnboardingStage = "welcome" | "pricing" | "profile" | "notifications" | "location" | "done";

interface PendingGoal {
  purpose: string;
  identity?: string;
  bigWhy: string;
}

interface AppState {
  hasCompletedOnboarding: boolean;
  onboardingStage: OnboardingStage;
  subscriptionTier: "preview" | "core" | "pro" | "elite";
  userName: string | null;
  themeMode: "ice" | "prime";
  integrity: number;
  xp: number;
  pendingGoal: PendingGoal | null;
  setHasCompletedOnboarding: (completed: boolean) => void;
  setOnboardingStage: (stage: OnboardingStage) => void;
  /** Internal-only: must only be called from RevenueCat resolution, never from UI screens */
  _setSubscriptionTierFromRC: (tier: "preview" | "core" | "pro" | "elite") => void;
  setUserName: (name: string) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  setThemeMode: (mode: "ice" | "prime") => void;
  setIntegrity: (integrity: number) => void;
  setXp: (xp: number) => void;
  setPendingGoal: (goal: PendingGoal | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      hasCompletedOnboarding: false,
      onboardingStage: "welcome",
      subscriptionTier: "preview",
      userName: null,
      themeMode: "ice",
      integrity: 100,
      xp: 0,
      pendingGoal: null,
      setHasCompletedOnboarding: (completed) => set({ hasCompletedOnboarding: completed }),
      setOnboardingStage: (stage) => set({ onboardingStage: stage }),
      _setSubscriptionTierFromRC: (tier: "preview" | "core" | "pro" | "elite") => set({ subscriptionTier: tier }),
      setUserName: (name) => set({ userName: name }),
      completeOnboarding: () => set({ hasCompletedOnboarding: true, onboardingStage: "done" }),
      resetOnboarding: () => set({ hasCompletedOnboarding: false, onboardingStage: "welcome" }),
      setThemeMode: (mode) => set({ themeMode: mode }),
      setIntegrity: (integrity) => set({ integrity }),
      setXp: (xp) => set({ xp }),
      setPendingGoal: (goal) => set({ pendingGoal: goal }),
      reset: () => set({
        hasCompletedOnboarding: false,
        onboardingStage: "welcome",
        subscriptionTier: "preview",
        userName: null,
        themeMode: "ice",
        integrity: 100,
        xp: 0,
        pendingGoal: null,
      }),
    }),
    {
      name: "app-storage",
      storage: createJSONStorage(() => AsyncStorage),
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        const state = persistedState as Record<string, unknown>;
        if (version === 0) {
          // Migrate from version 0: add onboardingStage based on hasCompletedOnboarding
          if (state.hasCompletedOnboarding === true) {
            state.onboardingStage = "done";
          } else if (!state.onboardingStage) {
            state.onboardingStage = "welcome";
          }
          // Remove old autoLoginEnabled field
          delete state.autoLoginEnabled;
        }
        if (version === 1) {
          // No structural changes, just acknowledge new "pricing" stage
          if (!state.onboardingStage) {
            state.onboardingStage = "welcome";
          }
        }
        return state as unknown as AppState;
      },
    },
  ),
);
