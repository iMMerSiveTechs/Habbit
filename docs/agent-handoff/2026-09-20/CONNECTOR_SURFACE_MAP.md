# Habit — Connector Surface Map

**Generated:** 2026-09-20  
**Operating rule:** every surface gets a pointer to the same canonical evidence, but each surface has a different job. This prevents agents from treating Slack, Notion, ClickUp, Linear, GitHub, and Drive as conflicting sources of truth.

## Canonical routing

| Surface | Role | What should live there | What must not live there |
|---|---|---|---|
| Google Drive | Durable evidence archive and private package storage | Full zip package, original archive, inventories, database exports, checksums, receipt docs | Broad execution state, noisy chat, unredacted secrets shared publicly |
| GitHub | Technical/code-facing map and reproducible docs | Redacted agent handoff docs, source-reconstruction notes, issues/PRs if approved | Raw `.env`, raw DB, logs, private account/session exports, direct deploy changes |
| Notion | Human-readable knowledge index | Canonical overview, architecture map, agent reading order, decision log pointers | Raw source dumps, large binary/package storage, unreviewed secrets |
| Linear | Engineering execution state | Small implementation/proof issues, status docs, approval gates | Canonical source archive, broad knowledge base, vague backlog piles |
| Slack | Team awareness / broadcast / canvas | Short pointer, current status, “read this first” canvas | Permanent source of truth, long raw evidence, sensitive package contents |
| ClickUp | Ops/project management mirror | Workstream doc, checklist, delivery gap tracking | Canonical code source, unredacted package, ad hoc secret sharing |

## Agent reading order

1. Read `START_HERE` first.
2. Use Google Drive as the evidence vault.
3. Use this connector map to decide which app should own the next step.
4. If touching code, start in GitHub and stop at a branch/PR unless owner approval says otherwise.
5. If turning work into execution, create/attach the Linear issue and approval gate.
6. If humans need a readable summary, update Notion and/or Slack canvas.
7. If ops needs checklists or delivery tracking, update ClickUp.

## Approval gates

| Gate | Requires approval? | Notes |
|---|---:|---|
| Uploading private archive to Drive | Yes/owner-intended here | Keep private/restricted unless instructed otherwise |
| Committing redacted docs to GitHub branch | Usually safe with branch; no merge without approval | Do not include secrets/DB/logs |
| Creating Notion/Linear/ClickUp docs | Safe as visibility handoff | No secrets beyond summary/checksums |
| Posting public Slack channel announcements | Needs channel selection if noisy | Prefer canvas/private pointer first |
| Editing source code | Yes | This map does not authorize implementation |
| Deploying / changing runtime / changing billing/auth/provider state | Yes, explicit | Out of scope for this handoff |

## Package privacy classification

- `Habit_Google_Drive_Ready_Package.zip`: **Private / evidence vault only**.
- `Habit.zip`: **Private / original source archive**.
- `Habit_Project_Inventory.csv`: **Internal / safe-ish but may reveal filenames and structure**.
- `Habit_Database_Table_Counts.csv`: **Internal / low data sensitivity; table names may reveal features**.
- This handoff markdown: **Internal / suitable for connected project surfaces**.
