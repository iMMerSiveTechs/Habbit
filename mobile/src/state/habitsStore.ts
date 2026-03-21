import { create } from "zustand";

export interface HabitWithStats {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  color: string;
  category?: string;
  frequency: string;
  targetCount: number;
  order: number;
  archived: boolean;
  recurringType?: string | null;
  recurringInterval?: number | null;
  recurringDays?: string | null;
  reminderTime?: string | null;
  reminderEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  completedToday: boolean;
  todayCount: number;
  streak?: number;
  currentStreak?: number;
  habitType?: 'standard' | 'protocol' | 'core';
  protocolTarget?: number | null;
  protocolWindowDays?: number | null;
  protocolStartDate?: string | null;
  protocolStatus?: string | null;
  bestStreak?: number;
  completionHistory?: string | null; // JSON string of dates
  todayLogQuality?: string | null; // "verified" | "partial" | "skipped" | null
}

interface HabitsState {
  habits: HabitWithStats[];
  loading: boolean;
  error: string | null;
  setHabits: (habits: HabitWithStats[]) => void;
  addHabit: (habit: HabitWithStats) => void;
  updateHabit: (id: string, updates: Partial<HabitWithStats>) => void;
  removeHabit: (id: string) => void;
  completeHabit: (id: string) => void;
  logHabit: (id: string, quality: string, date: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useHabitsStore = create<HabitsState>((set) => ({
  habits: [],
  loading: false,
  error: null,
  setHabits: (habits) => set({ habits, error: null }),
  addHabit: (habit) => set((state) => ({ habits: [...state.habits, habit] })),
  updateHabit: (id, updates) =>
    set((state) => ({
      habits: state.habits.map((h) => (h.id === id ? { ...h, ...updates } : h)),
    })),
  removeHabit: (id) =>
    set((state) => ({
      habits: state.habits.filter((h) => h.id !== id),
    })),
  completeHabit: (id) =>
    set((state) => ({
      habits: state.habits.map((h) =>
        h.id === id
          ? {
              ...h,
              completedToday: true,
              todayCount: h.todayCount + 1,
            }
          : h
      ),
    })),
  logHabit: (id, quality, _date) =>
    set((state) => ({
      habits: state.habits.map((h) =>
        h.id === id
          ? {
              ...h,
              todayLogQuality: quality,
              completedToday: quality === 'verified' || quality === 'partial',
              todayCount: quality === 'verified' ? h.todayCount + 1 : h.todayCount,
            }
          : h
      ),
    })),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));
