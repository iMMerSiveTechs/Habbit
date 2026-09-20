# START HERE — Habit Agent Handoff

**Date:** 2026-09-20  
**Project:** Habit  
**Purpose:** make the recovered Habit package understandable and routable across the agent fleet.

## One-paragraph summary

Habit is a mobile habit/todo/routine/reflection app snapshot with an Expo/React Native frontend and a Bun/Hono/Prisma/SQLite backend. A private Drive-ready package now exists with the original archive, extracted source, database exports, manifests, checksums, documentation index, asset index, logs, and dependency/config indexes. Treat the package as private evidence. Do not ship, deploy, merge, mutate provider settings, or expose secrets from this handoff.

## What exists now

- Full Drive-ready package: `Habit_Google_Drive_Ready_Package.zip`
- Original archive preserved: `Habit.zip`
- Project inventory: `Habit_Project_Inventory.csv`
- Database table counts: `Habit_Database_Table_Counts.csv`
- Source snapshot includes:
  - `mobile/` Expo/React Native application
  - `backend/` Bun/Hono API
  - `backend/prisma/dev.db` SQLite database
  - Prisma migrations and schema
  - docs/assets/logs/config/dependency index

## First safe action for any agent

1. Read this `START_HERE` file.
2. Read the connector surface map.
3. Locate the Drive package or GitHub handoff docs.
4. Report what you found and the exact source/receipt used.
5. Stop before code edits, runtime changes, deployment, auth/billing/provider changes, or public sharing unless owner approval is explicit.

## Current non-goals

- Do not rebuild the app from scratch.
- Do not merge code.
- Do not deploy.
- Do not publish raw `.env`, database, logs, account/session records, or package exports outside private storage.
- Do not collapse Habit into broader Nemurium/FleetForge architecture. Habit is an app/workstream, not the whole fleet.

## Best next proof-bearing work

- Verify source recoverability from the package.
- Identify the canonical GitHub repository or create a clean import plan.
- Reconcile tier/pricing mismatch between source README and backend README.
- Audit secrets/env placeholders before any code import.
- Produce a minimal local run receipt only after explicit approval.
