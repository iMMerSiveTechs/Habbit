import { useCallback, useEffect, useState } from "react";
import { useAppStore } from "@/state/appStore";
import {
  getCustomerInfo,
  getOfferings,
  purchasePackage,
  restorePurchases,
  isRevenueCatEnabled,
} from "@/lib/revenuecatClient";
import type { PurchasesPackage } from "react-native-purchases";
import {
  type SubscriptionTier,
  TIERS,
  canAccessFeature,
  meetsMinimumTier,
  RC_DEFAULT_OFFERING_ID,
} from "@/constants/pricing";
import { resolveTierFromCustomerInfo } from "@/billing/tier";
import { api } from "@/lib/api";

/** Backend tier sync after purchase/restore (blocking, with error tolerance) */
async function syncTierToBackend(): Promise<void> {
  try {
    await api.post("/api/subscription/sync", {});
  } catch (syncError) {
    console.log("[Subscription] Backend sync failed, will retry on next app open:", syncError);
  }
}

export function useSubscription() {
  const subscriptionTier = useAppStore((s) => s.subscriptionTier);
  const setSubscriptionTier = useAppStore((s) => s._setSubscriptionTierFromRC);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  const syncTierFromRevenueCat = useCallback(async () => {
    const result = await getCustomerInfo();
    if (!result.ok) return;
    // Use canonical resolver — single source of truth for tier resolution
    const resolvedTier = resolveTierFromCustomerInfo(result.data);
    setSubscriptionTier(resolvedTier);
  }, [setSubscriptionTier]);

  const loadOfferings = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getOfferings();
      if (result.ok) {
        // Prefer "default" offering, fall back to current offering
        const defaultOffering =
          result.data.all[RC_DEFAULT_OFFERING_ID] ?? result.data.current;
        setPackages(defaultOffering?.availablePackages ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const purchase = useCallback(
    async (pkg: PurchasesPackage): Promise<boolean> => {
      setPurchasing(true);
      try {
        const result = await purchasePackage(pkg);
        if (result.ok) {
          await syncTierFromRevenueCat();
          await syncTierToBackend(); // blocking backend sync
          return true;
        }
        return false;
      } finally {
        setPurchasing(false);
      }
    },
    [syncTierFromRevenueCat],
  );

  const restore = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    try {
      const result = await restorePurchases();
      if (result.ok) {
        await syncTierFromRevenueCat();
        await syncTierToBackend(); // blocking backend sync
        return true;
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, [syncTierFromRevenueCat]);

  const hasAccess = useCallback(
    (featureKey: string): boolean => {
      return canAccessFeature(subscriptionTier, featureKey);
    },
    [subscriptionTier],
  );

  const meetsTier = useCallback(
    (requiredTier: SubscriptionTier): boolean => {
      return meetsMinimumTier(subscriptionTier, requiredTier);
    },
    [subscriptionTier],
  );

  // Sync on mount
  useEffect(() => {
    if (isRevenueCatEnabled()) {
      syncTierFromRevenueCat();
    }
  }, [syncTierFromRevenueCat]);

  return {
    tier: subscriptionTier,
    tierConfig: TIERS[subscriptionTier],
    packages,
    loading,
    purchasing,
    loadOfferings,
    purchase,
    restore,
    hasAccess,
    meetsTier,
    syncTierFromRevenueCat,
    isRevenueCatEnabled: isRevenueCatEnabled(),
  };
}
