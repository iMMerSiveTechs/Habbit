# Backend Server — Hono, Prisma, Better Auth (Bun)

This backend server powers the Habit app with a minimal, fast Hono server. It provides authentication via Better Auth, JSON REST endpoints via Hono, and persistence via Prisma+SQLite.

## Stack and key decisions

- Runtime: Bun with TypeScript
- Web framework: Hono 4 with `@hono/node-server`
  - Global middleware: request logger and allowlist CORS (set `ALLOWED_ORIGINS` env var)
  - Health probe at `/health`
  - `ensureProfile` middleware guarantees a Profile exists for every authenticated request
- API: Hono routes with Zod validation via `@hono/zod-validator`
- Auth: Better Auth with Expo plugin
  - Mounted at `/api/auth/*`
  - `trustedOrigins` includes the Expo scheme (`habit://`) and localhost for development
  - Email + password enabled by default
- Database: Prisma 6 with SQLite (file DB)
  - Schema in `prisma/schema.prisma`
  - Generated client in `generated/prisma`
- Validation: Zod for input and optional env validation

## Tier system

Tiers: `preview` (free) → `core` → `pro` → `elite`

Limits defined in `src/tierGuard.ts`:
- **Preview**: 5 habits, 10 todos
- **Core**: Unlimited habits & todos, 3 geofences, 5 location reminders
- **Pro/Elite**: Unlimited everything

## Idempotent habit completion

`POST /api/habits/:id/complete` now accepts an optional `clientEventId`. If the same `clientEventId` is sent twice on the same day, only one `HabitEvent` is created. The mobile client sends `complete-{habitId}-{date}` automatically.

## Skip habit endpoint

`POST /api/habits/:id/skip` — auth-gated, accepts optional `{ reason, skippedAt }`. Returns `{ success, habitId, skippedAt }`. No DB write (tracked locally on client).

## Project layout

```
backend/
├── src/
│   ├── index.ts           # Main server setup (middleware, route mounting, server start)
│   ├── types.ts           # Shared TypeScript types (AppType for context)
│   ├── auth.ts            # Better Auth configuration (DB adapter, plugins, origins)
│   ├── db.ts              # Prisma client instance
│   ├── env.ts             # Zod schema for environment variables
│   ├── tierGuard.ts       # Tier-based feature limits
│   └── routes/            # Route modules (organized by feature)
├── prisma/
│   ├── schema.prisma      # Prisma schema (SQLite datasource)
│   ├── dev.db             # SQLite database file
│   └── migrations/        # Database migration history
├── uploads/               # User-uploaded images (served at /uploads/*)
├── package.json
└── README.md
```

## Scripts

- `bunx prisma generate`: generate Prisma client
- `bunx prisma migrate dev --name <migration-name>`: sync schema to the database
- `bunx prisma db push`: push schema changes without a migration file

## Auth configuration

`src/auth.ts` configures Better Auth with the Prisma adapter and the Expo plugin.
`trustedOrigins` includes `habit://` for the Habit app scheme.
