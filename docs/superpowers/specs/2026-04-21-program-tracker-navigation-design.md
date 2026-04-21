---
title: Program Tracker Navigation
date: 2026-04-21
status: approved
---

# Program Tracker Navigation

## Overview

Add a tab strip to the three Program Tracker views (Overview, Roadmap, Week-over-Week) so users can navigate between them. Currently all three routes exist and are fully implemented but are unreachable without knowing the URL — there is no in-page navigation linking them.

## Design

A `ProgramNav` component renders three tabs: **Overview**, **Roadmap**, and **Week-over-Week**. Each tab is a router link. The active tab is determined by the current route path.

The tab strip renders inside `WorkspaceLayout` at the top of each of the three program pages, above each page's content. This matches the pattern used by the workstream panel's Weekly Status / Roadmap tabs.

## Affected Files

| File | Change |
|---|---|
| `apps/web/src/components/program/program-nav.tsx` | New component — tab strip with three links |
| `apps/web/src/routes/.../program/index.tsx` | Add `<ProgramNav />` below `WorkspaceLayout title` |
| `apps/web/src/routes/.../program/roadmap/index.tsx` | Add `<ProgramNav />` below `WorkspaceLayout title` |
| `apps/web/src/routes/.../program/week-over-week/index.tsx` | Add `<ProgramNav />` below `WorkspaceLayout title` |

## Component Spec

```tsx
// apps/web/src/components/program/program-nav.tsx
// Renders Overview / Roadmap / Week-over-Week tabs.
// Uses Link from TanStack Router; active state via useRouterState or useMatch.
// Reads workspaceId from route params.
```

Active tab detection: use `useMatch` on each route path. The matched route gets the active style; others get the inactive style.

No backend changes. No data model changes. No new routes.

## Out of Scope

- Adding a direct sidebar shortcut per-team to the program panel (separate task)
- Changes to the roadmap or week-over-week view content
- Aggregated weekly updates / leadership asks view
