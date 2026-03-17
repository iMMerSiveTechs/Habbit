import { create } from "zustand";

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
  timer: number; // seconds elapsed (counts UP)
  targetDuration: number; // target duration in seconds
  isRunning: boolean;
  task: string;
  setActiveSession: (session: FocusSession | null) => void;
  setTimer: (seconds: number) => void;
  setTargetDuration: (seconds: number) => void;
  setIsRunning: (running: boolean) => void;
  setTask: (task: string) => void;
  incrementTimer: () => void; // Changed from decrementTimer to incrementTimer
  resetTimer: () => void;
}

export const useFocusStore = create<FocusState>((set) => ({
  activeSession: null,
  timer: 0, // Start at 0 and count up
  targetDuration: 25 * 60, // 25 minutes default target
  isRunning: false,
  task: "",
  setActiveSession: (session) => set({ activeSession: session }),
  setTimer: (seconds) => set({ timer: seconds }),
  setTargetDuration: (seconds) => set({ targetDuration: seconds }),
  setIsRunning: (running) => set({ isRunning: running }),
  setTask: (task) => set({ task }),
  incrementTimer: () => set((state) => ({
    timer: state.timer + 1,
    // Auto-stop when target is reached (optional - you can remove this if you want it to keep counting)
    isRunning: state.timer + 1 >= state.targetDuration ? false : state.isRunning
  })),
  resetTimer: () => set({ timer: 0, isRunning: false }),
}));
