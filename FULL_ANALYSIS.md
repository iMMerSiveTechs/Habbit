# HABBIT - Complete Application Analysis Report

> Generated: 2026-03-17 | Analyst: Claude Opus 4.6 | 259 files analyzed

---

## 1. WHAT IS HABBIT?

Habbit is a **comprehensive, AI-powered habit tracking and personal productivity system** built with React Native (Expo SDK 53) on the frontend and Hono.js + Prisma + SQLite on the backend. It features a 4-tier subscription model (Preview/Core/Pro/Elite) with RevenueCat integration.

### Core Feature Set

| Phase | Feature | Status |
|-------|---------|--------|
| 1 | Habit CRUD with streaks, colors, categories | ✅ Complete |
| 1 | Focus timer (count-up Pomodoro) | ✅ Complete |
| 1 | Daily AI briefing (Claude-powered) | ✅ Complete |
| 1 | 4-tier subscription (RevenueCat) | ✅ Complete |
| 2 | Cerebra AI coach | ✅ Backend, ⚠️ Partial UI |
| 2 | Biometric integration (HRV, sleep, stress) | ✅ Backend, ❌ UI not wired |
| 2 | Social accountability (buddy system) | ✅ Backend, ⚠️ Partial UI |
| 2 | Voice interface (5 personality modes) | ✅ Backend, ❌ UI not wired |
| 3 | Location geofencing | ✅ Backend, ⚠️ Service exists, UI partial |
| 3 | ML pattern learning | ✅ Backend only |
| 3 | Location-mood correlation | ✅ Backend only |
| Bonus | Sonic Pentagram (music rating) | ✅ Full stack |
| Bonus | Emotional Core (morning/evening flows) | ✅ Backend, ⚠️ 32% wired |
| Bonus | Achievement celebration system | ✅ UI built, ❌ Never triggered |

### Tech Stack

**Mobile:** React Native 0.79.2, Expo 53, TypeScript 5.8.3, Zustand 5, React Query 5, Nativewind, RevenueCat, Expo Location/Notifications/Camera

**Backend:** Hono 4.6.0, Prisma 6.17.1, SQLite, Better Auth 1.3.24, Zod 4.1.11, Bun runtime, Anthropic Claude API

---

## 2. TEST COVERAGE: ZERO

**No test files exist anywhere in the codebase.**

- No `.test.ts`, `.test.tsx`, `.spec.ts`, `.spec.tsx` files
- No `__tests__/` directories
- No test runner configured (no Jest, Vitest, or Testing Library)
- No test scripts in either `package.json`
- No CI/CD pipeline configuration

### What Needs Testing (Priority Order)

| Priority | Area | Suggested Framework | Estimated Tests |
|----------|------|-------------------|-----------------|
| P0 | Streak calculator (backend + mobile) | Vitest | 20+ |
| P0 | Auth flow (login/logout/session expiry) | Vitest + supertest | 15+ |
| P0 | Habit CRUD API routes | Vitest + supertest | 25+ |
| P0 | Subscription tier gating | Vitest | 10+ |
| P1 | Todo CRUD with subtasks | Vitest + supertest | 20+ |
| P1 | Focus session lifecycle | Vitest | 10+ |
| P1 | Zustand stores (habits, todos, focus) | Vitest | 15+ |
| P1 | API client error handling (401, network) | Vitest | 10+ |
| P2 | Navigation flow (onboarding gates) | React Native Testing Library | 10+ |
| P2 | Component rendering (habit card, todo) | React Native Testing Library | 20+ |
| P2 | Geofence event handling | Vitest | 10+ |
| P3 | AI service integration | Vitest (mocked) | 5+ |
| P3 | Data export service | Vitest | 5+ |
| P3 | Notification service | Vitest | 5+ |

**Estimated total: 180+ tests needed for reasonable coverage**

---

## 3. CRITICAL ERRORS & BUGS

### 3.1 SECURITY (8 Critical Issues)

| # | Issue | File | Severity |
|---|-------|------|----------|
| S1 | **Exposed API keys in .env** (BETTER_AUTH_SECRET, ANTHROPIC_API_KEY committed to git) | backend/.env | 🔴 CRITICAL |
| S2 | **CORS allows all origins in dev** with no fallback guard | backend/src/index.ts:43-67 | 🔴 HIGH |
| S3 | **File upload validates MIME only** (spoofable), no magic byte check | backend/src/routes/upload.ts:30-93 | 🟡 MEDIUM |
| S4 | **No CSRF protection** on state-changing operations | All POST/PUT/DELETE routes | 🟡 MEDIUM |
| S5 | **EXPO_PUBLIC_ prefix on API key** suggests client exposure | backend/src/routes/ai.ts:70-72 | 🟡 MEDIUM |
| S6 | **No rate limiting on auth endpoints** (100 req/min too generous for brute force) | backend/src/index.ts:71 | 🟡 MEDIUM |
| S7 | **Admin setup token not rotatable** | backend/src/routes/admin.ts:76-89 | 🟡 MEDIUM |
| S8 | **Missing authorization on resource access** (buddy ID enumeration possible) | backend/src/routes/social.ts | 🟡 MEDIUM |

