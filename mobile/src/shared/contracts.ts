// contracts.ts
// Shared API contracts (schemas and types) used by both the server and the app.
// Import in the app as: `import { type GetSampleResponse } from "@shared/contracts"`
// Import in the server as: `import { postSampleRequestSchema } from "@shared/contracts"`

import { z } from "zod";

// GET /api/sample
export const getSampleResponseSchema = z.object({
  message: z.string(),
});
export type GetSampleResponse = z.infer<typeof getSampleResponseSchema>;

// POST /api/sample
export const postSampleRequestSchema = z.object({
  value: z.string(),
});
export type PostSampleRequest = z.infer<typeof postSampleRequestSchema>;
export const postSampleResponseSchema = z.object({
  message: z.string(),
});
export type PostSampleResponse = z.infer<typeof postSampleResponseSchema>;

// POST /api/upload/image
export const uploadImageRequestSchema = z.object({
  image: z.instanceof(File),
});
export type UploadImageRequest = z.infer<typeof uploadImageRequestSchema>;
export const uploadImageResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  url: z.string(),
  filename: z.string(),
});
export type UploadImageResponse = z.infer<typeof uploadImageResponseSchema>;

// Recurring Schedule Type
export const recurringTypeSchema = z.enum(["daily", "hourly", "weekly", "custom", "weekdays", "weekends", "none"]);
export type RecurringType = z.infer<typeof recurringTypeSchema>;

// Habit Category Type
export const habitCategorySchema = z.enum(["health", "mind", "work", "growth", "fitness", "mindfulness", "social", "general"]);
export type HabitCategory = z.infer<typeof habitCategorySchema>;

// Habit Reminder Schemas
export const habitReminderSchema = z.object({
  id: z.string(),
  habitId: z.string(),
  reminderTime: z.string(), // HH:MM format
  recurringType: recurringTypeSchema,
  recurringInterval: z.number().nullable(),
  recurringDays: z.string().nullable(), // JSON string
  enabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type HabitReminder = z.infer<typeof habitReminderSchema>;

export const createHabitReminderSchema = z.object({
  reminderTime: z.string(), // HH:MM format
  recurringType: recurringTypeSchema.default("daily"),
  recurringInterval: z.number().optional(),
  recurringDays: z.array(z.number().min(0).max(6)).optional(),
  enabled: z.boolean().default(true),
});
export type CreateHabitReminder = z.infer<typeof createHabitReminderSchema>;

export const updateHabitReminderSchema = z.object({
  reminderTime: z.string().optional(),
  recurringType: recurringTypeSchema.optional(),
  recurringInterval: z.number().optional(),
  recurringDays: z.array(z.number().min(0).max(6)).optional(),
  enabled: z.boolean().optional(),
});
export type UpdateHabitReminder = z.infer<typeof updateHabitReminderSchema>;

// Habit Schemas
export const habitSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string(),
  category: habitCategorySchema.default("general"),
  frequency: z.string(),
  targetCount: z.number(),
  order: z.number(),
  archived: z.boolean(),
  recurringType: z.string().nullable(),
  recurringInterval: z.number().nullable(),
  recurringDays: z.string().nullable(),
  reminderTime: z.string().nullable(),
  reminderEnabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  // Runtime stats (computed fields)
  completedToday: z.boolean().optional(),
  todayCount: z.number().optional(),
  currentStreak: z.number().optional(),
  // Multiple reminders support
  reminders: z.array(habitReminderSchema).optional(),
});
export type Habit = z.infer<typeof habitSchema>;

export const createHabitRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().default("#00D4FF"),
  category: habitCategorySchema.default("general"),
  frequency: z.string().default("daily"),
  targetCount: z.number().default(1),
  recurringType: recurringTypeSchema.optional(),
  recurringInterval: z.number().optional(),
  recurringDays: z.array(z.number().min(0).max(6)).optional(),
  reminderTime: z.string().optional(),
  reminderEnabled: z.boolean().default(false),
  // Multiple reminders support
  reminders: z.array(createHabitReminderSchema).optional(),
});
export type CreateHabitRequest = z.infer<typeof createHabitRequestSchema>;

