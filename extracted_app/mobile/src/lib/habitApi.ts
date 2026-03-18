import { api as authApi } from "./api";
import type {
  Habit,
  HabitEvent,
  FocusSession,
  Achievement,
  CerebraQueryResponse,
  DailyBriefing,
  UserGoal,
  DailyIntention,
  DailyReflection,
  IdentityStatement,
  LocationReminder,
  LocationSuggestion,
  GetEmotionalDashboardResponse,
} from "@/shared/contracts";

interface Geofence {
  id: string;
  profileId: number;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  radius: number;
  linkedHabits: string[];
  linkedTodos: string[];
  onEnter: string | null;
  onExit: string | null;
  weatherConditions: string[];
  createdAt: string;
  updatedAt: string;
}

interface LocationVisit {
  id: string;
  geofenceId: string;
  arrivedAt: string | null;
  departedAt: string | null;
  moodBefore: number | null;
  moodAfter: number | null;
  productivity: number | null;
  createdAt: string;
}

interface LocationPattern {
  geofenceId: string;
  name: string;
  visitCount: number;
  avgDuration: number | null;
  avgMood: number | null;
  avgProductivity: number | null;
  mostCommonDay: string | null;
  mostCommonTime: string | null;
}

interface MoodMapEntry {
  geofenceId: string;
  name: string;
  latitude: number;
  longitude: number;
  avgMood: number;
  visitCount: number;
}

