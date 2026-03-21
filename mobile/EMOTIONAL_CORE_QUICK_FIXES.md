# EMOTIONAL CORE SYSTEM - QUICK FIXES GUIDE

## Overview
This document provides code snippets and step-by-step instructions to fix the 5 critical integration gaps. Total estimated time: 2-3 hours.

---

## QUICK FIX #1: Achievement Celebration Loop (30 minutes)

### Step 1: Add Backend Endpoint
**File:** `backend/src/routes/emotional.ts`

Add this endpoint after the celebrate route (around line 363):

```typescript
.post("/achievements/create", zValidator("json", z.object({
  type: z.enum(["first_completion", "7_day_streak", "30_day_streak", "90_day_streak", "morning_stack_complete", "focus_master", "consistency_king"]),
  title: z.string(),
  description: z.string(),
  habitId: z.string().optional(),
})), async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  const data = c.req.valid("json");

  const achievement = await db.achievement.create({
    data: {
      profileId: profile.id,
      type: data.type,
      title: data.title,
      description: data.description,
      habitId: data.habitId,
      celebrated: false,
      unlockedAt: new Date(),
    },
  });

  return c.json({ achievement });
})
```

### Step 2: Add API Client Method
**File:** `src/lib/habitApi.ts`

Add after line 410:

```typescript
async createAchievement(data: {
  type: string;
  title: string;
  description: string;
  habitId?: string;
}) {
  const response = await fetch(`${API_URL}/api/emotional/achievements/create`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Failed to create achievement");
  return response.json();
},
```

### Step 3: Wire Up Achievement Detection in Habits Screen
**File:** `src/screens/HabitsScreenConnected.tsx`

Import at top:
```typescript
import { achievementService } from "@/services/achievementService";
```

In `handleCompleteHabit()` function, after line 90 (after success haptic):

```typescript
// Check for achievements
try {
  const achievement = await achievementService.checkHabitCompletionAchievement(habitId, habit.title);
  if (achievement) {
    await api.createAchievement(achievement);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(() => {
      navigation.navigate("AchievementCelebration", { achievement });
    }, 500);
  }
} catch (error) {
  console.log("Achievement check failed:", error);
}
```

### Step 4: Fix Achievement Service Method Name
**File:** `src/services/achievementService.ts`

The method is called `checkHabitCompletionAchievements` but should return correctly. Update line 177-188 to actually create via API:

```typescript
async createAchievement(trigger: AchievementTrigger): Promise<void> {
  try {
    console.log("Creating achievement:", trigger);
    await api.createAchievement(trigger);
  } catch (error) {
    console.error("Failed to create achievement:", error);
  }
}
```

**Status:** ✅ Achievement loop complete

---

## QUICK FIX #2: Save User Goal (15 minutes)

### Step 1: Update ProfileSetupScreen
**File:** `src/screens/ProfileSetupScreen.tsx`

Replace `handleComplete()` function (lines 61-79) with:

```typescript
const handleComplete = async () => {
  // Save profile data
  setUserName(name);

  // Save goal to backend
  try {
    await api.createUserGoal({
      purpose: bigGoal,
      identity: `Becoming a person who ${focusAreas.join(", ")}`,
      bigWhy: bigGoal,
    });
  } catch (error) {
    console.log("Failed to save goal:", error);
  }

  const profileData = {
    name,
    energyTime,
    focusAreas,
    commitment,
    bigGoal,
  };
  console.log("Profile data:", profileData);

  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

  // Complete onboarding and go to main app
  completeOnboarding();
  navigation.replace("Tabs", { screen: "TodayTab" });
};
```

**Status:** ✅ Goal now saved to database

---

## QUICK FIX #3: Show Achievement on App Start (20 minutes)

### Step 1: Update TodayScreenConnected
**File:** `src/screens/TodayScreenConnected.tsx`

In the `useEffect` hook that calls `loadEmotionalDashboard()` (around line 33-39), update:

```typescript
useEffect(() => {
  loadBriefing();
  loadCerebraMessage();
  loadHabits();
  loadTodos();
  loadEmotionalDashboard();
  checkForUncelebratedAchievement(); // Add this
}, []);

// Add this new function
const checkForUncelebratedAchievement = async () => {
  try {
    const response = await api.getUncelebratedAchievement();
    if (response.achievement) {
      // Delay to ensure screen is mounted
      setTimeout(() => {
        navigation.navigate("AchievementCelebration", {
          achievement: response.achievement,
        });
      }, 500);
    }
  } catch (error) {
    console.log("No uncelebrated achievements");
  }
};
```

**Status:** ✅ Achievements now show on app start

---

## QUICK FIX #4: Display Goal on Today Screen (20 minutes)

### Step 1: Update TodayScreenConnected to Display Goal
**File:** `src/screens/TodayScreenConnected.tsx`

After the Identity Statement card (around line 260), add:

```typescript
{/* User Goal Display */}
{emotionalDashboard?.goal && (
  <GlassCard className="mx-5 mb-5 p-5 bg-gradient-to-br from-cyan-500/10 to-magenta-500/10 border border-cyan-500/20">
    <View className="items-center">
      <Text className="text-cyan-400 text-xs font-bold tracking-widest mb-2">YOUR WHY</Text>
      <Text className="text-white text-lg font-semibold text-center leading-relaxed">
        {emotionalDashboard.goal.purpose}
      </Text>
      {emotionalDashboard.goal.bigWhy && (
        <Text className="text-white/60 text-sm text-center mt-3 italic">
          "{emotionalDashboard.goal.bigWhy}"
        </Text>
      )}
    </View>
  </GlassCard>
)}
```

**Status:** ✅ Goal now visible on Today screen

---

## QUICK FIX #5: Improve Prompt Visibility (30 minutes)

### Step 1: Always Show Status Indicator
**File:** `src/screens/TodayScreenConnected.tsx`

Replace the morning/evening prompt sections (lines 196-248) with:

```typescript
{/* Morning Activation Status */}
<GlassCard className="mx-5 mb-5 p-5">
  <View className="flex-row items-center justify-between">
    <View className="flex-row items-center flex-1">
      <View className="bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full p-3 mr-4">
        <Text className="text-2xl">🌅</Text>
      </View>
      <View className="flex-1">
        <Text className="text-white font-bold text-lg mb-1">Start Your Morning</Text>
        <Text className="text-white/60 text-sm">
          {emotionalDashboard?.intention ? "Intention set ✓" : "Set your intention for the day"}
        </Text>
      </View>
    </View>
    {!emotionalDashboard?.intention && shouldShowMorningPrompt() && (
      <View className="bg-cyan-500/20 px-3 py-1 rounded-full">
        <Text className="text-cyan-400 text-xs font-bold">NEW</Text>
      </View>
    )}
    {emotionalDashboard?.intention && (
      <Text className="text-cyan-400 text-sm font-semibold">DONE</Text>
    )}
  </View>
  {!emotionalDashboard?.intention && (
    <Pressable
      onPress={() => {
        navigation.navigate("MorningActivation");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }}
      className="mt-3 bg-white/10 p-2 rounded-lg active:bg-white/20"
    >
      <Text className="text-cyan-400 font-semibold text-center">Set Intention</Text>
    </Pressable>
  )}
</GlassCard>

{/* Similar for Evening Reflection */}
<GlassCard className="mx-5 mb-5 p-5">
  <View className="flex-row items-center justify-between">
    <View className="flex-row items-center flex-1">
      <View className="bg-gradient-to-r from-violet-500 to-magenta-500 rounded-full p-3 mr-4">
        <Text className="text-2xl">🌙</Text>
      </View>
      <View className="flex-1">
        <Text className="text-white font-bold text-lg mb-1">Reflect on Your Day</Text>
        <Text className="text-white/60 text-sm">
          {emotionalDashboard?.reflection ? "Reflection saved ✓" : "Capture wins and insights"}
        </Text>
      </View>
    </View>
    {!emotionalDashboard?.reflection && shouldShowEveningPrompt() && (
      <View className="bg-violet-500/20 px-3 py-1 rounded-full">
        <Text className="text-violet-400 text-xs font-bold">READY</Text>
      </View>
    )}
    {emotionalDashboard?.reflection && (
      <Text className="text-violet-400 text-sm font-semibold">DONE</Text>
    )}
  </View>
  {!emotionalDashboard?.reflection && (
    <Pressable
      onPress={() => {
        navigation.navigate("EveningReflection");
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }}
      className="mt-3 bg-white/10 p-2 rounded-lg active:bg-white/20"
    >
      <Text className="text-violet-400 font-semibold text-center">Start Reflection</Text>
    </Pressable>
  )}
</GlassCard>
```