export const updateHabitRequestSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  category: habitCategorySchema.optional(),
  frequency: z.string().optional(),
  targetCount: z.number().optional(),
  order: z.number().optional(),
  archived: z.boolean().optional(),
  recurringType: recurringTypeSchema.optional(),
  recurringInterval: z.number().optional(),
  recurringDays: z.array(z.number().min(0).max(6)).optional(),
  reminderTime: z.string().optional(),
  reminderEnabled: z.boolean().optional(),
});
export type UpdateHabitRequest = z.infer<typeof updateHabitRequestSchema>;

// GET /api/habits
export const getHabitsResponseSchema = z.object({
  habits: z.array(habitSchema),
});
export type GetHabitsResponse = z.infer<typeof getHabitsResponseSchema>;

// POST /api/habits/:id/complete
export const completeHabitRequestSchema = z.object({
  note: z.string().optional(),
  mood: z.number().min(1).max(5).optional(),
});
export type CompleteHabitRequest = z.infer<typeof completeHabitRequestSchema>;

export const habitEventSchema = z.object({
  id: z.string(),
  habitId: z.string(),
  completedAt: z.string(),
  note: z.string().nullable(),
  mood: z.number().nullable(),
});
export type HabitEvent = z.infer<typeof habitEventSchema>;

// GET /api/habits/:id/events
export const getHabitEventsResponseSchema = z.object({
  events: z.array(habitEventSchema),
});
export type GetHabitEventsResponse = z.infer<typeof getHabitEventsResponseSchema>;

// Focus Session Schemas
export const focusSessionSchema = z.object({
  id: z.string(),
  startTime: z.string(),
  endTime: z.string().nullable(),
  duration: z.number().nullable(),
  task: z.string(),
  completed: z.boolean(),
  interrupted: z.boolean(),
});
export type FocusSession = z.infer<typeof focusSessionSchema>;

export const startFocusSessionRequestSchema = z.object({
  task: z.string().min(1),
});
export type StartFocusSessionRequest = z.infer<typeof startFocusSessionRequestSchema>;

export const endFocusSessionRequestSchema = z.object({
  id: z.string(),
  completed: z.boolean(),
});
export type EndFocusSessionRequest = z.infer<typeof endFocusSessionRequestSchema>;

// Reflection Schemas
export const reflectionSchema = z.object({
  id: z.string(),
  date: z.string(),
  prompt: z.string(),
  response: z.string(),
  mood: z.number().nullable(),
  energyLevel: z.number().nullable(),
  aiInsight: z.string().nullable(),
});
export type Reflection = z.infer<typeof reflectionSchema>;

export const createReflectionRequestSchema = z.object({
  prompt: z.string(),
  response: z.string(),
  mood: z.number().min(1).max(5).optional(),
  energyLevel: z.number().min(1).max(5).optional(),
});
export type CreateReflectionRequest = z.infer<typeof createReflectionRequestSchema>;

// Prediction Schemas
export const predictionSchema = z.object({
  id: z.string(),
  date: z.string(),
  predictedEnergy: z.string(), // JSON string
  actualMood: z.number().nullable(),
  accuracy: z.number().nullable(),
});
export type Prediction = z.infer<typeof predictionSchema>;

// Subscription Schemas
export const subscriptionTierSchema = z.enum(["preview", "core", "pro", "elite"]);
export type SubscriptionTier = z.infer<typeof subscriptionTierSchema>;

export const updateSubscriptionRequestSchema = z.object({
  tier: subscriptionTierSchema,
  grandfathered: z.boolean().optional(),
  trialEndsAt: z.string().optional(),
});
export type UpdateSubscriptionRequest = z.infer<typeof updateSubscriptionRequestSchema>;

export const getProfileResponseSchema = z.object({
  id: z.number(),
  handle: z.string(),
  subscriptionTier: subscriptionTierSchema,
  grandfathered: z.boolean(),
  trialEndsAt: z.string().nullable(),
  subscriptionEndsAt: z.string().nullable(),
});
export type GetProfileResponse = z.infer<typeof getProfileResponseSchema>;

// Cerebra Assistant Schemas
export const cerebraQueryRequestSchema = z.object({
  query: z.string().min(1),
  context: z.object({
    recentHabits: z.array(habitSchema).optional(),
    recentSessions: z.array(focusSessionSchema).optional(),
    mood: z.number().optional(),
  }).optional(),
});
export type CerebraQueryRequest = z.infer<typeof cerebraQueryRequestSchema>;