export const api = {
  // Habits
  async getHabits() {
    return authApi.get<{ habits: Habit[] }>("/api/habits");
  },

  async getHabit(habitId: string) {
    return authApi.get<{ habit: Habit }>(`/api/habits/${habitId}`);
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
    return authApi.post<{ habit: Habit }>("/api/habits", data);
  },

  async completeHabit(habitId: string, mood?: number, note?: string) {
    const today = new Date().toISOString().split("T")[0];
    const clientEventId = `complete-${habitId}-${today}`;
    return authApi.post<{ habit: Habit; event: HabitEvent; streak: number }>(`/api/habits/${habitId}/complete`, { mood, note, clientEventId });
  },

  async getHabitStreak(habitId: string) {
    return authApi.get<{ currentStreak: number; longestStreak: number; completions: HabitEvent[] }>(`/api/habits/${habitId}/streak`);
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
    return authApi.patch<{ habit: Habit }>(`/api/habits/${habitId}`, data);
  },

  async deleteHabit(habitId: string) {
    return authApi.delete<{ success: boolean }>(`/api/habits/${habitId}`);
  },

  async skipHabit(habitId: string, reason?: string) {
    return authApi.post<{ success: boolean; habitId: string; skippedAt: string }>(
      `/api/habits/${habitId}/skip`,
      { reason }
    );
  },

  // Focus Sessions
  async getActiveSession() {
    return authApi.get<{ session: FocusSession | null }>("/api/focus/active");
  },

  async startFocusSession(task: string) {
    return authApi.post<{ session: FocusSession }>("/api/focus/start", { task });
  },

  async endFocusSession(id: string, completed: boolean) {
    return authApi.post<{ session: FocusSession }>("/api/focus/end", { id, completed });
  },

  async getRecentSessions() {
    return authApi.get<{ sessions: FocusSession[] }>("/api/focus/recent");
  },

  // Cerebra
  async queryCerebra(query: string, context?: Record<string, unknown>) {
    return authApi.post<CerebraQueryResponse>("/api/cerebra/query", { query, context });
  },

  async getDailyBriefing() {
    return authApi.get<DailyBriefing>("/api/cerebra/briefing");
  },

  // Location
  async getGeofences() {
    return authApi.get<{ geofences: Geofence[] }>("/api/location/geofences");
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
    return authApi.post<{ geofence: Geofence }>("/api/location/geofences", data);
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
    return authApi.patch<{ geofence: Geofence }>(`/api/location/geofences/${geofenceId}`, data);
  },

  async recordLocationVisit(data: {
    geofenceId: string;
    arrivedAt?: string;
    departedAt?: string;
    moodBefore?: number;
    moodAfter?: number;
    productivity?: number;
  }) {
    return authApi.post<{ visit: LocationVisit }>("/api/location/visits", data);
  },

  async getLocationPatterns() {
    return authApi.get<{ patterns: LocationPattern[] }>("/api/location/patterns");
  },

  async getMoodMap() {
    return authApi.get<{ moodMap: MoodMapEntry[] }>("/api/location/mood-map");
  },

  // Location Reminders
  async getLocationReminders() {
    return authApi.get<{ reminders: LocationReminder[] }>("/api/location/reminders");
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
    return authApi.post<{ reminder: LocationReminder }>("/api/location/reminders", data);
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
    return authApi.patch<{ reminder: LocationReminder }>(`/api/location/reminders/${reminderId}`, data);
  },

  async deleteLocationReminder(reminderId: string) {
    return authApi.delete<{ success: boolean }>(`/api/location/reminders/${reminderId}`);
  },

  // Location Suggestions
  async getLocationSuggestions() {
    return authApi.get<{ suggestions: LocationSuggestion[] }>("/api/location/suggestions");
  },

  async dismissLocationSuggestion(suggestionId: string) {
    return authApi.post<{ success: boolean }>(`/api/location/suggestions/${suggestionId}/dismiss`);
  },

  async acceptLocationSuggestion(suggestionId: string, data?: {
    name?: string;
    category?: string;
    radius?: number;
  }) {
    return authApi.post<{ geofence: Geofence }>(`/api/location/suggestions/${suggestionId}/accept`, data);
  },

  async generateLocationSuggestions() {
    return authApi.post<{ suggestions: LocationSuggestion[] }>("/api/location/suggestions/generate");
  },

  // Emotional Core - User Goal
  async getUserGoal() {
    return authApi.get<{ goal: UserGoal | null }>("/api/emotional/goal");
  },

  async createUserGoal(data: {
    purpose: string;
    identity?: string;
    bigWhy: string;
  }) {
    return authApi.post<{ goal: UserGoal }>("/api/emotional/goal", data);
  },

  // Emotional Core - Daily Intentions
  async getTodayIntention() {
    return authApi.get<{ intention: DailyIntention | null }>("/api/emotional/intentions/today");
  },

  async createDailyIntention(data: {
    morningFeeling: "energized" | "good" | "tired" | "struggling";
    oneBigWin: string;
    date?: string;
  }) {
    return authApi.post<{ intention: DailyIntention }>("/api/emotional/intentions", data);
  },

  async completeIntention(intentionId: string) {
    return authApi.patch<{ intention: DailyIntention }>(`/api/emotional/intentions/${intentionId}/complete`);
  },

  // Emotional Core - Daily Reflections
  async getTodayReflection() {
    return authApi.get<{ reflection: DailyReflection | null }>("/api/reflections/daily/today");
  },

  async getRecentReflections() {
    return authApi.get<{ reflections: DailyReflection[] }>("/api/reflections/daily/history");
  },

  async createDailyReflection(data: {
    dayRating: "amazing" | "good" | "okay" | "rough";
    oneWin: string;
    oneLearning?: string;
    gratitude?: string;
    date?: string;
  }) {
    return authApi.post<{ reflection: DailyReflection }>("/api/reflections/daily", data);
  },

  // Emotional Core - Achievements
  async getAchievements() {
    return authApi.get<{ achievements: Achievement[] }>("/api/emotional/achievements");
  },

  async getUncelebratedAchievement() {
    return authApi.get<{ achievement: Achievement | null }>("/api/emotional/achievements/uncelebrated");
  },

  async markAchievementCelebrated(achievementId: string) {
    return authApi.patch<{ achievement: Achievement }>(`/api/emotional/achievements/${achievementId}/celebrate`, { celebrated: true });
  },

  async createAchievement(data: {
    type: string;
    title: string;
    description: string;
    habitId?: string | null;
  }) {
    return authApi.post<{ achievement: Achievement }>("/api/emotional/achievements/create", data);
  },

  // Emotional Core - Identity Statements
  async getIdentityStatements() {
    return authApi.get<{ statements: IdentityStatement[] }>("/api/emotional/identity");
  },

  // Emotional Core - Dashboard
  async getEmotionalDashboard() {
    return authApi.get<GetEmotionalDashboardResponse>("/api/emotional/dashboard");
  },
};