**Status:** ✅ Prompts always visible with status

---

## DEPLOYMENT CHECKLIST

### Phase 1: Backend (15 minutes)
- [ ] Add achievement create endpoint to `emotional.ts`
- [ ] Test endpoint with Postman/REST client
- [ ] Verify database inserts correctly

### Phase 2: Frontend API (10 minutes)
- [ ] Add createAchievement() method to habitApi.ts
- [ ] Verify method signature matches backend
- [ ] Test API call

### Phase 3: Habits Integration (15 minutes)
- [ ] Import achievementService in HabitsScreenConnected
- [ ] Add achievement check after habit completion
- [ ] Test with 7-day streak habit
- [ ] Verify navigation to celebration screen

### Phase 4: Goal Saving (10 minutes)
- [ ] Update ProfileSetupScreen handleComplete()
- [ ] Verify goal saves on onboarding completion
- [ ] Check database for saved goal

### Phase 5: Today Screen (25 minutes)
- [ ] Add checkForUncelebratedAchievement() function
- [ ] Add goal display card
- [ ] Update prompt visibility cards
- [ ] Test all three displays

### Phase 6: Testing (15 minutes)
- [ ] Test morning intention flow
- [ ] Test evening reflection flow
- [ ] Test achievement celebration on 7-day streak
- [ ] Test goal display on Today screen
- [ ] Test identity statement rotation

---

## TESTING COMMANDS

### Test Achievement Creation
```typescript
// In browser console or Postman
POST /api/emotional/achievements/create
{
  "type": "7_day_streak",
  "title": "One Week Strong",
  "description": "7 days of consistency",
  "habitId": "habit-id-here"
}
```

### Test Goal Creation
```typescript
// In browser console
POST /api/emotional/goal
{
  "purpose": "Build better habits",
  "identity": "Someone who shows up",
  "bigWhy": "To create lasting change"
}
```

---

## EXPECTED RESULTS AFTER FIXES

### ✅ Achievement Celebration Works
- Complete habit 7 days in a row
- See confetti celebration on app
- Identity statement displays
- Achievement marked as celebrated

### ✅ Goal Saved and Displayed
- Set goal during onboarding
- Goal persists in database
- Goal displays on Today screen
- Goal references in flows

### ✅ Prompts Always Visible
- Status cards show always (not just in time windows)
- Show "NEW", "READY", or "DONE" badges
- Can still trigger flows anytime
- Notifications work when app closed

### ✅ Dashboard Complete
- All emotional data loaded and used
- Goal visible
- Intention/reflection status shown
- Uncelebrated achievements trigger celebration

---

## ROLLBACK PLAN

If something breaks:

1. **Backend endpoint fails:** Remove the POST endpoint, revert emotional.ts
2. **Frontend crashes:** Comment out new code in HabitsScreenConnected and TodayScreenConnected
3. **Goal saving fails:** Comment out api.createUserGoal() call in ProfileSetupScreen
4. **Achievement nav fails:** Remove navigation.navigate() from achievement check

All changes are isolated and can be rolled back independently.

---

## TOTAL TIME ESTIMATE

- Backend setup: 15 min
- Frontend API: 10 min
- Habits integration: 15 min
- Goal saving: 10 min
- Today screen updates: 25 min
- Testing: 15 min

**Total: 90 minutes for all fixes**

---

**Status: Ready to implement!**
