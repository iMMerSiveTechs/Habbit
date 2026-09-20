# Habit — Agent Handoff Map

**Generated:** 2026-09-20  
**Status:** prepared for cross-agent visibility; no runtime/deploy/code mutation performed by this map.  
**Primary source artifact:** `Habit_Google_Drive_Ready_Package.zip`  
**Sensitivity:** private. Contains `.env` files, logs, raw SQLite database, exported user/account/session-adjacent tables, and project source. Do not publish publicly.

## What this package is

Habit is a recovered app/project snapshot organized into a Drive-ready evidence package. The current source snapshot describes Habit as an Expo / React Native mobile app with a Bun + Hono + Prisma SQLite backend, Better Auth, and RevenueCat subscription wiring. The product core is habit formation: tasks/todos, habit events, reflections, focus sessions, notifications, templates, and routine/protocol scaffolding.

This handoff is for **agent coordination**, not shipping. It tells each connected surface where to look, what it owns, and what must not be changed without approval.

## Verified package snapshot

| Area | Count / fact |
|---|---:|
| Files inventoried | 259 |
| Extracted top-level areas | <root>: 3, backend: 81, mobile: 174, shared: 1 |
| Source-code files | 176 |
| Documentation files | 25 |
| Database migration files | 23 |
| Asset files | 20 |
| Configuration files | 12 |
| Logs | 2 |
| SQLite tables exported | 57 |
| Rows across exported DB tables | 469 |

## Confirmed architecture from source README

| Layer | Current snapshot evidence |
|---|---|
| Mobile frontend | Expo SDK 53 / React Native app under `mobile/` |
| Backend | Bun + Hono TypeScript server under `backend/` |
| Database | Prisma + SQLite, raw DB at `backend/prisma/dev.db` |
| Auth | Better Auth with Expo plugin |
| Billing | RevenueCat tier wiring; source mentions Preview/Core/Pro/Elite |
| Key app surfaces | habits, todos, routines, reflections, focus, location, adaptive/smart notifications, AI/Cerebra-adjacent routes, marketplace/subscription scaffolding |

## Top database tables with data

| Table | Rows |
|---|---:|
| `habit_template_item` | 144 |
| `user_engagement_log` | 108 |
| `todo_template_item` | 53 |
| `habit_template` | 24 |
| `_prisma_migrations` | 23 |
| `todo_item` | 22 |
| `smart_notification_log` | 18 |
| `habit` | 17 |
| `habit_event` | 15 |
| `todo_template` | 10 |
| `session` | 5 |
| `account` | 4 |
| `Profile` | 4 |
| `user` | 4 |
| `todo` | 4 |
| `daily_intention` | 3 |
| `template_purchase` | 2 |
| `engagement_pattern` | 2 |
| `focus_session` | 2 |
| `notification_preference` | 2 |

## Largest files

| Path | Category | Size |
|---|---|---:|
| `mobile/assets/other-1761903562445.png` | assets | 1.5 MB |
| `mobile/assets/image-1762361611.png` | assets | 1.2 MB |
| `mobile/assets/image-1762368305.jpeg` | assets | 980.3 KB |
| `mobile/assets/image-1762368334.jpeg` | assets | 972.6 KB |
| `mobile/assets/image-1762368344.jpeg` | assets | 967.9 KB |
| `mobile/assets/image-1762368285.jpeg` | assets | 959.8 KB |
| `mobile/assets/image-1762368253.jpeg` | assets | 959.8 KB |
| `mobile/assets/image-1762368320.jpeg` | assets | 929.1 KB |
| `mobile/assets/image-1763783929.png` | assets | 903.1 KB |
| `mobile/assets/adaptive-icon.png` | assets | 903.1 KB |
| `mobile/assets/notification-icon.png` | assets | 903.1 KB |
| `mobile/assets/image-1762368247.jpeg` | assets | 822.4 KB |

## Artifact checksums

| File | Bytes | SHA-256 |
|---|---:|---|
| `Habit.zip` | 12531659 | `5f374af44713a7d321ba32be1ddbc8d3151d08620d8f48fcf03836c1a7db9b19` |
| `Habit_Google_Drive_Ready_Package.zip` | 37303266 | `c2d2715a2191dcc74bfcf52acb00eb97fcf1cdb98c2e1995fa24deb24b560843` |
| `Habit_Google_Drive_Ready_README.md` | 2369 | `f4b5a26f454f5eb0af58759f96b75961525a60b29e588538ebc5d59776951354` |
| `Habit_Project_Inventory.csv` | 30388 | `e1e2c7801de0c2ecda9c74af8c76e8b925011e017536c998b11c53b66a072d25` |
| `Habit_Database_Table_Counts.csv` | 1047 | `4539377ac6343f451219d85a9b65afb58e611e2df360e4536f14c57a186df5b3` |