export const cerebraQueryResponseSchema = z.object({
  response: z.string(),
  suggestion: z.string().optional(),
  actionable: z.boolean(),
});
export type CerebraQueryResponse = z.infer<typeof cerebraQueryResponseSchema>;

// Todo Schemas
export const todoItemSchema = z.object({
  id: z.string(),
  todoId: z.string(),
  title: z.string(),
  completed: z.boolean(),
  order: z.number(),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
});
export type TodoItem = z.infer<typeof todoItemSchema>;

export const todoSchema = z.object({
  id: z.string(),
  profileId: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  completed: z.boolean(),
  archived: z.boolean(),
  priority: z.enum(["low", "medium", "high"]),
  dueDate: z.string().nullable(),
  linkedHabitId: z.string().nullable(),
  order: z.number(),
  recurringType: z.string().nullable(),
  recurringInterval: z.number().nullable(),
  recurringDays: z.string().nullable(),
  reminderTime: z.string().nullable(),
  reminderEnabled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedAt: z.string().nullable(),
  archivedAt: z.string().nullable(),
  items: z.array(todoItemSchema),
});
export type Todo = z.infer<typeof todoSchema>;

// Template Schemas
export const todoTemplateItemSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  title: z.string(),
  order: z.number(),
  createdAt: z.string(),
});
export type TodoTemplateItem = z.infer<typeof todoTemplateItemSchema>;

export const todoTemplateSchema = z.object({
  id: z.string(),
  profileId: z.number().nullable(),
  title: z.string(),
  description: z.string().nullable(),
  priority: z.enum(["low", "medium", "high"]),
  category: z.string(),
  isSystem: z.boolean(),
  usageCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  items: z.array(todoTemplateItemSchema),
});
export type TodoTemplate = z.infer<typeof todoTemplateSchema>;

// GET /api/todos
export const getTodosResponseSchema = z.object({
  todos: z.array(todoSchema),
});
export type GetTodosResponse = z.infer<typeof getTodosResponseSchema>;

// POST /api/todos
export const createTodoRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
  dueDate: z.string().optional(),
  linkedHabitId: z.string().optional(),
  recurringType: recurringTypeSchema.optional(),
  recurringInterval: z.number().optional(),
  recurringDays: z.array(z.number().min(0).max(6)).optional(),
  reminderTime: z.string().optional(),
  reminderEnabled: z.boolean().default(false),
  items: z.array(z.object({
    title: z.string().min(1),
    order: z.number().optional(),
  })).optional(),
});
export type CreateTodoRequest = z.infer<typeof createTodoRequestSchema>;

// PATCH /api/todos/:id
export const updateTodoRequestSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
  dueDate: z.string().optional(),
  linkedHabitId: z.string().optional(),
  order: z.number().optional(),
  recurringType: recurringTypeSchema.optional(),
  recurringInterval: z.number().optional(),
  recurringDays: z.array(z.number().min(0).max(6)).optional(),
  reminderTime: z.string().optional(),
  reminderEnabled: z.boolean().optional(),
});
export type UpdateTodoRequest = z.infer<typeof updateTodoRequestSchema>;

// POST /api/todos/:id/complete
export const completeTodoRequestSchema = z.object({
  completed: z.boolean(),
});
export type CompleteTodoRequest = z.infer<typeof completeTodoRequestSchema>;

// POST /api/todos/:id/items
export const addTodoItemRequestSchema = z.object({
  title: z.string().min(1),
  order: z.number().optional(),
});
export type AddTodoItemRequest = z.infer<typeof addTodoItemRequestSchema>;

// PATCH /api/todos/:todoId/items/:itemId
export const updateTodoItemRequestSchema = z.object({
  title: z.string().optional(),
  completed: z.boolean().optional(),
  order: z.number().optional(),
});
export type UpdateTodoItemRequest = z.infer<typeof updateTodoItemRequestSchema>;

// POST /api/todos/:id/archive
export const archiveTodoRequestSchema = z.object({
  archived: z.boolean(),
});
export type ArchiveTodoRequest = z.infer<typeof archiveTodoRequestSchema>;

