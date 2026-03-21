import { api as authApi } from "./api";

export const api = {
  // Habits
  async getHabits() {
    return authApi.get<any>("/api/habits");
  },

  async getHabit(habitId: string) {
    return authApi.get<any>(`/api/habits/${habitId}`);
  },

  async createHabit(data: {
    title: string;
    description?: string;
    icon?: string;
    color?: string;
    frequency?: string;
    targetCount?: number;
    recurringType?: string;
    recurringInterval?: number;
    recurringDays?: number[];
    reminderTime?: string;
    reminderEnabled?: boolean;
  }) {
    return authApi.post<any>("/api/habits", data);
  },

  async completeHabit(habitId: string, mood?: number, note?: string) {
    const today = new Date().toISOString().split("T")[0];
    const clientEventId = `complete-${habitId}-${today}`;
    return authApi.post<any>(`/api/habits/${habitId}/complete`, { mood, note, clientEventId });
  },

  async getHabitStreak(habitId: string) {
    return authApi.get<{ currentStreak: number; longestStreak: number; completions: any[] }>(`/api/habits/${habitId}/streak`);
  },

  async updateHabit(habitId: string, data: {
    title?: string;
    description?: string;
    icon?: string;
    color?: string;
    frequency?: string;
    targetCount?: number;
    reminderEnabled?: boolean;
    recurringType?: string;
    recurringInterval?: number;
    recurringDays?: number[];
    reminderTime?: string;
  }) {
    return authApi.patch<any>(`/api/habits/${habitId}`, data);
  },

  async deleteHabit(habitId: string) {
    return authApi.delete<any>(`/api/habits/${habitId}`);
  },

  async skipHabit(habitId: string, reason?: string) {
    return authApi.post<{ success: boolean; habitId: string; skippedAt: string }>(
      `/api/habits/${habitId}/skip`,
      { reason }
    );
  },

  // Focus Sessions
  async getActiveSession() {
    return authApi.get<any>("/api/focus/active");
  },

  async startFocusSession(task: string) {
    return authApi.post<any>("/api/focus/start", { task });
  },

  async endFocusSession(id: string, completed: boolean) {
    return authApi.post<any>("/api/focus/end", { id, completed });
  },

  async getRecentSessions() {
    return authApi.get<any>("/api/focus/recent");
  },

  // Cerebra
  async queryCerebra(query: string, context?: any) {
    return authApi.post<any>("/api/cerebra/query", { query, context });
  },

  async getDailyBriefing() {
    return authApi.get<any>("/api/cerebra/briefing");
  },

  // Location
  async getGeofences() {
    return authApi.get<{ geofences: any[] }>("/api/location/geofences");
  },

  async createGeofence(data: {
    name: string;
    category: string;
    latitude: number;
    longitude: number;
    radius?: number;
    linkedHabits?: string[];
    linkedTodos?: string[];
    onEnter?: string;
    onExit?: string;
    weatherConditions?: string[];
  }) {
    return authApi.post<{ geofence: any }>("/api/location/geofences", data);
  },

  async deleteGeofence(geofenceId: string) {
    return authApi.delete<{ success: boolean }>(`/api/location/geofences/${geofenceId}`);
  },

  async updateGeofence(geofenceId: string, data: {
    name?: string;
    category?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    linkedHabits?: string[];
    linkedTodos?: string[];
    onEnter?: string;
    onExit?: string;
    weatherConditions?: string[];
  }) {
    return authApi.patch<{ geofence: any }>(`/api/location/geofences/${geofenceId}`, data);
  },

  async recordLocationVisit(data: {
    geofenceId: string;
    arrivedAt?: string;
    departedAt?: string;
    moodBefore?: number;
    moodAfter?: number;
    productivity?: number;
  }) {
    return authApi.post<{ visit: any }>("/api/location/visits", data);
  },

  async getLocationPatterns() {
    return authApi.get<{ patterns: any[] }>("/api/location/patterns");
  },

  async getMoodMap() {
    return authApi.get<{ moodMap: any }>("/api/location/mood-map");
  },

  // Location Reminders
  async getLocationReminders() {
    return authApi.get<{ reminders: any[] }>("/api/location/reminders");
  },

  async createLocationReminder(data: {
    geofenceId?: string;
    title: string;
    message: string;
    triggerType: "on_enter" | "on_exit" | "on_stay" | "nearby";
    stayDuration?: number;
    repeatType?: "always" | "once" | "daily" | "weekdays";
    linkedHabitId?: string;
    linkedTodoId?: string;
    priority?: "low" | "medium" | "high";
  }) {
    return authApi.post<{ reminder: any }>("/api/location/reminders", data);
  },

  async updateLocationReminder(reminderId: string, data: {
    title?: string;
    message?: string;
    triggerType?: "on_enter" | "on_exit" | "on_stay" | "nearby";
    stayDuration?: number;
    isActive?: boolean;
    repeatType?: "always" | "once" | "daily" | "weekdays";
    linkedHabitId?: string;
    linkedTodoId?: string;
    priority?: "low" | "medium" | "high";
  }) {
    return authApi.patch<{ reminder: any }>(`/api/location/reminders/${reminderId}`, data);
  },

  async deleteLocationReminder(reminderId: string) {
    return authApi.delete<{ success: boolean }>(`/api/location/reminders/${reminderId}`);
  },

  // Location Suggestions
  async getLocationSuggestions() {
    return authApi.get<{ suggestions: any[] }>("/api/location/suggestions");
  },

  async dismissLocationSuggestion(suggestionId: string) {
    return authApi.post<{ success: boolean }>(`/api/location/suggestions/${suggestionId}/dismiss`);
  },

  async acceptLocationSuggestion(suggestionId: string, data?: {
    name?: string;
    category?: string;
    radius?: number;
  }) {
    return authApi.post<{ geofence: any }>(`/api/location/suggestions/${suggestionId}/accept`, data);
  },

  async generateLocationSuggestions() {
    return authApi.post<{ suggestions: any[] }>("/api/location/suggestions/generate");
  },

  // Emotional Core - User Goal
  async getUserGoal() {
    return authApi.get<any>("/api/emotional/goal");
  },

  async createUserGoal(data: {
    purpose: string;
    identity?: string;
    bigWhy: string;
  }) {
    return authApi.post<any>("/api/emotional/goal", data);
  },

  // Emotional Core - Daily Intentions
  async getTodayIntention() {
    return authApi.get<{ intention: any }>("/api/emotional/intentions/today");
  },

  async createDailyIntention(data: {
    morningFeeling: "energized" | "good" | "tired" | "struggling";
    oneBigWin: string;
    date?: string;
  }) {
    return authApi.post<{ intention: any }>("/api/emotional/intentions", data);
  },

  async completeIntention(intentionId: string) {
    return authApi.patch<{ intention: any }>(`/api/emotional/intentions/${intentionId}/complete`);
  },

  // Emotional Core - Daily Reflections
  async getTodayReflection() {
    return authApi.get<{ reflection: any }>("/api/reflections/daily/today");
  },

  async getRecentReflections() {
    return authApi.get<{ reflections: any[] }>("/api/reflections/daily/history");
  },

  async createDailyReflection(data: {
    dayRating: "amazing" | "good" | "okay" | "rough";
    oneWin: string;
    oneLearning?: string;
    gratitude?: string;
    date?: string;
  }) {
    return authApi.post<{ reflection: any }>("/api/reflections/daily", data);
  },

  // Emotional Core - Achievements
  async getAchievements() {
    return authApi.get<any>("/api/emotional/achievements");
  },

  async getUncelebratedAchievement() {
    return authApi.get<any>("/api/emotional/achievements/uncelebrated");
  },

  async markAchievementCelebrated(achievementId: string) {
    return authApi.patch<any>(`/api/emotional/achievements/${achievementId}/celebrate`, { celebrated: true });
  },

  async createAchievement(data: {
    type: string;
    title: string;
    description: string;
    habitId?: string | null;
  }) {
    return authApi.post<any>("/api/emotional/achievements/create", data);
  },

  // Emotional Core - Identity Statements
  async getIdentityStatements() {
    return authApi.get<any>("/api/emotional/identity");
  },

  // Emotional Core - Dashboard
  async getEmotionalDashboard() {
    return authApi.get<any>("/api/emotional/dashboard");
  },
};
