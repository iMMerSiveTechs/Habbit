import { create } from "zustand";
import type { WorkSchedule, MorningRoutine, MorningBriefingResponse } from "@/shared/contracts";

interface ScheduleState {
  workSchedules: WorkSchedule[];
  morningRoutines: MorningRoutine[];
  morningBriefing: MorningBriefingResponse | null;
  isLoading: boolean;
  setWorkSchedules: (schedules: WorkSchedule[]) => void;
  addWorkSchedule: (schedule: WorkSchedule) => void;
  removeWorkSchedule: (id: string) => void;
  setMorningRoutines: (routines: MorningRoutine[]) => void;
  addMorningRoutine: (routine: MorningRoutine) => void;
  updateMorningRoutine: (id: string, updates: Partial<MorningRoutine>) => void;
  removeMorningRoutine: (id: string) => void;
  setMorningBriefing: (briefing: MorningBriefingResponse) => void;
  setLoading: (loading: boolean) => void;
}

export const useScheduleStore = create<ScheduleState>((set) => ({
  workSchedules: [],
  morningRoutines: [],
  morningBriefing: null,
  isLoading: false,

  setWorkSchedules: (schedules) => set({ workSchedules: schedules }),

  addWorkSchedule: (schedule) =>
    set((state) => ({
      workSchedules: [...state.workSchedules, schedule],
    })),

  removeWorkSchedule: (id) =>
    set((state) => ({
      workSchedules: state.workSchedules.filter((s) => s.id !== id),
    })),

  setMorningRoutines: (routines) => set({ morningRoutines: routines }),

  addMorningRoutine: (routine) =>
    set((state) => ({
      morningRoutines: [...state.morningRoutines, routine],
    })),

  updateMorningRoutine: (id, updates) =>
    set((state) => ({
      morningRoutines: state.morningRoutines.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      ),
    })),

  removeMorningRoutine: (id) =>
    set((state) => ({
      morningRoutines: state.morningRoutines.filter((r) => r.id !== id),
    })),

  setMorningBriefing: (briefing) => set({ morningBriefing: briefing }),

  setLoading: (loading) => set({ isLoading: loading }),
}));
