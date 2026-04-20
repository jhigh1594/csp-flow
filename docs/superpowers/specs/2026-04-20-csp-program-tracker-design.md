---
title: CSP Program Tracker
date: 2026-04-20
status: approved
---

# CSP Program Tracker

## Overview

A dedicated Program Tracker module for the CSP org's 10 PM workstreams, replacing the existing Claude artifact-based weekly status process. PMs update health, lifecycle milestones, accomplishments, focus, escalations, and risks each Thursday. Managers get real-time cross-workstream visibility, week-over-week diffs, and a unified roadmap view.

This feature is **CSP org-specific** — not a generic feature. Workstreams map 1:1 to teams in CSP Flow's team-centric data model. It must be built after the team-centric migration lands.

AI features (summary generation, monthly comms drafting) are explicitly out of scope.

---

## Workstream Ownership

| Workstream | PM Owner |
|---|---|
| CRIR | Dave |
| Customer Success | Vinith / Jane |
| Orca | Chris |
| Expert Services | Chris |
| Resource Mgmt | Chris |
| Renewals | Tim |
| PEX | Tim |
| AI Capabilities | Jon |
| Account 360 | Jon |
| Portfolio | Jon |

---

## Architecture

**Option chosen**: Dedicated Program Tracker module (not bolted onto teams or tasks).

A new top-level "Program Tracker" section in the workspace sidebar, scoped to the workspace. Teams (workstreams) are the unit of ownership for all program data. Cross-workstream views aggregate across all teams in the workspace.

---

## Data Model

Five new tables, all team-scoped, using CUID2 PKs and `createdAt`/`updatedAt` timestamps.

### `weeklyStatus`

One record per team per week (keyed on `teamId` + `weekStart`).

| Column | Type | Notes |
|---|---|---|
| id | text | CUID2 PK |
| teamId | text | FK → team (cascade) |
| workspaceId | text | FK → workspace (cascade) |
| weekStart | date | ISO Monday of the week |
| health | enum | `green`, `amber`, `red` |
| accomplishments | text | nullable |
| nextWeekFocus | text | nullable |
| leadershipAsks | text | nullable |

Unique constraint: `(teamId, weekStart)`.

### `demand`

Active features in flight for a team. Persists across weeks — not duplicated per weekly status entry.

| Column | Type | Notes |
|---|---|---|
| id | text | CUID2 PK |
| teamId | text | FK → team (cascade) |
| name | text | Free text, e.g. "CRIR Proactive Risk / DMD0028445" |
| sortOrder | integer | Controls D01, D02… ordering |
| businessPartnershipDate | date | nullable |
| discoveryDate | date | nullable |
| requirementsDate | date | nullable |
| demandSubmissionDate | date | nullable |
| developmentDate | date | nullable |
| uatDate | date | nullable |
| goLiveDate | date | nullable |
| adoptionDate | date | nullable |

### `risk`

| Column | Type | Notes |
|---|---|---|
| id | text | CUID2 PK |
| teamId | text | FK → team (cascade) |
| description | text | |
| impact | enum | `high`, `medium`, `low` |
| status | enum | `open`, `mitigated`, `closed` |
| owner | text | nullable |
| dueDate | date | nullable |

Closed risks are never deleted — status change to `closed` is the resolution path. This ensures they appear in week-over-week diffs.

### `roadmapRelease`

| Column | Type | Notes |
|---|---|---|
| id | text | CUID2 PK |
| teamId | text | FK → team (cascade) |
| name | text | Release/capability name |
| quarter | enum | `q1`, `q2`, `q3`, `q4` |
| month | integer | 1–12; required for monthly comms pipeline |
| fiscalYear | integer | e.g. 2026 |
| personas | text[] | e.g. ["RAMs", "CSGs"] |
| description | text | nullable; 1–2 sentences |

### `weeklyStatusSnapshot`

JSONB archive of full team state at first save each week.

| Column | Type | Notes |
|---|---|---|
| id | text | CUID2 PK |
| teamId | text | FK → team (cascade) |
| workspaceId | text | FK → workspace (cascade) |
| weekStart | date | |
| snapshot | jsonb | Full state: weeklyStatus + demands[] + risks[] + roadmapReleases[] |

Unique constraint: `(teamId, weekStart)`. Snapshots older than 4 weeks are pruned on each save.

---

## Snapshot Logic

On every save:

1. Compute `weekStart` = Monday of the current ISO week.
2. Check if a `weeklyStatusSnapshot` row exists for `(teamId, weekStart)`.
3. If **no snapshot exists**: serialize full current state (weeklyStatus record + all demands + all risks + all roadmapReleases for this team) into JSONB, insert snapshot, then proceed with save.
4. If **snapshot exists**: proceed with save only (snapshot already taken this week).
5. After save: delete any snapshots for this team where `weekStart < (current weekStart − 4 weeks)`.

