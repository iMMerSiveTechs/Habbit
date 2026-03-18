# HABBIT - 20-Phase Release Plan

> From broken prototype to App Store-ready product
> 259 files | 40+ bugs | 0 tests | 180+ features to wire

---

## PHASE 1: SECRET ROTATION & SECURITY LOCKDOWN
**Priority:** BLOCKER | **Effort:** 4-6 hours | **Risk if skipped:** Total compromise

### Tasks
- [ ] Remove `.env` and `.env.production` from git history (`git filter-branch` or BFG)
- [ ] Add `.env*` to `.gitignore` (both backend and mobile)
- [ ] Rotate BETTER_AUTH_SECRET - generate new 64-char random string
- [ ] Rotate ANTHROPIC_API_KEY - revoke old key in Anthropic dashboard
- [ ] Rotate any RevenueCat API keys if committed
- [ ] Create `.env.example` files with placeholder values for both backend and mobile
- [ ] Add CORS allowlist - replace wildcard with explicit origins (production URL + localhost)
- [ ] Add CSRF token middleware to all state-changing routes (POST/PUT/DELETE)
- [ ] Add magic-byte validation to file upload route (not just MIME type)
- [ ] Reduce auth rate limit from 100/min to 10/min with progressive lockout
- [ ] Audit all routes for missing `requireAuth` middleware
- [ ] Remove `EXPO_PUBLIC_` prefix from any server-side-only API keys

### Deliverables
- Clean git history with no secrets
- `.env.example` files committed
- CORS, CSRF, rate limiting hardened
- Upload validation strengthened

### Exit Criteria
All secrets rotated, no sensitive data in git, security middleware on every route.

---

## PHASE 2: DATABASE HARDENING & SCHEMA FIXES
**Priority:** BLOCKER | **Effort:** 6-8 hours | **Risk if skipped:** Data corruption, orphaned records

### Tasks
- [ ] Add composite indexes to Prisma schema:
  - `@@index([profileId, archived])` on Habit
  - `@@index([profileId, completed])` on Todo
  - `@@index([profileId, createdAt])` on HabitEvent
  - `@@index([profileId])` on FocusSession, LocationVisit, EmotionalState
  - `@@index([subscriptionTier])` on Profile
- [ ] Fix user deletion cascade - add cleanup for all 5 missing tables:
  - MissedItem, SkipPattern, AdaptiveNotification, LocationPattern, LocationMoodMap
- [ ] Add Zod validation to all route inputs:
  - `habit.targetCount` must be >= 1
  - `biometric.sleepHours` must be 0-24
  - `biometric.stressLevel` must be 0-100
  - `todo.title` must be non-empty, max 500 chars
  - `habit.title` must be non-empty, max 200 chars
- [ ] Add `onDelete: Cascade` to all foreign key relations in schema.prisma
- [ ] Add `.take(100)` default limit to all `findMany()` calls
- [ ] Add pagination params (skip/take) to habits, todos, events, locations endpoints
- [ ] Create migration: `bunx prisma migrate dev --name security-and-indexes`
- [ ] Test migration on copy of dev.db before applying

### Deliverables
- New Prisma migration with indexes and cascades
- All routes validated with Zod schemas
- Pagination on all list endpoints

### Exit Criteria
No orphaned records on user deletion. All inputs validated. Queries indexed.

---

## PHASE 3: ERROR HANDLING & RESILIENCE (Backend)
**Priority:** CRITICAL | **Effort:** 8-10 hours | **Risk if skipped:** Server crashes, silent data loss

### Tasks
- [ ] Create global error handler middleware in `src/index.ts`:
  ```typescript
  app.onError((err, c) => {
    console.error(`[${c.req.method}] ${c.req.url}`, err);
    return c.json({ error: 'Internal server error' }, 500);
  });
  ```
