// Pricing configuration - matches RevenueCat product structure
// Tiers: Preview (free) -> Core ($8.99/mo) -> Pro ($13.99/mo) -> Elite ($21.99/mo)

export const RC_DEFAULT_OFFERING_ID = "default";

/** App legal URLs */
export const PRIVACY_POLICY_URL = "https://docs.google.com/document/d/19yeXgkDZ2WP4N3SpKb7wyOb3Ar4_SJhLPdzJpW_TlWs/view?usp=sharing";
export const TERMS_OF_SERVICE_URL = "https://docs.google.com/document/d/17meUk5SNoVh0jY6mzxd24Rcmmw15SqVMRWYqJAc201Q/view?usp=sharing";

export type SubscriptionTier = "preview" | "core" | "pro" | "elite";

export const TIER_HIERARCHY: Record<SubscriptionTier, number> = {
  preview: 0,
  core: 1,
  pro: 2,
  elite: 3,
};

export function meetsMinimumTier(
  userTier: SubscriptionTier,
  requiredTier: SubscriptionTier,
): boolean {
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier];
}

export interface TierConfig {
  tier: SubscriptionTier;
  price: number;
  displayName: string;
  tagline: string;
  packageIdentifier: string;
  entitlementId: string;
  limits: {
    maxHabits: number;
    maxTodos: number;
  };
  features: string[];
}

export const TIERS: Record<SubscriptionTier, TierConfig> = {
  preview: {
    tier: "preview",
    price: 0,
    displayName: "Preview",
    tagline: "Start your route — free",
    packageIdentifier: "",
    entitlementId: "",
    limits: {
      maxHabits: 3,
      maxTodos: 3,
    },
    features: [
      "Up to 3 habits, 3 todos",
      "Basic habit tracking & streaks",
      "Daily Route Map view",
      "Time-based reminders",
    ],
  },
  core: {
    tier: "core",
    price: 8.99,
    displayName: "Core",
    tagline: "Unlock your full route",
    packageIdentifier: "$rc_monthly",
    entitlementId: "core",
    limits: {
      maxHabits: -1,
      maxTodos: -1,
    },
    features: [
      "Unlimited habits and todos",
      "Calendar & progress views",
      "Protocol routes (pre-built 30-day plans)",
      "Data export (CSV/JSON)",
      "Focus timer & deep work tracking",
      "XP and integrity system",
    ],
  },
  pro: {
    tier: "pro",
    price: 13.99,
    displayName: "Pro",
    tagline: "Your AI accountability partner",
    packageIdentifier: "$rc_custom_pro_monthly",
    entitlementId: "pro",
    limits: {
      maxHabits: -1,
      maxTodos: -1,
    },
    features: [
      "Everything in Core",
      "Cerebra AI Coach (Claude-powered)",
      "Location intelligence & geofencing",
      "Advanced analytics & patterns",
      "Smart adaptive notifications",
      "Flow state & energy tracking",
      "Morning/Evening reflection AI",
    ],
  },
  elite: {
    tier: "elite",
    price: 21.99,
    displayName: "Elite",
    tagline: "Total cognitive optimization",
    packageIdentifier: "$rc_custom_elite_monthly",
    entitlementId: "elite",
    limits: {
      maxHabits: -1,
      maxTodos: -1,
    },
    features: [
      "Everything in Pro",
      "Predictive intelligence engine",
      "Custom voice profiles",
      "Priority AI (faster, longer context)",
      "Unlimited conversation history",
    ],
  },
};

// Feature -> minimum tier required
export const FEATURE_TIER_REQUIREMENTS: Record<string, SubscriptionTier> = {
  unlimitedHabits: "core",
  unlimitedTodos: "core",
  calendarView: "core",
  marketplace: "core",
  dataExport: "core",
  focusTimer: "core",
  xpSystem: "core",
  cerebraAI: "pro",
  locationIntelligence: "pro",
  advancedAnalytics: "pro",
  adaptiveNotifications: "pro",
  flowStateTracking: "pro",
  morningEvening: "pro",
  patternDetection: "pro",
  weeklyInsights: "pro",
  imageTaskExtraction: "pro",
  predictiveIntelligence: "elite",
  customVoiceProfiles: "elite",
  priorityAI: "elite",
  unlimitedConversations: "elite",
};

export function canAccessFeature(
  userTier: SubscriptionTier,
  featureKey: string,
): boolean {
  const requiredTier = FEATURE_TIER_REQUIREMENTS[featureKey];
  if (!requiredTier) return true; // No gate = free
  return meetsMinimumTier(userTier, requiredTier);
}

export function getRequiredTierForFeature(featureKey: string): SubscriptionTier | null {
  return FEATURE_TIER_REQUIREMENTS[featureKey] ?? null;
}
