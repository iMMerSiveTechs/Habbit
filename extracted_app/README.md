# Habit — App Store Ship Checklist

## Architecture
- **Frontend**: Expo SDK 53 / React Native 0.76 (port 8081)
- **Backend**: Hono + Bun + Prisma SQLite (port 3000)
- **Auth**: Better Auth
- **Payments**: RevenueCat (3-tier: Core / Pro / Elite)

## Tier Structure
| Tier | Price | Limits |
|------|-------|--------|
| Preview (free) | $0 | 3 habits, 3 todos |
| Core | $8.99/mo | Unlimited |
| Pro | $13.99/mo | Unlimited + AI |
| Elite | $21.99/mo | Unlimited + AI + Priority |

Single source of truth for tiers: `mobile/src/billing/tier.ts`
Tier config (limits, features, RC identifiers): `mobile/src/constants/pricing.ts`
Hook: `mobile/src/hooks/useSubscription.ts`

## Key Files
- `mobile/App.tsx` — Root component (wrapped in ErrorBoundary)
- `mobile/src/navigation/RootNavigator.tsx` — All screens registered here
- `mobile/src/billing/tier.ts` — Canonical tier resolution
- `mobile/src/constants/pricing.ts` — Tier config + RC package IDs + legal URLs
- `mobile/src/hooks/useSubscription.ts` — Purchase/restore + backend sync
- `backend/src/routes/subscription.ts` — POST /api/subscription/sync (RC server-side verify)

## v1.0.1 Ship Fixes (2026-02-19)
1. **Tier-aware limits** — `TodayScreenConnected` only slices to 3 for preview tier; paid users see all habits/todos
2. **ErrorBoundary** — `App.tsx` wrapped in `ErrorBoundary`; crashes show recovery UI instead of white screen
3. **Preview limits corrected** — `pricing.ts` preview tier: maxHabits=3, maxTodos=3 (was 5/10)
4. **Backend subscription sync** — New `POST /api/subscription/sync` endpoint verifies RC server-side and updates `profile.subscriptionTier`
5. **Client sync wired** — `useSubscription` calls backend sync after every purchase and restore (fire-and-forget)
6. **Admin UI gated** — Settings admin section requires `EXPO_PUBLIC_ADMIN_TOOLS_ENABLED=true` (not set in production)
7. **Privacy/Terms links** — Both `PricingScreen` and `UpgradeScreen` show Privacy Policy + Terms of Service links
8. **Robust package resolution** — `getPackageForTier` matches by `pkg.identifier`, `product.identifier`, `tier_monthly`, or substring — more resilient to RC offering configs
9. **Asset fix** — `adaptive-icon.png` and `notification-icon.png` created; `app.json` now includes `icon` and `splash` fields

## Before App Store Submission
- [ ] Replace `PRIVACY_POLICY_URL` and `TERMS_OF_SERVICE_URL` in `pricing.ts` with real URLs
- [ ] Replace placeholder `adaptive-icon.png` with real branded app icon (1024x1024 or 108x108)
- [ ] Replace placeholder `notification-icon.png` with real icon
- [ ] Set `REVENUECAT_SECRET_KEY` env var on backend for server-side RC verification
- [ ] Verify RevenueCat products are active in App Store Connect (not just RC dashboard)
- [ ] Test purchase flow on physical device via TestFlight

## RevenueCat Setup
RC entitlement IDs must match exactly: `core`, `pro`, `elite`
RC package identifiers: `$rc_monthly` (core), `$rc_custom_pro_monthly` (pro), `$rc_custom_elite_monthly` (elite)

## Backend Env Vars Needed
- `DATABASE_URL` — SQLite path
- `BETTER_AUTH_SECRET` — Auth secret
- `REVENUECAT_SECRET_KEY` — For server-side subscription verification (optional but recommended)
- `ADMIN_SETUP_TOKEN` — One-time admin grant token (never set in production)