// POST /api/todos/:id/repeat
export const repeatTodoRequestSchema = z.object({
  resetItems: z.boolean().default(true),
});
export type RepeatTodoRequest = z.infer<typeof repeatTodoRequestSchema>;

// POST /api/todos/:id/save-template
export const saveAsTemplateRequestSchema = z.object({
  category: z.string().default("general"),
});
export type SaveAsTemplateRequest = z.infer<typeof saveAsTemplateRequestSchema>;

// Template API Routes
// GET /api/templates
export const getTemplatesResponseSchema = z.object({
  templates: z.array(todoTemplateSchema),
});
export type GetTemplatesResponse = z.infer<typeof getTemplatesResponseSchema>;

// POST /api/templates/:id/use
export const useTemplateRequestSchema = z.object({
  dueDate: z.string().optional(),
});
export type UseTemplateRequest = z.infer<typeof useTemplateRequestSchema>;

// DELETE /api/templates/:id
// (no request body needed)

// Work Schedule Schemas
export const workScheduleSchema = z.object({
  id: z.string(),
  profileId: z.number(),
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  workLocationName: z.string(),
  workLatitude: z.number(),
  workLongitude: z.number(),
  workAddress: z.string().nullable(),
  homeLatitude: z.number(),
  homeLongitude: z.number(),
  homeAddress: z.string().nullable(),
  isActive: z.boolean(),
  prepTimeMinutes: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type WorkSchedule = z.infer<typeof workScheduleSchema>;

export const createWorkScheduleRequestSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string(),
  endTime: z.string().optional(),
  workLocationName: z.string(),
  workLatitude: z.number(),
  workLongitude: z.number(),
  workAddress: z.string().optional(),
  homeLatitude: z.number(),
  homeLongitude: z.number(),
  homeAddress: z.string().optional(),
  prepTimeMinutes: z.number().default(60),
});
export type CreateWorkScheduleRequest = z.infer<typeof createWorkScheduleRequestSchema>;

// Route Schemas
export const routeSchema = z.object({
  id: z.string(),
  profileId: z.number(),
  fromName: z.string(),
  fromLatitude: z.number(),
  fromLongitude: z.number(),
  toName: z.string(),
  toLatitude: z.number(),
  toLongitude: z.number(),
  estimatedMinutes: z.number(),
  lastTravelMinutes: z.number().nullable(),
  lastChecked: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Route = z.infer<typeof routeSchema>;

export const getTravelTimeRequestSchema = z.object({
  fromLatitude: z.number(),
  fromLongitude: z.number(),
  toLatitude: z.number(),
  toLongitude: z.number(),
});
export type GetTravelTimeRequest = z.infer<typeof getTravelTimeRequestSchema>;

export const getTravelTimeResponseSchema = z.object({
  estimatedMinutes: z.number(),
  distance: z.number(),
  withTraffic: z.boolean(),
});
export type GetTravelTimeResponse = z.infer<typeof getTravelTimeResponseSchema>;

// Morning Routine Schemas
export const morningRoutineSchema = z.object({
  id: z.string(),
  profileId: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  order: z.number(),
  durationMinutes: z.number(),
  isRequired: z.boolean(),
  category: z.enum(["hygiene", "nutrition", "wellness", "preparation", "general"]),
  linkedHabitId: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  completedToday: z.boolean().optional(),
});
export type MorningRoutine = z.infer<typeof morningRoutineSchema>;

export const createMorningRoutineRequestSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  order: z.number().optional(),
  durationMinutes: z.number().default(5),
  isRequired: z.boolean().default(true),
  category: z.enum(["hygiene", "nutrition", "wellness", "preparation", "general"]).default("general"),
  linkedHabitId: z.string().optional(),
});
export type CreateMorningRoutineRequest = z.infer<typeof createMorningRoutineRequestSchema>;

export const completeMorningRoutineRequestSchema = z.object({
  skipped: z.boolean().default(false),
  note: z.string().optional(),
});
export type CompleteMorningRoutineRequest = z.infer<typeof completeMorningRoutineRequestSchema>;