### 3.2 LOGIC BUGS (12 Issues)

| # | Issue | File | Impact |
|---|-------|------|--------|
| L1 | **Achievement loop broken** - no auto-creation when milestones hit, celebration screen unreachable | mobile/src/screens/ | User never sees achievements |
| L2 | **Goal never persisted** - ProfileSetupScreen captures bigGoal but never calls createUserGoal() | mobile/src/screens/ProfileSetupScreen.tsx | Goal disappears after onboarding |
| L3 | **User deletion misses 5+ relation tables** (MissedItem, SkipPattern, AdaptiveNotification, LocationPattern, LocationMoodMap) | backend/src/routes/user.ts:53-120 | Orphaned data in DB |
| L4 | **Background location never requested** - only foreground permissions asked, geofencing fails on iOS | mobile/src/screens/LocationOnboardingScreen.tsx | Geofencing broken |
| L5 | **Tier guard silent downgrade** - unknown tier strings default to free (level 0) | backend/src/tierGuard.ts:40-42 | Users lose access silently |
| L6 | **FocusStore auto-stop race condition** - store stops timer, component may be out of sync | mobile/src/state/focusStore.ts:42 | Timer UI inconsistency |
| L7 | **Morning/evening prompts time-gated** - only 6am-12pm / 8pm-12am, users miss prompts outside windows | mobile/src/screens/TodayScreenConnected.tsx | Features invisible to many users |
| L8 | **No graceful logout** - logoutUser() doesn't clear appStore (userName, tier persist) | mobile/src/screens/SettingsScreen.tsx | Stale user data after logout |
| L9 | **Habit targetCount accepts negative/zero** - no validation on input | backend/src/routes/habits.ts:118 | Impossible completion logic |
| L10 | **Biometric values unbounded** - sleepHours could be 999999 | backend/src/routes/biometric.ts:7-18 | Data corruption |
| L11 | **RevenueCat tier sync fire-and-forget** - backend sync can fail silently after purchase | mobile/src/hooks/useSubscription.ts | Tier mismatch client/server |
| L12 | **Session expiry not proactively checked** - only discovered on next failed API call | mobile/src/lib/api.ts | Stale session, silent failures |

### 3.3 MISSING ERROR HANDLING (7 Issues)

| # | Issue | File |
|---|-------|------|
| E1 | **No try-catch in most async route handlers** - unhandled rejections crash server | All backend routes |
| E2 | **No error states in screens** - failed API calls show empty lists, not error UI | All mobile screens |
| E3 | **No retry logic for failed API calls** | mobile/src/lib/api.ts |
| E4 | **Error boundaries missing on modal screens** - modal crash = app crash | mobile/src/navigation/RootNavigator.tsx |
| E5 | **No API request timeout** - hung requests wait indefinitely | mobile/src/lib/api.ts |
| E6 | **No error recovery for geofence events** during network failure | mobile/src/services/geofenceService.ts |
| E7 | **Silent failures** - some endpoints return empty arrays instead of error codes | backend/src/routes/biometric.ts:96 |

---

## 4. PERFORMANCE ISSUES

### 4.1 Backend Performance

| # | Issue | File | Fix |
|---|-------|------|-----|
| P1 | **Unbounded queries** - `findMany()` with no `.take()` limit on habits, todos, locations | Multiple routes | Add pagination (limit/offset) |
| P2 | **N+1 queries** - habits loaded with all events included | backend/src/routes/cerebra.ts:40-63 | Use explicit select/limit |
| P3 | **Unbounded in-memory cache** - tier cache Map grows without limit | backend/src/routes/subscription.ts:34-48 | Use LRU cache or Redis |
| P4 | **Missing database indexes** on `profile.subscriptionTier`, `habit.profileId+archived`, `todo.profileId+completed` | backend/prisma/schema.prisma | Add composite indexes |
| P5 | **SQLite for production** - single-writer bottleneck, no concurrent writes | Architecture | Migrate to PostgreSQL |

### 4.2 Mobile Performance

| # | Issue | File | Fix |
|---|-------|------|-----|
| P6 | **TodayScreenConnected is 857 lines** with 11+ useState hooks, no memoization | TodayScreenConnected.tsx | Split into sub-components with React.memo |
| P7 | **No optimistic updates** - all mutations await server response | HabitsScreenConnected, TodosScreen | Update local state immediately, rollback on error |
| P8 | **Inline styles recreated every render** (LinearGradient colors, style objects) | Multiple screens | useMemo for static arrays, StyleSheet.create |
| P9 | **No list virtualization** for habits/todos - all items rendered at once | HabitsScreenConnected, TodosScreen | Use FlatList with initialNumToRender |
| P10 | **Multiple parallel API calls on mount** without loading coordination | TodayScreenConnected.tsx | Use React Query with suspense or loading skeleton |
| P11 | **Search/filter not debounced** - potential API call per keystroke | HabitsScreenConnected | Debounce 300-500ms |
| P12 | **Focus timer setInterval in useEffect** - potential leak if deps change | TodayScreenConnected.tsx | Clean up interval properly |

---

