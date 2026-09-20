# Habit — Agent Work Packet

**Generated:** 2026-09-20  
**Status:** handoff / mapping only. No implementation is authorized by this file.

## Workstreams

| Workstream | Owner surface | Starting artifact | Definition of done |
|---|---|---|---|
| Evidence vault | Google Drive | `Habit_Google_Drive_Ready_Package.zip` | Package is stored privately with README, checksums, and index visible |
| Technical map | GitHub | `docs/agent-handoff/2026-09-20/` | Redacted docs committed on branch or PR, no raw secrets/DB/logs |
| Knowledge index | Notion | “Habit — Agent Handoff Map” page | Human-readable project map and routing rules visible |
| Engineering queue | Linear | “Habit — Agent Handoff Map” document/issue | Small proof tasks and approval gates tracked |
| Team awareness | Slack | Canvas or short pointer | Other agents/humans know where to look without leaking private package |
| Ops tracking | ClickUp | Document/checklist | Delivery gap and follow-up checklist visible to ops layer |

## Prepared tasks

### P0 — Preserve evidence privately
- Confirm Drive folder exists.
- Store package zip and generated docs privately.
- Record file checksums.
- Do not share externally.

### P1 — Make technical handoff visible
- Add redacted docs to GitHub branch/PR.
- Include only markdown/json/csv-safe inventory summaries.
- Exclude raw DB, `.env`, logs, source package zip unless explicit owner approval.

### P1 — Reconcile source truth
- Compare app README tier structure against backend README tier limits.
- Confirm whether pricing source of truth is `mobile/src/billing/tier.ts` and `mobile/src/constants/pricing.ts`.
- Produce a single “current tier contract” before implementation.

### P2 — Recoverability proof
- In an isolated local environment only, test dependency install/typecheck/build commands.
- Capture exact command outputs.
- Stop before cloud/provider mutations.

### P2 — Security review before import
- Review `.env`, logs, database exports, account/session records.
- Create redaction plan before any repo import or public sharing.

## Approval gates

- Importing full source into GitHub: needs approval.
- Pushing to main/default branch: needs approval.
- Creating deployment, connecting billing/auth/provider accounts, running migrations against live systems: needs approval.
- Publishing or externally sharing any raw package material: needs approval.
