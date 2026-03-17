import { api } from "./api";
import type {
  WorkSchedule,
  CreateWorkScheduleRequest,
  MorningRoutine,
  CreateMorningRoutineRequest,
  CompleteMorningRoutineRequest,
  GetTravelTimeRequest,
  GetTravelTimeResponse,
  MorningBriefingResponse,
} from "@/shared/contracts";

export const scheduleApi = {
  // Work Schedules
  async getWorkSchedules(): Promise<{ schedules: WorkSchedule[] }> {
    return api.get<{ schedules: WorkSchedule[] }>("/api/schedule/work");
  },

  async createWorkSchedule(
    data: CreateWorkScheduleRequest
  ): Promise<{ schedule: WorkSchedule }> {
    return api.post<{ schedule: WorkSchedule }>("/api/schedule/work", data);
  },

  async deleteWorkSchedule(id: string): Promise<{ success: boolean }> {
    return api.delete<{ success: boolean }>(`/api/schedule/work/${id}`);
  },

  // Travel Time
  async getTravelTime(
    data: GetTravelTimeRequest
  ): Promise<GetTravelTimeResponse> {
    return api.post<GetTravelTimeResponse>("/api/schedule/travel-time", data);
  },

  // Morning Routines
  async getMorningRoutines(): Promise<{ routines: MorningRoutine[] }> {
    return api.get<{ routines: MorningRoutine[] }>("/api/schedule/routines");
  },

  async createMorningRoutine(
    data: CreateMorningRoutineRequest
  ): Promise<{ routine: MorningRoutine }> {
    return api.post<{ routine: MorningRoutine }>("/api/schedule/routines", data);
  },

  async completeMorningRoutine(
    id: string,
    data: CompleteMorningRoutineRequest
  ): Promise<{ completion: any }> {
    return api.post<{ completion: any }>(
      `/api/schedule/routines/${id}/complete`,
      data
    );
  },

  async deleteMorningRoutine(id: string): Promise<{ success: boolean }> {
    return api.delete<{ success: boolean }>(`/api/schedule/routines/${id}`);
  },

  // Morning Briefing
  async getMorningBriefing(): Promise<MorningBriefingResponse> {
    return api.get<MorningBriefingResponse>("/api/schedule/morning-briefing");
  },
};