## 5. ARCHITECTURE ISSUES

### 5.1 State Management Gaps

| Issue | Impact |
|-------|--------|
| **habitsStore, todosStore, focusStore not persisted** | Data lost on app restart; flash of empty state |
| **appStore persisted but not cleared on logout** | Stale user data leaks between accounts |
| **No offline queue** | offlineApi.ts and offlineSyncService.ts exist but are unused |
| **Zustand stores use `any` types** for API responses | No type safety on state shape |

### 5.2 Code Organization

| Issue | Impact |
|-------|--------|
| **No test infrastructure** | Zero confidence in correctness |
| **Monolithic screen components (800+ lines)** | Hard to test, maintain, review |
| **Duplicate API client patterns** (api.ts, habitApi.ts, todosApi.ts, reflectionApi.ts, scheduleApi.ts) | Inconsistent error handling |
| **Mixed auth patterns** (`c.get("user")` vs `c.get("session")`) across routes | Confusion, potential auth bypass |
| **Tier gating inconsistent** - some routes check, some don't | Free users may access premium features |
| **No structured logging** - only console.log | Can't debug production issues |

### 5.3 Missing Infrastructure

- No CI/CD pipeline
- No monitoring/alerting
- No structured error tracking (Sentry, Bugsnag)
- No analytics/telemetry
- No deep linking configuration
- No Android back button handling
- No Apple HealthKit/Google Fit integration (planned)
- No push notification scheduling (service exists, not wired)

---

## 6. WHAT THE APP STILL NEEDS

### Tier 1 - Ship Blockers (Must fix before any release)

1. **Remove .env from version control** and rotate all secrets
2. **Add error boundaries** to all modal/stack screens
3. **Wire the achievement system** - auto-create achievements on milestones
4. **Fix background location permissions** for iOS geofencing
5. **Add basic error states** to all screens (retry button on failure)
6. **Fix user deletion** to cascade all relations
7. **Add input validation** (habit targetCount, biometric ranges)
8. **Add API request timeouts** (10s default)

### Tier 2 - Production Readiness

9. **Add test infrastructure** - Vitest for backend, RNTL for mobile
10. **Write 50+ critical path tests** (auth, habits CRUD, streaks, tier gating)
11. **Add pagination** to all list endpoints
12. **Persist Zustand stores** (habits, todos, focus) with AsyncStorage
13. **Implement optimistic updates** for habit/todo completion
14. **Add loading skeletons** to all data-dependent screens
15. **Clear appStore on logout** to prevent data leakage
16. **Add structured logging** (pino or winston) to backend
17. **Fix morning/evening prompt visibility** - add persistent indicator + notification fallback
18. **Wire the onboarding goal** to actually persist via API

### Tier 3 - Quality & Polish

19. **Split monolithic screens** - TodayScreenConnected should be 5+ components
20. **Add React.memo** to list item components
21. **Debounce search/filter inputs**
22. **Add accessibility labels** to all interactive elements
23. **Implement offline queue** (offlineSyncService exists, just needs wiring)
24. **Add Sentry/Bugsnag** error tracking
25. **Type all API responses** with Zod schemas from contracts.ts
26. **Migrate to PostgreSQL** for production scalability

### Tier 4 - Feature Completion

27. Wire biometric integration to UI
28. Wire voice interface to UI
29. Complete social features UI
30. Implement the PRIME theme option
31. Add deep linking
32. Add CI/CD pipeline
33. Implement RevenueCat webhook for subscription status sync
34. Add Apple HealthKit/Google Fit auto-sync

---

## 7. SCORES

| Category | Score | Notes |
|----------|-------|-------|
| **Architecture** | 7/10 | Good separation, proper TypeScript, shared contracts. SQLite limits scalability. |
| **Code Quality** | 5/10 | No tests, monolithic components, inconsistent patterns, `any` types in API layer |
| **Security** | 3/10 | Exposed secrets, no CSRF, weak upload validation, missing auth checks |
| **Performance** | 5/10 | Unbounded queries, no pagination, N+1 patterns, no memoization |
| **Feature Completeness** | 6/10 | Backend 90% done, UI 85% done, actual wiring only 32% |
| **Production Readiness** | 2/10 | No tests, no monitoring, no CI/CD, exposed secrets |
| **UX/Design** | 8/10 | Beautiful glassmorphism Obsidian ICE theme, thoughtful component library |
| **Overall** | 5.1/10 | Ambitious, well-designed, but needs significant hardening before release |

---

## 8. ROOT App.js vs Extracted App

The repository contains **two implementations**:

1. **App.js** (root) - Standalone Habit OS v1.1, local-first, 750 lines, fully offline, has Protocol system + Integrity scoring
2. **extracted_app/** - Full cloud-powered Vibecode app, 259 files, 60+ API endpoints, AI-powered

**Recommendation from ANALYSIS.md**: Port Habit OS patterns (Protocol progression, Integrity score, TimeSystem, Command Deck, PRIME theme, Local Mode) into Vibecode. Offer both "fast local" and "smart cloud" modes.

---

*End of analysis. 259 files. 0 tests. 40+ issues identified. 34 action items recommended.*