- [ ] Wrap every route handler in try-catch (or use Hono's error middleware)
- [ ] Standardize API error response format:
  ```json
  { "error": "message", "code": "HABIT_NOT_FOUND", "status": 404 }
  ```
- [ ] Replace empty-array fallbacks with proper error codes (biometric.ts:96, etc.)
- [ ] Add request logging middleware (method, path, status, duration)
- [ ] Add health check endpoint: `GET /api/health`
- [ ] Add structured logging with pino (replace all console.log)
- [ ] Add request timeout middleware (30s max)
- [ ] Fix tier guard silent downgrade - return 403 with message for unknown tiers
- [ ] Add graceful shutdown handler (close DB connections)
- [ ] Handle Prisma-specific errors (unique constraint, not found) with proper HTTP codes

### Deliverables
- Global error handler catching all unhandled exceptions
- Consistent error response format across all 60+ routes
- Structured logging with request tracing
- Health check endpoint

### Exit Criteria
No uncaught exceptions. All errors return structured JSON. Logs are queryable.

---

## PHASE 4: AUTH & SESSION MANAGEMENT
**Priority:** CRITICAL | **Effort:** 6-8 hours | **Risk if skipped:** Session leaks, stale data between accounts

### Tasks
- [ ] Standardize auth pattern across all routes - use `c.get("user")` consistently
- [ ] Audit every route for proper `requireAuth` middleware (social.ts has gaps)
- [ ] Add session validity check endpoint: `GET /api/auth/check`
- [ ] Mobile: Call `/api/auth/check` on app foreground (AppState listener)
- [ ] Mobile: Clear ALL local state on logout:
  - `appStore.getState().reset()` (add reset action)
  - `habitsStore.getState().reset()`
  - `todosStore.getState().reset()`
  - `focusStore.getState().reset()`
  - `cerebraStore.getState().reset()`
  - `scheduleStore.getState().reset()`
  - Clear AsyncStorage persisted data
  - Clear React Query cache
- [ ] Add `reset()` method to every Zustand store
- [ ] Handle 401 responses globally in API client - redirect to Welcome screen
- [ ] Add session refresh logic (refresh token before expiry)
- [ ] Prevent stale session data from being displayed after re-login as different user
- [ ] Add admin authorization check (not just setup token)

### Deliverables
- Consistent auth on all routes
- Clean logout that wipes all local state
- Proactive session validation on app foreground
- No data leaks between accounts

### Exit Criteria
Login as User A, logout, login as User B = zero User A data visible.

---

## PHASE 5: TEST INFRASTRUCTURE & CRITICAL PATH TESTS
**Priority:** CRITICAL | **Effort:** 12-16 hours | **Risk if skipped:** Zero confidence in any changes

### Tasks
- [ ] **Backend test setup:**
  - Install vitest, supertest, @types/supertest
  - Create `vitest.config.ts` with Bun-compatible settings
  - Create test database setup (in-memory SQLite or test.db)
  - Create test helpers: `createTestUser()`, `createTestHabit()`, `authenticatedRequest()`
  - Add `"test": "vitest run"` to package.json scripts
- [ ] **Backend tests (50+ tests):**
  - Auth: signup, login, logout, session expiry, invalid credentials (8 tests)
  - Habits CRUD: create, read, update, delete, list, complete, undo (12 tests)
  - Streak calculator: 0-day, 1-day, 7-day, gap, timezone edge cases (8 tests)
  - Todos CRUD: create, complete, subtasks, reorder, delete (8 tests)
  - Focus sessions: start, end, duration calculation (5 tests)
  - Tier gating: free user blocked from pro features, pro user allowed (5 tests)
  - Input validation: negative targetCount, empty title, XSS in title (6 tests)
  - User deletion: all cascades fire correctly (3 tests)
- [ ] **Mobile test setup:**
  - Install jest, @testing-library/react-native, @testing-library/jest-native
  - Configure jest in package.json with transformers for Expo
  - Create mock providers (navigation, auth, stores)
  - Add `"test": "jest"` to package.json scripts
- [ ] **Mobile tests (30+ tests):**
  - Zustand stores: habitsStore actions, todosStore actions, focusStore timer (10 tests)
  - Tier gating: `canAccessFeature()`, `meetsMinimumTier()` (5 tests)
  - Streak calculator (mobile): same as backend (5 tests)
  - API client: 401 handling, timeout, retry (5 tests)
  - TimeSystem utilities: getTodayKey, daysBetween, computeStreak (5 tests)

### Deliverables
- Vitest backend suite: 50+ passing tests
- Jest mobile suite: 30+ passing tests
- Test helpers and mocks for future test writing
- `bun test` works in both directories

### Exit Criteria
80+ tests passing. All critical business logic (streaks, tiers, auth) covered.

---

## PHASE 6: API TYPE SAFETY & CONTRACTS
**Priority:** HIGH | **Effort:** 8-10 hours | **Risk if skipped:** Runtime type errors, silent data corruption

### Tasks
- [ ] Expand `shared/contracts.ts` with Zod schemas for ALL entities:
  - HabitSchema, HabitWithStatsSchema, HabitEventSchema
  - TodoSchema, TodoItemSchema
  - FocusSessionSchema
  - DailyBriefingSchema, CerebraMessageSchema
  - EmotionalStateSchema, EmotionalDashboardSchema
  - UserProfileSchema, SubscriptionInfoSchema
  - AchievementSchema
  - LocationVisitSchema, GeofenceSchema
- [ ] Create typed API response wrappers:
  ```typescript
  type ApiResponse<T> = { data: T } | { error: string; code: string }
  ```
- [ ] Update `mobile/src/lib/api.ts` with generic typed methods:
  ```typescript
  api.get<T>(path, schema): Promise<T>
  api.post<T, R>(path, body, responseSchema): Promise<R>
  ```
- [ ] Validate all API responses with Zod `.parse()` in development, `.safeParse()` in production
- [ ] Remove all `any` types from:
  - habitApi.ts (6 functions)
  - todosApi.ts
  - reflectionApi.ts
  - scheduleApi.ts
  - All screen components using API data
- [ ] Add backend route response types using contracts
- [ ] Consolidate duplicate API clients (habitApi, todosApi, etc.) into unified `api.ts` methods

### Deliverables
- Single source of truth for all entity types in `contracts.ts`
- Typed API client with runtime validation
- Zero `any` types in API layer

### Exit Criteria
TypeScript compiler catches mismatched API usage. Zod catches malformed responses at runtime.

---

## PHASE 7: STATE PERSISTENCE & OFFLINE FOUNDATION
**Priority:** HIGH | **Effort:** 8-10 hours | **Risk if skipped:** Data loss on app restart, empty state flash

### Tasks
- [ ] Add Zustand `persist` middleware to habitsStore:
  ```typescript
  persist(storeLogic, {
    name: 'habits-storage',
    storage: createJSONStorage(() => AsyncStorage),
    partialize: (state) => ({ habits: state.habits }),
  })
  ```
- [ ] Add persist to todosStore (same pattern)
- [ ] Add persist to focusStore (persist activeSession, not running timer)
- [ ] Add persist to cerebraStore and scheduleStore
- [ ] Implement hydration loading state:
  - Add `_hasHydrated` flag to each persisted store
  - Show SkeletonLoader while stores rehydrate
- [ ] Implement stale-while-revalidate pattern:
  - Show persisted data immediately on app open
  - Fetch fresh data from server in background
  - Update store when server data arrives
- [ ] Wire up React Query with `staleTime: 5 * 60 * 1000` (5 min) for habit/todo queries
- [ ] Add optimistic update helpers:
  ```typescript
  // Complete habit: update local immediately, send to server, rollback on error
  completeHabitOptimistic(habitId) {
    const prev = get().habits;
    set(optimisticUpdate);
    try { await api.completeHabit(habitId); }
    catch { set({ habits: prev }); }
  }
  ```
- [ ] Implement optimistic updates for:
  - Habit completion/undo
  - Todo completion/undo
  - Todo reorder
  - Habit creation (add to local list, sync ID from server)
- [ ] Add `lastSyncedAt` timestamp to each store for staleness detection

### Deliverables
- All stores persisted to AsyncStorage
- Instant app open with cached data
- Optimistic updates for all common actions
- Background refresh with stale-while-revalidate

### Exit Criteria
Kill app during focus session, reopen = session data intact. Complete habit offline = UI updates instantly.

---

## PHASE 8: ERROR HANDLING & LOADING STATES (Mobile)
**Priority:** HIGH | **Effort:** 8-10 hours | **Risk if skipped:** White screens, confused users

### Tasks
- [ ] Add ErrorBoundary wrapper to ALL modal/stack screens in RootNavigator.tsx:
  ```tsx
  <Stack.Screen name="CerebraCoach">
    {(props) => <ErrorBoundary><CerebraCoachScreen {...props} /></ErrorBoundary>}
  </Stack.Screen>
  ```
- [ ] Create reusable `<ErrorState />` component:
  - Shows error message + retry button
  - Accepts `onRetry` callback
  - Matches app theme (Obsidian ICE)
- [ ] Create reusable `<EmptyState />` component:
  - Shows illustration + message for empty lists
  - "No habits yet" / "No todos yet" / "No insights yet"
- [ ] Add error/loading/empty states to every data-dependent screen:
  - TodayScreenConnected: skeleton for briefing, habits, todos
  - HabitsScreenConnected: skeleton grid, error retry, empty state
  - TodosScreen: skeleton list, error retry, empty state
  - InsightsScreenConnected: skeleton charts, error retry
  - CalendarScreen: skeleton calendar, error retry
  - CerebraCoachScreen: loading indicator, error state
- [ ] Add API request timeout (10 seconds) to `mobile/src/lib/api.ts`:
  ```typescript
  const controller = new AbortController();
  setTimeout(() => controller.abort(), 10000);
  fetch(url, { ...options, signal: controller.signal });
  ```
- [ ] Add pull-to-refresh on TodayScreen, HabitsScreen, TodosScreen
- [ ] Add toast/snackbar for non-blocking errors ("Failed to sync, will retry")
- [ ] Handle network offline state with `@react-native-community/netinfo`:
  - Show banner "You're offline - changes will sync when connected"
  - Queue mutations for retry when online

### Deliverables
- Error boundaries on every screen
- Loading skeletons replacing blank states
- Pull-to-refresh on all list screens
- Offline banner with queued sync
- 10s timeout on all API calls

### Exit Criteria
No white/blank screens ever. Failed API = clear error message + retry. Offline = banner + local mode.

---

## PHASE 9: COMPONENT DECOMPOSITION & PERFORMANCE
**Priority:** HIGH | **Effort:** 10-12 hours | **Risk if skipped:** 60fps drops, unmaintainable code

### Tasks
- [ ] **Split TodayScreenConnected (857 lines) into:**
  - `TodayScreen.tsx` - layout shell + pull-to-refresh
  - `useTodayData()` hook - all data fetching + state
  - `TodayGreeting.tsx` - greeting + integrity display
  - `TodayRouteMap.tsx` - route map card
  - `TodayRhythm.tsx` - focus blocks from briefing
  - `TodayCerebra.tsx` - AI suggestion card (gated)
  - `TodayHabitsPreview.tsx` - habits section
  - `TodayTodosPreview.tsx` - todos section
  - `TodayFocusOrb.tsx` - timer + controls
  - `TodayActivationPrompt.tsx` - morning/evening CTA
- [ ] **Split HabitsScreenConnected into:**
  - `HabitsScreen.tsx` - layout shell
  - `useHabitsData()` hook
  - `HabitsList.tsx` - FlatList with virtualization
  - `HabitsHeader.tsx` - search + filter + add button
- [ ] **Split TodosScreen similarly**
- [ ] Add `React.memo()` to all list item components:
  - InteractiveHabitCard
  - Todo list item
  - CategoryFilter item
  - Insight card
- [ ] Add `useMemo()` for:
  - Filtered habit lists
  - LinearGradient color arrays
  - Computed statistics
  - Style objects
- [ ] Add `useCallback()` for all event handlers passed as props
- [ ] Fix FlatList performance:
  - Add `initialNumToRender={10}`
  - Add `maxToRenderPerBatch={5}`
  - Add `windowSize={5}`
  - Add `getItemLayout` where item heights are fixed
  - Add `keyExtractor` (verify all lists have unique keys)
- [ ] Debounce search inputs (300ms) in HabitsScreen
- [ ] Fix focus timer interval cleanup in TodayScreen
- [ ] Move static data (task options, categories, colors) to constants files
- [ ] Profile with React DevTools Profiler - identify remaining bottlenecks

### Deliverables
- TodayScreen reduced from 857 lines to ~100 line shell
- All list items memoized
- FlatList virtualization configured
- Search debounced
- Timer interval leak fixed

### Exit Criteria
React Profiler shows <16ms render times. No unnecessary re-renders on state changes.

---

## PHASE 10: ONBOARDING FLOW FIXES
**Priority:** HIGH | **Effort:** 6-8 hours | **Risk if skipped:** Broken first-run experience, lost goals

### Tasks
- [ ] Fix ProfileSetupScreen goal persistence:
  - After profile setup, call `api.createUserGoal()` with pendingGoal data
  - If user not yet authenticated, persist to appStore and sync after auth
  - Add retry logic if API call fails
- [ ] Fix LocationOnboardingScreen:
  - Add `Location.requestBackgroundPermissionsAsync()` AFTER foreground permissions granted
  - Show explanation screen for iOS "Always Allow" requirement
  - Handle "Don't Allow" gracefully - skip geofencing features, don't block onboarding
  - Add "Skip for now" button
- [ ] Fix ContractScreen:
  - Verify contract acceptance is persisted
  - Ensure user can't bypass contract step
- [ ] Fix PricingScreen RevenueCat integration:
  - Handle case where RevenueCat packages fail to load
  - Add loading state while packages fetch
  - Handle purchase errors with user-friendly messages
  - Test "Restore Purchases" flow
- [ ] Fix NotificationSettingsScreen:
  - Handle "Don't Allow" gracefully
  - Show what notifications user will receive
  - Allow granular control (habit reminders, morning briefing, evening reflection)
- [ ] Add progress indicator to onboarding (step 1 of 5, etc.)
- [ ] Test complete onboarding flow:
  - Welcome → Pricing → Contract → ProfileSetup → Notifications → Location → Tabs
  - Verify each step transitions correctly
  - Verify skip paths work (skip location, skip notifications)
- [ ] Fix navigation key to not force remount entire app on onboarding stage change

### Deliverables
- Goals persist through onboarding to backend
- Background location permissions requested on iOS
- Graceful handling of all permission denials
- Progress indicator on onboarding
- Complete end-to-end onboarding flow working

### Exit Criteria
New user can complete onboarding on iOS and Android. All permission denials handled. Goal arrives in database.

---

## PHASE 11: WIRE ACHIEVEMENT & GAMIFICATION SYSTEM
**Priority:** HIGH | **Effort:** 8-10 hours | **Risk if skipped:** No dopamine loop, weak retention

### Tasks
- [ ] Create achievement trigger service (`achievementTriggerService.ts`):
  ```typescript
  checkMilestones(userId) {
    const habits = await getHabits(userId);
    const streaks = habits.map(h => h.currentStreak);
    if (streaks.some(s => s >= 7) && !hasAchievement('week_warrior'))
      await createAchievement('week_warrior');
    // ... check all milestones
  }
  ```
- [ ] Define achievement catalog:
  - First Habit Created, First Completion, 3-Day Streak, 7-Day Streak, 30-Day Streak
  - 100 Completions, 10 Habits Active, First Focus Session, 1 Hour Focused
  - First Todo Completed, All Todos Done (day), First Protocol Promoted to Core
  - Integrity above 90% for 7 days, Morning Activation 7 days straight
- [ ] Call `checkMilestones()` after:
  - Habit completion
  - Todo completion
  - Focus session end
  - Protocol promotion
  - Daily briefing generation
- [ ] Wire AchievementCelebrationScreen to actually display:
  - Navigate to celebration screen when new achievement unlocked
  - Show confetti animation (react-native-confetti-cannon already installed)
  - Play haptic feedback
  - Show badge + description + XP earned
- [ ] Wire AchievementBadges component in SettingsScreen/InsightsScreen
- [ ] Add XP system:
  - Habit completion: +10 XP
  - Todo completion: +5 XP
  - Focus session: +2 XP per minute
  - Achievement unlocked: +50-500 XP (based on rarity)
  - Protocol failure: -250 XP
- [ ] Display XP and level in TodayScreen header
- [ ] Store achievements in backend with timestamps

### Deliverables
- 15+ achievements defined and triggerable
- Celebration screen with confetti
- XP system with visible progress
- Achievement badges in profile

### Exit Criteria
Complete a 7-day streak = celebration screen fires automatically with confetti.

---

## PHASE 12: ADAPTIVE INTELLIGENCE UI WIRING
**Priority:** HIGH | **Effort:** 10-12 hours | **Risk if skipped:** Backend AI unused, wasted investment

### Tasks
- [ ] **Integrate MissedItemsReview into EveningReflectionScreen:**
  - Add as step after gratitude in evening flow
  - Fetch missed items from `/api/adaptive/missed-items/today`
  - Show each missed item with response options (reschedule, skip reason, too hard, etc.)
  - Save responses to `/api/adaptive/missed-items/:id/respond`
- [ ] **Build PatternInsightsScreen:**
  - Fetch patterns from `/api/adaptive/patterns`
  - Display skip patterns with day/time heatmap
  - Show confidence-scored suggestions ("Try 8am instead of 6am - 70% confidence")
  - Add "Accept Suggestion" button that calls habit update API
  - Add to navigation (accessible from Insights tab)
- [ ] **Wire Adaptive Notifications:**
  - Create background task that polls `/api/adaptive/notifications/pending`
  - Schedule local notifications for pending items
  - Mark as sent via `/api/adaptive/notifications/:id/sent`
  - Handle notification tap: open AdaptiveNotificationResponse modal
  - Track opens via `/api/adaptive/notifications/:id/opened`
- [ ] **Wire skip pattern visualizations:**
  - Use victory-native (already installed) for charts
  - Day-of-week heatmap (which days habits are skipped)
  - Time-of-day chart (which hours are hardest)
  - Weather correlation display (if weather data available)
- [ ] **Connect Cerebra AI coach properly:**
  - Ensure CerebraCoachScreen sends full context (habits, streaks, patterns)
  - Display coach responses with markdown rendering
  - Add conversation history persistence
  - Gate behind Pro/Elite tier
- [ ] Add "Insights" tab badge when new patterns detected

### Deliverables
- Evening reflection includes missed items review
- Pattern insights screen with visualizations
- Adaptive notifications sending and responding
- Cerebra coach fully functional
- All adaptive backend endpoints wired to UI

### Exit Criteria
Skip a habit 3 Mondays in a row = pattern detected, suggestion shown, notification sent.

---

## PHASE 13: SUBSCRIPTION & MONETIZATION HARDENING
**Priority:** HIGH | **Effort:** 6-8 hours | **Risk if skipped:** Revenue loss, tier mismatch

### Tasks
- [ ] Fix RevenueCat tier sync to be blocking (not fire-and-forget):
  ```typescript
  const purchase = await Purchases.purchasePackage(pkg);
  const tier = resolveTierFromCustomerInfo(purchase.customerInfo);
  const syncResult = await api.post('/api/subscription/sync', { tier });
  if (!syncResult.ok) {
    showError("Purchase recorded but sync failed. Restoring...");
    await Purchases.restorePurchases();
  }
  appStore.setState({ subscriptionTier: tier });
  ```
- [ ] Add RevenueCat webhook endpoint on backend:
  - `POST /api/webhooks/revenuecat`
  - Verify webhook signature
  - Update profile.subscriptionTier on renewal/cancellation/expiry
  - Handle INITIAL_PURCHASE, RENEWAL, CANCELLATION, BILLING_ISSUE, EXPIRATION
- [ ] Add tier expiry detection:
  - If subscription expires, downgrade to "preview" tier
  - Show "Your subscription has expired" modal
  - Grace period: 3 days after expiry before downgrading
- [ ] Fix PricingScreen:
  - Handle loading state while RevenueCat packages load
  - Handle error state if packages fail to load
  - Show current tier with checkmark
  - Show "Current Plan" badge on active tier
  - Handle upgrade, downgrade, and cancellation flows
- [ ] Add UpgradeScreen improvements:
  - Show what features user is trying to access
  - Show tier comparison table
  - Deep link to specific tier from feature gate
- [ ] Fix tier guard on backend:
  - Unknown tier → return 403 (not default to free)
  - Log tier mismatches for debugging
  - Add admin override for testing
- [ ] Add subscription status to SettingsScreen:
  - Show current tier, renewal date, price
  - "Manage Subscription" button → opens App Store subscription management
  - "Restore Purchases" button
- [ ] Test all tier transitions:
  - Free → Core, Free → Pro, Free → Elite
  - Core → Pro upgrade, Pro → Core downgrade
  - Cancellation → grace period → expiry → re-subscribe

### Deliverables
- Reliable tier sync (client + server always agree)
- RevenueCat webhook for server-side tier updates
- Expiry detection and grace period
- Complete subscription management UI

### Exit Criteria
Purchase → immediate access. Cancel → grace period → downgrade. Restore → regains access.

---

## PHASE 14: LOCATION & GEOFENCING COMPLETION
**Priority:** MEDIUM | **Effort:** 8-10 hours | **Risk if skipped:** Flagship feature broken

### Tasks
- [ ] Fix background location permissions flow:
  - iOS: Request "Always Allow" with explanation screen
  - Android: Request ACCESS_BACKGROUND_LOCATION with rationale
  - Handle partial permissions (foreground only) - disable geofencing, enable manual check-in
- [ ] Fix geofence event deduplication:
  - Store last event timestamp per geofence ID
  - Ignore events within 5-minute window of previous event
  - Prevent notification spam at boundary
- [ ] Wire geofence-to-habit linking:
  - When entering a geofence linked to a habit, show notification: "Time for [habit]?"
  - Notification action: "Complete" (marks habit done) / "Snooze" (reminds in 30 min)
- [ ] Fix error handling in geofence task:
  - Catch network errors during `recordLocationVisit()`
  - Queue failed visits for retry when online
  - Don't crash background task on error
- [ ] Wire LocationReminderScreen:
  - Show all active geofences on map
  - Allow adding new geofences (tap on map to set location + radius)
  - Link geofences to specific habits
  - Show visit history per geofence
- [ ] Add geofence suggestions from backend:
  - Backend detects frequent locations from visit history
  - Suggest creating geofence: "You visit [location] often. Link a habit?"
- [ ] Test on real devices:
  - iOS: Verify geofencing works when app is killed
  - Android: Verify with battery optimization enabled
  - Test with poor GPS accuracy

### Deliverables
- Background location permissions properly requested
- Geofencing works on iOS and Android in background
- Deduplicated notifications
- Map-based geofence management screen
- Habit-geofence linking

### Exit Criteria
Walk into gym → get "Time to work out?" notification → tap Complete → habit marked done.

---

## PHASE 15: EMOTIONAL CORE & REFLECTION WIRING
**Priority:** MEDIUM | **Effort:** 8-10 hours | **Risk if skipped:** 32% of backend wasted

### Tasks
- [ ] Fix MorningActivationScreen timing:
  - Remove strict 6am-12pm window
  - Show as first interaction of the day (regardless of time)
  - Add notification at user's preferred morning time
  - Persist that user completed morning activation today
- [ ] Fix EveningReflectionScreen:
  - Integrate MissedItemsReview component (from Phase 12)
  - Add gratitude journaling step
  - Add mood tracking step
  - Add "plan tomorrow" step (link to PlanTomorrowScreen)
  - Save reflection data to backend `/api/reflection/evening`
  - Mark day as "reflected" to prevent duplicate prompts
- [ ] Wire emotional state tracking:
  - Show mood picker on TodayScreen (morning and evening)
  - Track energy level, stress, motivation
  - Send to `/api/emotional/state` endpoint
  - Display on emotional dashboard
- [ ] Wire EmotionalDashboardScreen:
  - Show mood trends over time (line chart)
  - Show energy/stress/motivation trends
  - Correlate mood with habit completion rate
  - Show "You complete more habits when your mood is [X]"
- [ ] Wire morning briefing notifications:
  - Schedule daily notification at user's preferred time
  - Content: "Good morning [name]. Here's your plan for today."
  - Tap → opens MorningActivationScreen
- [ ] Wire evening reflection notifications:
  - Schedule daily notification at user's preferred evening time
  - Content: "Time to reflect on your day."
  - Tap → opens EveningReflectionScreen
- [ ] Add "skip today" option for both flows
- [ ] Persist emotional data for weekly/monthly insights

### Deliverables
- Morning activation works as first-of-day flow
- Evening reflection with missed items + gratitude + mood
- Emotional dashboard with trend charts
- Scheduled notifications for both flows

### Exit Criteria
User gets morning notification → opens activation → sees plan. Gets evening notification → reflects → sees missed items → journals gratitude.

---

## PHASE 16: FOCUS TIMER & BIOMETRIC INTEGRATION
**Priority:** MEDIUM | **Effort:** 6-8 hours | **Risk if skipped:** Core feature feels broken

### Tasks
- [ ] Fix FocusStore auto-stop race condition:
  - Remove auto-stop from store
  - Handle timer completion in FocusOrb component
  - Show completion animation when target reached
  - Prompt for reflection on completion
- [ ] Fix focus timer persistence:
  - If app crashes during session, restore timer state on reopen
  - Show "You had an active session" prompt with resume/discard options
- [ ] Add focus session to backend on completion:
  - Send: startTime, endTime, duration, task, interruptions
  - Display in InsightsScreen
- [ ] Fix FocusSessionReflection:
  - Show after every completed focus session
  - Collect: quality rating (1-5), flow state achieved (y/n), notes
  - Send to `/api/focus/sessions/:id/reflect`
- [ ] Wire biometric data display (Elite tier):
  - Fetch from `/api/biometric/dashboard`
  - Show HRV trend, sleep quality, stress level
  - Correlate with habit completion: "You complete 40% more habits after 7+ hours of sleep"
  - Placeholder UI if no biometric data connected
- [ ] Add HealthKit/Google Fit connection screen (Elite):
  - "Connect Health App" button in Settings
  - Explain what data is read (sleep, HRV, activity)
  - Placeholder: "Coming soon" if not yet implemented
- [ ] Fix countdown vs count-up confusion:
  - Rename timer display to show elapsed time clearly: "12:34 elapsed"
  - Show target duration separately: "of 25:00"
  - Visual progress ring showing completion percentage

### Deliverables
- Reliable focus timer with crash recovery
- Post-session reflection flow
- Biometric dashboard (Elite tier)
- Clear elapsed time display

### Exit Criteria
Start 25-min focus → app crashes at 12 min → reopen → "Resume session?" → continue from 12:00.

---

## PHASE 17: SOCIAL, VOICE & ADVANCED FEATURES
**Priority:** MEDIUM | **Effort:** 10-12 hours | **Risk if skipped:** Premium features incomplete

### Tasks
- [ ] Wire social accountability features:
  - Buddy search/add via `/api/social/buddies`
  - Show buddy's streak + completion rate
  - Send encouragement messages
  - "Accountability check" notifications
  - Gate behind Pro tier
- [ ] Wire voice interface:
  - Use expo-speech for text-to-speech
  - 5 personality modes from voiceService.ts
  - "Hey [name], you've completed 3 of 5 habits today"
  - Voice-powered habit completion: "Mark meditation as done"
  - Gate behind Elite tier
- [ ] Wire Sonic Pentagram (music rating):
  - Full track rating flow
  - Pentagram visualization with react-native-skia
  - Community pentagram comparison
  - Link to InsightsScreen
- [ ] Wire Data Vault:
  - Encrypted local backup (export to JSON)
  - Import from JSON backup
  - Share via system share sheet
  - Schedule automatic weekly backups
- [ ] Wire weather-aware suggestions:
  - Fetch weather via weatherService.ts
  - Correlate with habit completion patterns
  - "Rainy days you skip outdoor habits 60% more - try indoor alternatives"
  - Gate behind Pro tier
- [ ] Wire social sharing:
  - Share streak achievements to social media
  - Generate shareable image (react-native-view-shot)
  - "I completed a 30-day meditation streak on Habbit!"
- [ ] Wire marketplace:
  - Browse habit protocol templates
  - Download/install templates
  - Community-submitted protocols
  - Gate behind Pro/Elite tier

### Deliverables
- Social buddy system functional
- Voice interface for Elite users
- Sonic Pentagram complete
- Data vault export/import
- Weather correlation insights
- Social sharing cards
- Marketplace browsable

### Exit Criteria
Add a buddy → see their streaks. Voice says "Good morning." Export vault → import on new device → all data restored.

---

## PHASE 18: THEME SYSTEM, ACCESSIBILITY & POLISH
**Priority:** MEDIUM | **Effort:** 8-10 hours | **Risk if skipped:** Poor UX for some users, App Store rejection

### Tasks
- [ ] Implement PRIME theme (brutalist aesthetic):
  - Port Habit OS color palette (teal, purple, red, yellow, green)
  - Uppercase labels, high contrast, sharp corners
  - Monospace typography feel
  - Theme toggle in Settings
- [ ] Implement full theme switching:
  - Create `ThemeProvider` context
  - ICE theme (current glassmorphism)
  - PRIME theme (brutalist)
  - System theme (follow device dark/light mode)
  - Persist theme choice in appStore
- [ ] Add accessibility labels to ALL interactive elements:
  - Every Pressable, TouchableOpacity, Button
  - `accessibilityLabel`, `accessibilityRole`, `accessibilityHint`
  - Test with VoiceOver (iOS) and TalkBack (Android)
- [ ] Add dynamic font scaling support:
  - Use `allowFontScaling` appropriately
  - Test at 200% font size - nothing should overflow
- [ ] Add keyboard handling:
  - `Keyboard.dismiss()` on modal close
  - `KeyboardAvoidingView` on all screens with inputs
  - React Native Keyboard Controller (already installed) for smooth keyboard animations
- [ ] Add Android back button handling:
  - Custom `BackHandler` in screens where needed
  - Confirm before leaving unsaved changes
- [ ] Add haptic feedback:
  - `expo-haptics` on habit completion, achievement, timer complete
  - Light impact for taps, medium for completions, heavy for achievements
- [ ] Add deep linking configuration:
  - `habbit://habit/:id` - open specific habit
  - `habbit://today` - open today screen
  - `habbit://achievement/:id` - open achievement
  - Configure in app.json linking property
- [ ] Polish animations:
  - Smooth screen transitions with react-native-reanimated
  - Habit card completion animation (checkmark + color flash)
  - Focus orb pulsing animation
  - Achievement unlock animation
- [ ] Fix all console warnings and deprecation notices

### Deliverables
- Two working themes (ICE + PRIME)
- Full accessibility compliance
- Deep linking configured
- Haptic feedback on all interactions
- Polished animations

### Exit Criteria
VoiceOver can navigate entire app. Font size 200% = no overflow. Back button = predictable behavior.

---

## PHASE 19: CI/CD, MONITORING & PRE-RELEASE
**Priority:** HIGH | **Effort:** 10-12 hours | **Risk if skipped:** Can't ship safely

### Tasks
- [ ] **Set up GitHub Actions CI:**
  - `.github/workflows/ci.yml`
  - On push/PR: run backend tests, run mobile tests, typecheck both
  - Cache node_modules and bun lock
  - Fail PR if tests fail or typecheck errors
- [ ] **Set up EAS Build:**
  - `eas.json` with development, preview, production profiles
  - iOS: configure provisioning profiles, App Store Connect
  - Android: configure signing keystore
  - `eas build --platform all --profile production`
- [ ] **Set up EAS Submit:**
  - Configure App Store Connect API key
  - Configure Google Play Service Account
  - `eas submit --platform all`
- [ ] **Add Sentry error tracking:**
  - Install `@sentry/react-native`
  - Configure in App.tsx with DSN
  - Add source maps upload to EAS Build
  - Capture all unhandled errors
  - Add breadcrumbs for navigation events
- [ ] **Add analytics:**
  - expo-insights (already installed) for basic metrics
  - Track: screen views, habit completions, focus sessions, tier upgrades
  - Track: onboarding funnel (where users drop off)
  - Track: feature usage by tier
- [ ] **Backend monitoring:**
  - Health check endpoint (Phase 3)
  - Uptime monitoring (UptimeRobot or similar)
  - Database size monitoring
  - Error rate alerting
- [ ] **Pre-release checklist:**
  - [ ] All 80+ tests passing
  - [ ] TypeScript compiles with zero errors
  - [ ] No console.error() in production code
  - [ ] All secrets in environment variables (not committed)
  - [ ] App Store screenshots prepared
  - [ ] Privacy policy URL configured
  - [ ] Terms of service URL configured
  - [ ] App Store description written
  - [ ] RevenueCat products created in App Store Connect / Google Play Console
  - [ ] Backend deployed to production (Fly.io / Railway / etc.)
  - [ ] Production database migrated
  - [ ] CDN configured for uploaded files
  - [ ] Rate limiting verified in production

### Deliverables
- CI pipeline blocking bad PRs
- EAS Build producing signed binaries
- Sentry capturing production errors
- Analytics tracking user behavior
- Backend monitored with alerts

### Exit Criteria
Push to main → CI passes → EAS builds → Sentry connected → ready for TestFlight/Play Store internal testing.

---

## PHASE 20: BETA TEST, ITERATE & SHIP
**Priority:** FINAL | **Effort:** 2-4 weeks | **Risk if skipped:** Ship broken to public

### Tasks
- [ ] **Internal Alpha (Week 1):**
  - Deploy to TestFlight (iOS) and Internal Testing (Android)
  - Test on: iPhone SE, iPhone 15, Pixel 7, Samsung Galaxy S24
  - Test on: iOS 16, iOS 17, iOS 18, Android 13, Android 14
  - Complete full user journey: signup → onboarding → create habits → track for 3 days → insights
  - Document all bugs in GitHub Issues
  - Fix all P0/P1 bugs
- [ ] **Closed Beta (Week 2-3):**
  - Invite 20-50 beta testers
  - Collect feedback via in-app survey or Typeform
  - Monitor Sentry for crash-free rate (target: >99%)
  - Monitor analytics for onboarding completion rate (target: >70%)
  - Monitor analytics for Day 1 retention (target: >40%)
  - Fix UX issues based on feedback
  - A/B test pricing page if possible
- [ ] **Performance Audit:**
  - Profile app startup time (target: <2s to interactive)
  - Profile screen transitions (target: <300ms)
  - Profile memory usage (target: <150MB active)
  - Profile battery drain during geofencing
  - Optimize any bottlenecks found
- [ ] **App Store Preparation:**
  - Screenshots for 6.7" (iPhone 15 Pro Max), 6.1", 5.5"
  - Android screenshots for phone and tablet
  - App preview video (30 seconds)
  - Localized App Store description
  - Select categories: Health & Fitness (primary), Productivity (secondary)
  - Set age rating
  - Configure app privacy (data collection disclosure)
  - Set pricing and availability (free with IAP)
- [ ] **App Store Submission:**
  - Submit to App Store Review
  - Submit to Google Play Review
  - Respond to any review feedback/rejections
  - Common rejection reasons to pre-check:
    - Subscription must be manageable in Apple Settings
    - Must have "Restore Purchases" button
    - Must show subscription terms before paywall
    - Privacy policy must be accessible
    - Background location usage must be justified in description
- [ ] **Launch:**
  - Prepare launch announcement
  - Monitor Sentry for first 24 hours
  - Monitor server load
  - Be ready to hotfix (EAS Update for OTA patches)
  - Celebrate

### Deliverables
- Alpha tested on 8+ device configurations
- Beta tested with 20-50 real users
- Performance meets all targets
- App Store assets complete
- Successfully submitted and approved
- SHIPPED

### Exit Criteria
App live on App Store and Google Play. Crash-free rate >99%. Day 1 retention >40%.

---

## TIMELINE SUMMARY

| Phase | Name | Effort | Week |
|-------|------|--------|------|
| 1 | Security Lockdown | 4-6h | 1 |
| 2 | Database Hardening | 6-8h | 1 |
| 3 | Backend Error Handling | 8-10h | 1-2 |
| 4 | Auth & Session Management | 6-8h | 2 |
| 5 | Test Infrastructure | 12-16h | 2-3 |
| 6 | API Type Safety | 8-10h | 3 |
| 7 | State Persistence & Offline | 8-10h | 3-4 |
| 8 | Mobile Error Handling | 8-10h | 4 |
| 9 | Component Decomposition | 10-12h | 4-5 |
| 10 | Onboarding Fixes | 6-8h | 5 |
| 11 | Achievements & Gamification | 8-10h | 5-6 |
| 12 | Adaptive Intelligence UI | 10-12h | 6-7 |
| 13 | Subscription Hardening | 6-8h | 7 |
| 14 | Location & Geofencing | 8-10h | 7-8 |
| 15 | Emotional Core & Reflection | 8-10h | 8-9 |
| 16 | Focus Timer & Biometrics | 6-8h | 9 |
| 17 | Social, Voice & Advanced | 10-12h | 9-10 |
| 18 | Theme, Accessibility & Polish | 8-10h | 10-11 |
| 19 | CI/CD & Monitoring | 10-12h | 11-12 |
| 20 | Beta Test & Ship | 2-4 weeks | 12-16 |

**Total estimated engineering effort:** ~160-190 hours
**Total calendar time:** ~16 weeks (4 months) with 1 full-time engineer

---

## DEPENDENCY GRAPH

```
Phase 1 (Security) ─────┐
Phase 2 (Database) ──────┤
                         ├→ Phase 3 (Backend Errors) → Phase 5 (Tests)
Phase 4 (Auth) ──────────┤                                    │
                         │                                    ▼
                         ├→ Phase 6 (Type Safety) ──→ Phase 7 (State Persistence)
                         │                                    │
                         │                                    ▼
                         │                           Phase 8 (Mobile Errors)
                         │                                    │
                         │                                    ▼
                         ├→ Phase 9 (Components) ───→ Phase 10 (Onboarding)
                         │                                    │
                         │            ┌───────────────────────┤
                         │            ▼                       ▼
                         ├→ Phase 11 (Achievements)   Phase 12 (Adaptive AI)
                         │            │                       │
                         │            ▼                       ▼
                         ├→ Phase 13 (Subscriptions)  Phase 14 (Location)
                         │                                    │
                         │            ┌───────────────────────┤
                         │            ▼                       ▼
                         ├→ Phase 15 (Emotional)      Phase 16 (Focus Timer)
                         │            │                       │
                         │            └───────────┬───────────┘
                         │                        ▼
                         ├→ Phase 17 (Advanced Features)
                         │                        │
                         │                        ▼
                         └→ Phase 18 (Polish) → Phase 19 (CI/CD) → Phase 20 (Ship)
```

**Parallelizable pairs:**
- Phases 1+2 (both infrastructure, no overlap)
- Phases 11+12 (different feature domains)
- Phases 14+15 (different feature domains)
- Phases 15+16 (different feature domains)

---

*This plan transforms Habbit from a 5.1/10 prototype into a production-grade, App Store-ready product.*
