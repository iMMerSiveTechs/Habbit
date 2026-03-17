import { db } from "./db";

export type Tier = "free" | "preview" | "core" | "pro" | "elite";

// Tier hierarchy: higher index = more access
const TIER_LEVELS: Record<string, number> = {
  free: 0,
  preview: 0,
  core: 1,
  pro: 2,
  elite: 3,
};

// Free tier limits
export const FREE_LIMITS = {
  maxHabits: 5,
  maxTodos: 10,
  maxGeofences: 0,
  maxReminders: 0,
  maxFocusSessions: 3, // per day
};

export const CORE_LIMITS = {
  maxHabits: 999999, // effectively unlimited (matches UI promise)
  maxTodos: 999999, // effectively unlimited (matches UI promise)
  maxGeofences: 3,
  maxReminders: 5,
  maxFocusSessions: -1, // unlimited
};

// Pro and Elite are unlimited
export const PRO_LIMITS = {
  maxHabits: -1,
  maxTodos: -1,
  maxGeofences: -1,
  maxReminders: -1,
  maxFocusSessions: -1,
};

export function getTierLevel(tier: string): number {
  return TIER_LEVELS[tier] ?? 0;
}

export function meetsMinimumTier(userTier: string, requiredTier: Tier): boolean {
  return getTierLevel(userTier) >= getTierLevel(requiredTier);
}

export function getLimits(tier: string) {
  const level = getTierLevel(tier);
  if (level >= 2) return PRO_LIMITS;
  if (level >= 1) return CORE_LIMITS;
  return FREE_LIMITS;
}

// Helper: get profile and check tier in one call
export async function getProfileWithTierCheck(
  userId: string,
  requiredTier: Tier,
): Promise<{ allowed: boolean; profile: any; tier: string; message?: string }> {
  const profile = await db.profile.findUnique({
    where: { userId },
  });

  if (!profile) {
    return { allowed: false, profile: null, tier: "free", message: "Profile not found" };
  }

  const userTier = profile.subscriptionTier || "free";

  if (!meetsMinimumTier(userTier, requiredTier)) {
    const tierNames: Record<string, string> = {
      core: "Core",
      pro: "Pro",
      elite: "Elite",
    };
    return {
      allowed: false,
      profile,
      tier: userTier,
      message: `This feature requires ${tierNames[requiredTier] || requiredTier} or higher. Upgrade in Settings.`,
    };
  }

  return { allowed: true, profile, tier: userTier };
}