This means the first save each Thursday is the canonical weekly snapshot. Corrections after that first save are reflected in live data but not in the snapshot for that week.

---

## Routes

All routes nested under `/workspace/:workspaceId/program`.

| Path | View |
|---|---|
| `/program` | All Workstreams overview |
| `/program/roadmap` | Roadmap View (cross-workstream) |
| `/program/week-over-week` | Week-over-Week diff |
| `/program/team/:teamId` | Individual workstream panel |

---

## Views

### All Workstreams Overview

- Card grid: one card per team
- Each card: team name, PM owner, last-updated timestamp, RAG health badge (with "was X" if changed from prior week), next upcoming milestone date, open risk count
- Below the grid: Open Risks table aggregating all `status = open` risks across all teams (risk description, team, impact, owner, due date)
- Clicking any card navigates to `/program/team/:teamId`

### Workstream Panel

Header: team name, PM name, health selector (Green / Amber / Red toggle), Save button.

Two tabs:

**Weekly Status tab**
1. Lifecycle Milestones — one demand block per active demand. Each block: sequential label (D01, D02…), name field, 8 date inputs. Past dates styled green/dimmed; future dates grey. "+ Add demand" button. × to remove.
2. This Week's Accomplishments — textarea
3. Next Week's Focus — textarea (rendered side-by-side with Accomplishments)
4. Leadership Asks / Escalations — textarea
5. Risks & Issues — table with inline add/edit. Columns: #, Risk/Issue, Impact, Status, Owner, Due Date. "+ Add risk / issue" button at bottom.

**Roadmap tab**
- Four quarterly swim lanes: Q1, Q2, Q3, Q4
- Each lane lists releases for that team/quarter, sorted by month
- "+ Add release" per lane; each release: name, month selector, personas (multi-select or free text), description
- Save button shared with Weekly Status tab

### Roadmap View (cross-workstream)

- All releases across all teams, grouped by quarter then sorted by month
- Each release shows: team name, release name, month, personas, description
- Read-only; PMs edit via their own workstream panel

### Week-over-Week Diff

- Week pills for last 4 saved weeks; select any to compare against its prior week
- Per-workstream diff sections, each showing:
  - RAG change (if any) in header
  - Diff lines: `+` green = added, `~` amber = changed, `−` red = closed/removed
  - Demand diffs: date shifts, new demands, removed demands
  - Risk diffs: new risks, status changes, closed risks
  - Text field diffs: "Text updated" indicator (not full before/after) for accomplishments, focus, leadership asks
  - Roadmap diffs: releases added, moved, removed
- Workstreams not updated that week shown as "Not updated this week"

---

## API Endpoints

All endpoints scoped under `/workspaces/:workspaceId/program`.

| Method | Path | Description |
|---|---|---|
| GET | `/teams` | All teams with latest weeklyStatus for current week |
| GET | `/teams/:teamId/status` | Full workstream data (status + demands + risks + releases) |
| PUT | `/teams/:teamId/status` | Save weekly status + trigger snapshot logic |
| POST | `/teams/:teamId/demands` | Add demand |
| PATCH | `/teams/:teamId/demands/:id` | Update demand dates/name |
| DELETE | `/teams/:teamId/demands/:id` | Remove demand |
| POST | `/teams/:teamId/risks` | Add risk |
| PATCH | `/teams/:teamId/risks/:id` | Update risk |
| GET | `/roadmap` | All releases across all teams |
| POST | `/teams/:teamId/releases` | Add release |
| PATCH | `/teams/:teamId/releases/:id` | Update release |
| DELETE | `/teams/:teamId/releases/:id` | Delete release |
| GET | `/snapshots` | List available snapshot weeks for WoW selector |
| GET | `/snapshots/diff` | Diff two weeks: `?from=YYYY-MM-DD&to=YYYY-MM-DD` where `from` = prior week's Monday, `to` = selected week's Monday |

---

## Access Control

All workspace members can view and edit all workstreams. No per-workstream permission gating in this phase — teams inherit workspace roles. This matches the current CSP org's operating model (all PMs have access to the shared tracker).

---

## Dependency

This feature depends on the team-centric data model migration (plan: `docs/plans/2026-04-20-008-feat-team-centric-data-model-plan.md`) being complete. Teams must exist as first-class entities with workspace membership before Program Tracker can be built.

---

## Out of Scope

- AI summary generation ("Give me this week's summary")
- Monthly comms draft generation ("Draft the May program update")
- Per-workstream permissions or PM-only edit locks
- Making this feature generic/configurable for other workspaces
