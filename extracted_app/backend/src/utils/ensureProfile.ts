import { db } from "../db";

/**
 * Ensures a profile exists for the given user.
 * Creates one with defaults if it doesn't exist.
 * This prevents "Profile not found" 404 errors for normal users.
 */
export async function ensureProfile(userId: string, userEmail?: string | null) {
  const existing = await db.profile.findUnique({ where: { userId } });
  if (existing) return existing;

  // Generate a unique handle from email or fallback
  const emailPrefix = userEmail ? userEmail.split("@")[0] ?? "" : "";
  const baseHandle = emailPrefix
    ? emailPrefix.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || "user"
    : "user";
  const suffix = Math.random().toString(36).slice(2, 6);
  const handle = `${baseHandle}_${suffix}`;

  const profile = await db.profile.create({
    data: {
      userId,
      handle,
      subscriptionTier: "preview",
      isAdmin: false,
      skipOnboarding: false,
    },
  });

  return profile;
}