// Morning Briefing Schema (Enhanced)
export const morningBriefingResponseSchema = z.object({
  greeting: z.string(),
  workSchedule: workScheduleSchema.nullable(),
  travelTime: z.object({
    estimatedMinutes: z.number(),
    departureTime: z.string(),
    arrivalTime: z.string(),
    trafficStatus: z.enum(["light", "moderate", "heavy"]),
  }).nullable(),
  morningRoutines: z.array(morningRoutineSchema),
  totalPrepTime: z.number(),
  suggestedWakeTime: z.string().nullable(),
  habits: z.array(z.any()),
  focusSessions: z.number(),
  message: z.string(),
});
export type MorningBriefingResponse = z.infer<typeof morningBriefingResponseSchema>;

// Admin Schemas
export const toggleOnboardingRequestSchema = z.object({
  skipOnboarding: z.boolean(),
});
export type ToggleOnboardingRequest = z.infer<typeof toggleOnboardingRequestSchema>;

export const setAdminRequestSchema = z.object({
  isAdmin: z.boolean(),
});
export type SetAdminRequest = z.infer<typeof setAdminRequestSchema>;

export const getAdminProfileResponseSchema = z.object({
  isAdmin: z.boolean(),
  skipOnboarding: z.boolean(),
  handle: z.string(),
});
export type GetAdminProfileResponse = z.infer<typeof getAdminProfileResponseSchema>;

