import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface FocusSession {
  id: string;
  startTime: string;
  endTime: string | null;
  duration: number | null;
  task: string;
  completed: boolean;
  interrupted: boolean;
}

interface FocusState {
  activeSession: FocusSession | null;
  timer: number;
  targetDuration: number;
  isRunning: boolean;
  task: string;
  _hasHydrated: boolean;
  setActiveSession: (session: FocusSession | null) => void;
  setTimer: (seconds: number) => void;
  setTargetDuration: (seconds: number) => void;
  setIsRunning: (running: boolean) => void;
  setTask: (task: string) => void;
  incrementTimer: () => void;
  resetTimer: () => void;
  reset: () => void;
}

export const useFocusStore = create<FocusState>()(
  persist(
    (set) => ({
      activeSession: null,
      timer: 0,
      targetDuration: 25 * 60,
      isRunning: false,
      task: "",
      _hasHydrated: false,
      setActiveSession: (session) => set({ activeSession: session }),
      setTimer: (seconds) => set({ timer: seconds }),
      setTargetDuration: (seconds) => set({ targetDuration: seconds }),
      setIsRunning: (running) => set({ isRunning: running }),
      setTask: (task) => set({ task }),
      incrementTimer: () => set((state) => {
        const newTimer = state.timer + 1;
        const reachedTarget = newTimer >= state.targetDuration;
        return {
          timer: newTimer,
          isRunning: reachedTarget ? false : state.isRunning,
        };
      }),
      resetTimer: () => set({ timer: 0, isRunning: false }),
      reset: () => set({ activeSession: null, timer: 0, targetDuration: 25 * 60, isRunning: false, task: "" }),
    }),
    {
      name: "focus-storage",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeSession: state.activeSession,
        timer: state.timer,
        targetDuration: state.targetDuration,
        task: state.task,
      }),
      onRehydrateStorage: () => () => {
        useFocusStore.setState({ _hasHydrated: true });
      },
    },
  ),
);
