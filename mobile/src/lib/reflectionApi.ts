import { api } from "./api";

// ============================================================
// DAILY REFLECTIONS
// ============================================================

export const reflectionApi = {
  // Get today's daily reflection
  async getDailyReflectionToday() {
    return api.get<any>("/api/reflections/daily/today");
  },

  // Submit or update daily reflection
  async submitDailyReflection(data: {
    dayRating: string;
    oneWin: string;
    oneLearning?: string;
    gratitude?: string;
    habitsCompleted?: number;
    focusMinutes?: number;
  }) {
    return api.post<any>("/api/reflections/daily", data);
  },

  // Get daily reflections history
  async getDailyReflectionsHistory(days: number = 30) {
    return api.get<any>(`/api/reflections/daily/history?days=${days}`);
  },

  // ============================================================
  // WEEKLY REFLECTIONS
  // ============================================================

  // Get current week's reflection
  async getWeeklyReflectionCurrent() {
    return api.get<any>("/api/reflections/weekly/current");
  },

  // Submit or update weekly reflection
  async submitWeeklyReflection(data: {
    weekStartDate: string;
    overallRating: string;
    biggestWin: string;
    keyLearning?: string;
    areasToImprove?: string;
    nextWeekFocus?: string;
    habitsConsistency?: number;
    focusHoursLogged?: number;
  }) {
    return api.post<any>("/api/reflections/weekly", data);
  },

  // Get weekly reflections history
  async getWeeklyReflectionsHistory(weeks: number = 12) {
    return api.get<any>(`/api/reflections/weekly/history?weeks=${weeks}`);
  },

  // ============================================================
  // MONTHLY REFLECTIONS
  // ============================================================

  // Get current month's reflection
  async getMonthlyReflectionCurrent() {
    return api.get<any>("/api/reflections/monthly/current");
  },

  // Submit or update monthly reflection
  async submitMonthlyReflection(data: {
    year: number;
    month: number;
    overallRating: string;
    biggestAccomplishment: string;
    keyLessonsLearned?: string;
    areasForGrowth?: string;
    nextMonthPriorities?: string;
  }) {
    return api.post<any>("/api/reflections/monthly", data);
  },

  // Get monthly reflections history
  async getMonthlyReflectionsHistory(months: number = 12) {
    return api.get<any>(`/api/reflections/monthly/history?months=${months}`);
  },

  // ============================================================
  // REFLECTION SETTINGS
  // ============================================================

  // Get reflection settings
  async getReflectionSettings() {
    return api.get<any>("/api/reflections/settings");
  },

  // Update reflection settings
  async updateReflectionSettings(data: {
    dailyReflectionEnabled?: boolean;
    dailyReflectionTime?: string;
    dailyMissedReminderTime?: string;
    weeklyReflectionEnabled?: boolean;
    weeklyReflectionDay?: number;
    weeklyReflectionTime?: string;
    monthlyReflectionEnabled?: boolean;
    monthlyReflectionDay?: number;
    monthlyReflectionTime?: string;
    notificationsEnabled?: boolean;
    tonePref?: "encouraging" | "direct" | "gentle";
    showInsights?: boolean;
  }) {
    return api.post<any>("/api/reflections/settings", data);
  },
};