// Location Reminder Schemas
export const locationReminderSchema = z.object({
  id: z.string(),
  profileId: z.number(),
  geofenceId: z.string().nullable(),
  title: z.string(),
  message: z.string(),
  triggerType: z.enum(["on_enter", "on_exit", "on_stay", "nearby"]),
  stayDuration: z.number().nullable(),
  isActive: z.boolean(),
  repeatType: z.enum(["always", "once", "daily", "weekdays"]),
  lastTriggered: z.string().nullable(),
  timesTriggered: z.number(),
  linkedHabitId: z.string().nullable(),
  linkedTodoId: z.string().nullable(),
  priority: z.enum(["low", "medium", "high"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type LocationReminder = z.infer<typeof locationReminderSchema>;

export const createLocationReminderRequestSchema = z.object({
  geofenceId: z.string().optional(),
  title: z.string().min(1),
  message: z.string().min(1),
  triggerType: z.enum(["on_enter", "on_exit", "on_stay", "nearby"]),
  stayDuration: z.number().optional(),
  repeatType: z.enum(["always", "once", "daily", "weekdays"]).default("always"),
  linkedHabitId: z.string().optional(),
  linkedTodoId: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});
export type CreateLocationReminderRequest = z.infer<typeof createLocationReminderRequestSchema>;

export const updateLocationReminderRequestSchema = z.object({
  title: z.string().optional(),
  message: z.string().optional(),
  triggerType: z.enum(["on_enter", "on_exit", "on_stay", "nearby"]).optional(),
  stayDuration: z.number().optional(),
  isActive: z.boolean().optional(),
  repeatType: z.enum(["always", "once", "daily", "weekdays"]).optional(),
  linkedHabitId: z.string().optional(),
  linkedTodoId: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).optional(),
});
export type UpdateLocationReminderRequest = z.infer<typeof updateLocationReminderRequestSchema>;

// Location Suggestion Schemas
export const locationSuggestionSchema = z.object({
  id: z.string(),
  profileId: z.number(),
  latitude: z.number(),
  longitude: z.number(),
  name: z.string(),
  category: z.string(),
  reason: z.string(),
  confidence: z.number(),
  basedOn: z.string(),
  dismissed: z.boolean(),
  accepted: z.boolean(),
  createdGeofenceId: z.string().nullable(),
  createdAt: z.string(),
  expiresAt: z.string().nullable(),
});
export type LocationSuggestion = z.infer<typeof locationSuggestionSchema>;

export const dismissSuggestionRequestSchema = z.object({
  dismissed: z.boolean(),
});
export type DismissSuggestionRequest = z.infer<typeof dismissSuggestionRequestSchema>;

export const acceptSuggestionRequestSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  radius: z.number().optional(),
});
export type AcceptSuggestionRequest = z.infer<typeof acceptSuggestionRequestSchema>;

// GET /api/location/reminders
export const getLocationRemindersResponseSchema = z.object({
  reminders: z.array(locationReminderSchema),
});
export type GetLocationRemindersResponse = z.infer<typeof getLocationRemindersResponseSchema>;

// GET /api/location/suggestions
export const getLocationSuggestionsResponseSchema = z.object({
  suggestions: z.array(locationSuggestionSchema),
});
export type GetLocationSuggestionsResponse = z.infer<typeof getLocationSuggestionsResponseSchema>;

// Emotional Core Schemas

// User Goal
export const userGoalSchema = z.object({
  id: z.string(),
  profileId: z.number(),
  purpose: z.string(),
  identity: z.string().nullable(),
  bigWhy: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type UserGoal = z.infer<typeof userGoalSchema>;

export const createUserGoalRequestSchema = z.object({
  purpose: z.string().min(1),
  identity: z.string().optional(),
  bigWhy: z.string().min(1),
});
export type CreateUserGoalRequest = z.infer<typeof createUserGoalRequestSchema>;

// Daily Intention
export const dailyIntentionSchema = z.object({
  id: z.string(),
  profileId: z.number(),
  date: z.string(),
  morningFeeling: z.enum(["energized", "good", "tired", "struggling"]),
  oneBigWin: z.string(),
  completed: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DailyIntention = z.infer<typeof dailyIntentionSchema>;

export const createDailyIntentionRequestSchema = z.object({
  morningFeeling: z.enum(["energized", "good", "tired", "struggling"]),
  oneBigWin: z.string().min(1),
  date: z.string().optional(),
});
export type CreateDailyIntentionRequest = z.infer<typeof createDailyIntentionRequestSchema>;

// Daily Reflection
export const dailyReflectionSchema = z.object({
  id: z.string(),
  profileId: z.number(),
  date: z.string(),
  dayRating: z.enum(["amazing", "good", "okay", "rough"]),
  oneWin: z.string(),
  oneLearning: z.string().nullable(),
  gratitude: z.string().nullable(),
  habitsCompleted: z.number(),
  focusMinutes: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type DailyReflection = z.infer<typeof dailyReflectionSchema>;

export const createDailyReflectionRequestSchema = z.object({
  dayRating: z.enum(["amazing", "good", "okay", "rough"]),
  oneWin: z.string().min(1),
  oneLearning: z.string().optional(),
  gratitude: z.string().optional(),
  date: z.string().optional(),
});
export type CreateDailyReflectionRequest = z.infer<typeof createDailyReflectionRequestSchema>;

// Achievement
export const achievementSchema = z.object({
  id: z.string(),
  profileId: z.number(),
  habitId: z.string().nullable(),
  type: z.string(),
  title: z.string(),
  description: z.string(),
  unlockedAt: z.string(),
  celebrated: z.boolean(),
});
export type Achievement = z.infer<typeof achievementSchema>;

export const markCelebratedRequestSchema = z.object({
  celebrated: z.boolean(),
});
export type MarkCelebratedRequest = z.infer<typeof markCelebratedRequestSchema>;

// Identity Statement
export const identityStatementSchema = z.object({
  id: z.string(),
  profileId: z.number(),
  habitId: z.string(),
  statement: z.string(),
  earnedAt: z.string(),
  timesShown: z.number(),
});
export type IdentityStatement = z.infer<typeof identityStatementSchema>;

// API Response Schemas
export const getUserGoalResponseSchema = z.object({
  goal: userGoalSchema.nullable(),
});
export type GetUserGoalResponse = z.infer<typeof getUserGoalResponseSchema>;

export const getDailyIntentionResponseSchema = z.object({
  intention: dailyIntentionSchema.nullable(),
});
export type GetDailyIntentionResponse = z.infer<typeof getDailyIntentionResponseSchema>;

export const getDailyReflectionResponseSchema = z.object({
  reflection: dailyReflectionSchema.nullable(),
});
export type GetDailyReflectionResponse = z.infer<typeof getDailyReflectionResponseSchema>;

export const getRecentReflectionsResponseSchema = z.object({
  reflections: z.array(dailyReflectionSchema),
});
export type GetRecentReflectionsResponse = z.infer<typeof getRecentReflectionsResponseSchema>;

export const getAchievementsResponseSchema = z.object({
  achievements: z.array(achievementSchema),
});
export type GetAchievementsResponse = z.infer<typeof getAchievementsResponseSchema>;

export const getUncelebratedAchievementResponseSchema = z.object({
  achievement: achievementSchema.nullable(),
});
export type GetUncelebratedAchievementResponse = z.infer<typeof getUncelebratedAchievementResponseSchema>;

export const getIdentityStatementsResponseSchema = z.object({
  statements: z.array(identityStatementSchema),
});
export type GetIdentityStatementsResponse = z.infer<typeof getIdentityStatementsResponseSchema>;

export const getEmotionalDashboardResponseSchema = z.object({
  goal: userGoalSchema.nullable(),
  intention: dailyIntentionSchema.nullable(),
  reflection: dailyReflectionSchema.nullable(),
  uncelebratedAchievement: achievementSchema.nullable(),
  identityStatement: identityStatementSchema.nullable(),
});
export type GetEmotionalDashboardResponse = z.infer<typeof getEmotionalDashboardResponseSchema>;

// Habit Template Marketplace Schemas

export const habitTemplateItemSchema = z.object({
  id: z.string(),
  templateId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string(),
  category: habitCategorySchema,
  frequency: z.string(),
  targetCount: z.number(),
  order: z.number(),
  timeOfDay: z.enum(["morning", "afternoon", "evening", "anytime"]).nullable(),
  createdAt: z.string(),
});
export type HabitTemplateItem = z.infer<typeof habitTemplateItemSchema>;

export const habitTemplateSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  category: z.enum(["morning", "evening", "fitness", "wellness", "productivity", "mental_health", "full_day"]),
  price: z.number(),
  imageUrl: z.string().nullable(),
  isPremium: z.boolean(),
  isActive: z.boolean(),
  usageCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  habits: z.array(habitTemplateItemSchema),
  isPurchased: z.boolean().optional(), // Runtime field
  isImported: z.boolean().optional(), // Runtime field
});
export type HabitTemplate = z.infer<typeof habitTemplateSchema>;

export const templatePurchaseSchema = z.object({
  id: z.string(),
  profileId: z.number(),
  templateId: z.string(),
  price: z.number(),
  purchasedAt: z.string(),
  imported: z.boolean(),
  importedAt: z.string().nullable(),
});
export type TemplatePurchase = z.infer<typeof templatePurchaseSchema>;

// GET /api/templates/marketplace
export const getMarketplaceTemplatesResponseSchema = z.object({
  templates: z.array(habitTemplateSchema),
});
export type GetMarketplaceTemplatesResponse = z.infer<typeof getMarketplaceTemplatesResponseSchema>;

// POST /api/templates/marketplace/:id/purchase
export const purchaseTemplateRequestSchema = z.object({
  paymentMethod: z.string().default("mock"), // For now, mock payment
});
export type PurchaseTemplateRequest = z.infer<typeof purchaseTemplateRequestSchema>;

export const purchaseTemplateResponseSchema = z.object({
  success: z.boolean(),
  purchase: templatePurchaseSchema,
  template: habitTemplateSchema,
});
export type PurchaseTemplateResponse = z.infer<typeof purchaseTemplateResponseSchema>;

// POST /api/templates/marketplace/:id/import
export const importTemplateRequestSchema = z.object({
  customizations: z.array(z.object({
    habitIndex: z.number(),
    title: z.string().optional(),
    icon: z.string().optional(),
    color: z.string().optional(),
  })).optional(),
});
export type ImportTemplateRequest = z.infer<typeof importTemplateRequestSchema>;

export const importTemplateResponseSchema = z.object({
  success: z.boolean(),
  habitsCreated: z.array(habitSchema),
});
export type ImportTemplateResponse = z.infer<typeof importTemplateResponseSchema>;

// GET /api/templates/marketplace/purchases
export const getMyPurchasesResponseSchema = z.object({
  purchases: z.array(z.object({
    purchase: templatePurchaseSchema,
    template: habitTemplateSchema,
  })),
});
export type GetMyPurchasesResponse = z.infer<typeof getMyPurchasesResponseSchema>;

// ============================================================
// SONIC PENTAGRAM - Music Critique System
// ============================================================

export const scoreProfileSchema = z.object({
  lyricism: z.number().min(0).max(1),
  production: z.number().min(0).max(1),
  vocals: z.number().min(0).max(1),
  flow: z.number().min(0).max(1),
  vibe: z.number().min(0).max(1),
});
export type ScoreProfile = z.infer<typeof scoreProfileSchema>;

export const trackSchema = z.object({
  id: z.string(),
  spotifyId: z.string().nullable(),
  title: z.string(),
  artist: z.string(),
  album: z.string().nullable(),
  duration: z.number().nullable(),
  imageUrl: z.string().nullable(),
  previewUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Track = z.infer<typeof trackSchema>;

export const trackScoreSchema = z.object({
  id: z.string(),
  lyricism: z.number().min(0).max(100),
  production: z.number().min(0).max(100),
  vocals: z.number().min(0).max(100),
  flow: z.number().min(0).max(100),
  vibe: z.number().min(0).max(100),
  comment: z.string().nullable(),
  isSpoiler: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
  profileId: z.number(),
  trackId: z.string(),
});
export type TrackScore = z.infer<typeof trackScoreSchema>;

export const trackScoreAggregateSchema = z.object({
  trackId: z.string(),
  avgLyricism: z.number(),
  avgProduction: z.number(),
  avgVocals: z.number(),
  avgFlow: z.number(),
  avgVibe: z.number(),
  totalReviews: z.number(),
  updatedAt: z.string(),
});
export type TrackScoreAggregate = z.infer<typeof trackScoreAggregateSchema>;

// POST /api/tracks/score
export const submitTrackScoreRequestSchema = z.object({
  trackId: z.string().optional(), // If not provided, create new track
  spotifyId: z.string().optional(),
  title: z.string().min(1),
  artist: z.string().min(1),
  album: z.string().optional(),
  duration: z.number().optional(),
  imageUrl: z.string().optional(),
  previewUrl: z.string().optional(),
  // Scores (0-1, will be converted to 0-100)
  scores: scoreProfileSchema,
  comment: z.string().optional(),
  isSpoiler: z.boolean().default(false),
});
export type SubmitTrackScoreRequest = z.infer<typeof submitTrackScoreRequestSchema>;

export const submitTrackScoreResponseSchema = z.object({
  success: z.boolean(),
  score: trackScoreSchema,
  aggregate: trackScoreAggregateSchema,
});
export type SubmitTrackScoreResponse = z.infer<typeof submitTrackScoreResponseSchema>;

// GET /api/tracks/:trackId/scores
export const getTrackScoresResponseSchema = z.object({
  scores: z.array(trackScoreSchema),
  aggregate: trackScoreAggregateSchema.nullable(),
  userScore: trackScoreSchema.nullable(),
});
export type GetTrackScoresResponse = z.infer<typeof getTrackScoresResponseSchema>;

// GET /api/tracks/:trackId
export const getTrackResponseSchema = z.object({
  track: trackSchema,
  aggregate: trackScoreAggregateSchema.nullable(),
  userScore: trackScoreSchema.nullable(),
});
export type GetTrackResponse = z.infer<typeof getTrackResponseSchema>;

// POST /api/tracks/:trackId/play
export const recordPlayRequestSchema = z.object({
  timestamp: z.string().optional(),
});
export type RecordPlayRequest = z.infer<typeof recordPlayRequestSchema>;

export const recordPlayResponseSchema = z.object({
  success: z.boolean(),
  playCount: z.number(),
  shouldPromptRating: z.boolean(),
});
export type RecordPlayResponse = z.infer<typeof recordPlayResponseSchema>;

// GET /api/preferences
export const getUserPreferencesResponseSchema = z.object({
  weightLyricism: z.number(),
  weightProduction: z.number(),
  weightVocals: z.number(),
  weightFlow: z.number(),
  weightVibe: z.number(),
  discoverySensitivity: z.number(),
});
export type GetUserPreferencesResponse = z.infer<typeof getUserPreferencesResponseSchema>;

// PATCH /api/preferences
export const updateUserPreferencesRequestSchema = z.object({
  weightLyricism: z.number().min(0).max(2).optional(),
  weightProduction: z.number().min(0).max(2).optional(),
  weightVocals: z.number().min(0).max(2).optional(),
  weightFlow: z.number().min(0).max(2).optional(),
  weightVibe: z.number().min(0).max(2).optional(),
  discoverySensitivity: z.number().min(0).max(1).optional(),
});
export type UpdateUserPreferencesRequest = z.infer<typeof updateUserPreferencesRequestSchema>;

