import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { type AppType } from "../types";
import { db } from "../db";

// ============================================================
// TYPES
// ============================================================

type SubscriptionTier = "elite" | "pro" | "core" | "preview";

interface RCEntitlement {
  expires_date: string | null;
  purchase_date: string;
  product_identifier: string;
}

interface RCSubscriberResponse {
  subscriber: {
    entitlements: Record<string, RCEntitlement>;
  };
}

interface CacheEntry {
  tier: SubscriptionTier;
  expiresAt: number;
}

// ============================================================
// SIMPLE IN-MEMORY CACHE (5-minute TTL)
// ============================================================

const tierCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedTier(userId: string): SubscriptionTier | null {
  const entry = tierCache.get(userId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    tierCache.delete(userId);
    return null;
  }
  return entry.tier;
}

function setCachedTier(userId: string, tier: SubscriptionTier): void {
  tierCache.set(userId, { tier, expiresAt: Date.now() + CACHE_TTL_MS });
}

// ============================================================
// HELPERS
// ============================================================

const TIER_PRIORITY: SubscriptionTier[] = ["elite", "pro", "core"];

function resolveHighestTier(
  activeEntitlements: Record<string, RCEntitlement>
): SubscriptionTier {
  for (const tier of TIER_PRIORITY) {
    if (tier in activeEntitlements) {
      return tier;
    }
  }
  return "preview";
}

async function fetchSubscriberTier(
  rcUserId: string,
  secretKey: string
): Promise<SubscriptionTier> {
  const url = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(rcUserId)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "X-Platform": "ios",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `RevenueCat API returned ${response.status}: ${response.statusText}`
    );
  }

  const data = (await response.json()) as RCSubscriberResponse;
  const activeEntitlements = data?.subscriber?.entitlements ?? {};
  return resolveHighestTier(activeEntitlements);
}

// ============================================================
// VALIDATION SCHEMA
// ============================================================

const SyncBodySchema = z.object({
  appUserId: z.string().optional(),
});

// ============================================================
// ROUTER
// ============================================================

const subscriptionRouter = new Hono<AppType>().post(
  "/sync",
  zValidator("json", SyncBodySchema),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const secretKey = process.env.REVENUECAT_SECRET_KEY;
    if (!secretKey) {
      console.warn(
        "[Subscription] REVENUECAT_SECRET_KEY is not set — skipping RC sync"
      );
      return c.json({ success: false, reason: "RevenueCat not configured" });
    }

    const { appUserId } = c.req.valid("json");
    const rcUserId = appUserId ?? user.id;

    // Check cache first
    const cached = getCachedTier(rcUserId);
    if (cached !== null) {
      console.log(
        `[Subscription] Cache hit for user ${rcUserId} — tier: ${cached}`
      );
      return c.json({ success: true, tier: cached });
    }

    let resolvedTier: SubscriptionTier;
    try {
      resolvedTier = await fetchSubscriberTier(rcUserId, secretKey);
      setCachedTier(rcUserId, resolvedTier);
      console.log(
        `[Subscription] RC resolved tier for user ${rcUserId}: ${resolvedTier}`
      );
    } catch (err) {
      console.error("[Subscription] Failed to fetch from RevenueCat:", err);
      return c.json({
        success: false,
        reason: "Failed to fetch subscription data from RevenueCat",
      });
    }

    try {
      await db.profile.update({
        where: { userId: user.id },
        data: { subscriptionTier: resolvedTier },
      });
      console.log(
        `[Subscription] Profile updated for user ${user.id} — tier: ${resolvedTier}`
      );
    } catch (err) {
      console.error("[Subscription] Failed to update profile:", err);
      return c.json({ success: false, reason: "Failed to update profile" });
    }

    return c.json({ success: true, tier: resolvedTier });
  }
);

export default subscriptionRouter;
