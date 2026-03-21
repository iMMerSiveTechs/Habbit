/**
 * Canonical tier resolution for Habit.
 *
 * Single source of truth for:
 *   - resolving the active SubscriptionTier from RevenueCat CustomerInfo
 *   - checking feature access
 *
 * Tier hierarchy (strictly additive — higher tiers include all lower-tier features):
 *   preview (0) < core (1) < pro (2) < elite (3)
 *
 * RevenueCat entitlement IDs must match exactly:
 *   "core" | "pro" | "elite"
 *
 * Usage:
 *   const tier = resolveTierFromEntitlements(customerInfo);
 *   const ok = canAccess("cerebraAI", tier);
 */

import {
  type SubscriptionTier,
  TIER_HIERARCHY,
  FEATURE_TIER_REQUIREMENTS,
} from "@/constants/pricing";

// Minimal CustomerInfo shape we need — avoids importing full react-native-purchases type
export type EntitlementInfo = {
  isActive: boolean;
};

export type CustomerInfoLike = {
  entitlements?: {
    active?: Record<string, EntitlementInfo>;
  };
};

/**
 * Resolve the highest active SubscriptionTier from a RevenueCat CustomerInfo object.
 * Checks entitlements in descending order: elite → pro → core → preview (fallback).
 */
export function resolveTierFromCustomerInfo(
  customerInfo: CustomerInfoLike | null | undefined,
): SubscriptionTier {
  const active = customerInfo?.entitlements?.active ?? {};

  if (active["elite"]?.isActive) return "elite";
  if (active["pro"]?.isActive) return "pro";
  if (active["core"]?.isActive) return "core";
  return "preview";
}

/**
 * Determine whether a given tier can access a feature.
 * Uses the FEATURE_TIER_REQUIREMENTS map from pricing constants.
 *
 * @param featureKey - key from FEATURE_TIER_REQUIREMENTS (e.g. "cerebraAI")
 * @param userTier   - the user's resolved SubscriptionTier
 */
export function canAccess(featureKey: string, userTier: SubscriptionTier): boolean {
  const required = FEATURE_TIER_REQUIREMENTS[featureKey];
  if (!required) return true; // No gate = free feature
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[required];
}

/**
 * Check whether userTier meets or exceeds a required tier.
 */
export function meetsTier(
  userTier: SubscriptionTier,
  requiredTier: SubscriptionTier,
): boolean {
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier];
}
