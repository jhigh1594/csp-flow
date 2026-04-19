---
title: "feat: Milestone enhancements — Plane-inspired Gantt experience"
type: feat
status: active
date: 2026-04-18
origin: docs/brainstorms/2026-04-18-milestone-enhancements-requirements.md
---

# feat: Milestone enhancements — Plane-inspired Gantt experience

## Overview

Extend the existing milestone system with task linking, progress tracking, vertical dashed lines on the Gantt, and a rich hover tooltip showing name/progress/count/date. Add a milestone selector to the task detail sheet properties sidebar. Milestones remain project-scoped, one-per-task.

## Problem Frame

Milestones are basic diamond markers (title + target date). No progress tracking, no task linking, no hover information. Users must click the diamond to see anything. Plane's Pro milestone feature shows vertical dashed lines through task rows and hover popovers with progress, giving instant visibility into whether work is on track. (See origin: `docs/brainstorms/2026-04-18-milestone-enhancements-requirements.md`)

## Requirements Trace

- R1. Hovering over a milestone diamond shows a tooltip with name, progress %, linked task count, and target date
- R2. A vertical dashed line extends from each milestone diamond through all task rows
- R3. Tasks can be linked to milestones via the task detail sheet properties sidebar
- R4. Milestone progress % updates automatically as linked tasks move to "done"
- R5. Creating/editing milestones still works from the Gantt toolbar and diamond click popover
- R6. Vertical dashed lines don't obscure or interfere with task bar readability

## Scope Boundaries

- No milestone status workflow (planned/in-progress/completed)
- No many-to-many task-milestone linking — one milestone per task
- No dedicated milestone management/list page outside the Gantt
- No milestone listing in board, list, or backlog views
- No weighted progress calculation — simple done/total ratio
- No milestone-level description editing from the Gantt
- No mobile milestone enhancements

### Deferred to Separate Tasks

- Milestone management page outside the Gantt (future iteration)
- Milestone listing in board/list/backlog views (future iteration)
- Milestone selector in the Gantt hover popover for linking tasks (future iteration)

## Context & Research

### Relevant Code and Patterns

- Milestone schema: `apps/api/src/database/schema.ts` (milestoneTable, lines 755-776)
- Milestone relations: `apps/api/src/database/relations.ts` (lines 115-120)
- Milestone API routes: `apps/api/src/milestone/index.ts` + controllers in `controllers/`
- Milestone frontend type: `apps/web/src/types/milestone/index.ts`
- Gantt milestone row: `apps/web/src/components/gantt/gantt-milestone-row.tsx` (diamond rendering + click popover)
- Gantt route: `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/gantt.tsx`
- Gantt utils: `apps/web/src/lib/gantt-utils.ts` (getColumnIndex, buildTimeline)
- Gantt status colors: `apps/web/src/lib/gantt-status-colors.ts`
- Task schema: `apps/api/src/database/schema.ts` (taskTable, lines 281-320)
- Task properties sidebar: `apps/web/src/components/task/task-properties-sidebar.tsx` (popover pattern for task properties)
- Task detail sheet: `apps/web/src/components/task/task-details-sheet.tsx`
- Tooltip component: `apps/web/src/components/ui/tooltip.tsx` (available, uses Radix)
- Status popover pattern: `apps/web/src/components/task/task-status-popover.tsx`
- Fetcher pattern: `apps/web/src/fetchers/{feature}/{action}.ts`
- Query hook pattern: `apps/web/src/hooks/queries/{feature}/use-get-{resource}.ts`
- Mutation hook pattern: `apps/web/src/hooks/mutations/{feature}/use-{action}-{resource}.ts`
- Milestone fetcher/mutation hooks already exist in `apps/web/src/fetchers/milestone/` and `apps/web/src/hooks/mutations/milestone/`

### Institutional Learnings

- Use `getColumnIndex` from `gantt-utils.ts` for all Gantt positioning — never raw `differenceInCalendarDays` (from completed plan `2026-04-18-001`)
- Use Radix `Popover` (not Dialog) for inline editing on Gantt elements (from existing milestone diamond pattern)
- Status color tokens go in `gantt-status-colors.ts` using semantic design tokens with opacity modifiers (from completed plan `2026-04-18-001`)
- Week starts on Monday (`weekStartsOn: 1`) throughout the Gantt (from completed plan `2026-04-18-001`)
- Task status column determines "done" — use `column.isFinal` or match `done` status slug

## Key Technical Decisions

- **milestoneId FK on tasks (nullable)**: Adds `milestoneId` column to `taskTable` referencing `milestoneTable.id` with `onDelete: "set null"` — if a milestone is deleted, tasks keep their data but lose the link. Simpler than a join table, matches the one-milestone-per-task model. (see origin: requirements doc, "One milestone per task")

- **Progress computed at query time**: The `GET /milestone/project/:projectId` endpoint annotates each milestone with `totalTasks` and `completedTasks` counts. Progress = `completedTasks / totalTasks`. No stored progress field — always fresh. Uses a subquery or join against tasks where `milestoneId = milestone.id`.

- **Vertical dashed line rendered as absolute-positioned div**: A full-height div with `border-left: 2px dashed primary/30` positioned at the same `left` offset as the diamond. Rendered behind task bars (lower z-index than bars but above grid). Simpler than SVG overlay.

- **Hover tooltip wraps the diamond trigger**: Wrap the existing `PopoverTrigger` diamond in a Radix `Tooltip` that shows on hover. The click `Popover` (edit form) stays unchanged. Both can coexist on the same trigger element using `TooltipTrigger` as the outer wrapper and `PopoverTrigger` as the inner wrapper.

- **Task milestone selector uses existing popover pattern**: A new `TaskMilestonePopover` component in the task properties sidebar, following the same pattern as `TaskStatusPopover` and `TaskPriorityPopover` — ghost button trigger, dropdown list of project milestones, check icon for current selection.

## Open Questions

### Resolved During Planning

- **Z-index for vertical dashed line**: Behind task bars but above grid background. Use `z-[5]` (grid is default, bars use `z-[10]`, milestone diamond uses `z-[12]`)
- **Tooltip positioning**: `side="top"` with `align="center"` — diamond is already at the top of the row, tooltip floats above it
- **Milestone selector in task sidebar**: Dropdown popover, matching the existing `TaskStatusPopover` pattern exactly

### Deferred to Implementation

- Exact dashed line color and opacity (directional: primary at ~30% opacity)
- Whether tooltip shows "X work items" or "X tasks" as the label (directional: "tasks" to match existing terminology)
- Animation/transition on tooltip appear (directional: default Radix Tooltip animation)

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
Schema changes:
  milestoneTable: add description (text, nullable)
  taskTable: add milestoneId (text, nullable) → milestoneTable.id, onDelete: "set null"

API changes:
  GET /milestone/project/:projectId → returns milestones with annotated progress:
    { ...milestone, totalTasks: number, completedTasks: number }
  PUT /task/:id → accepts milestoneId in body (nullable, validates milestone belongs to same project)

Frontend data layer:
  - Milestone type: add description, totalTasks, completedTasks
  - Task type: add milestoneId
  - Update get-milestones fetcher to handle annotated response
  - Add update-task mutation to accept milestoneId (reuse existing, just add field)

Gantt rendering:
  GanttMilestoneRow:
    - Wrap each diamond in Tooltip (hover) + Popover (click)
    - Render vertical dashed line div at same left offset, full height of task area
  Tooltip content: milestone name, progress ring (%), "X tasks", target date

Task detail:
  TaskMilestonePopover:
    - Trigger: ghost button with diamond icon + milestone name or "Set milestone"
    - Content: scrollable list of project milestones (from useGetMilestones)
    - Selection: calls useUpdateTask with milestoneId
    - Clear option: "No milestone" at top of list
```

## Implementation Units

- [x] **Unit 1: Schema migration — add description and milestoneId FK**

**Goal:** Extend the database schema to support milestone descriptions and task-to-milestone linking.

**Requirements:** R3, R4

**Dependencies:** None

**Files:**
- Modify: `apps/api/src/database/schema.ts`
- Modify: `apps/api/src/database/relations.ts`
- Generate: migration via `pnpm --filter @kaneo/api db:generate`

**Approach:**
- Add `description: text("description")` (nullable) to `milestoneTable`
- Add `milestoneId: text("milestone_id").references(() => milestoneTable.id, { onDelete: "set null", onUpdate: "cascade" })` (nullable) to `taskTable`
- Add index on `taskTable.milestoneId` for query performance
- Update `milestoneTableRelations` to include `tasks: many(taskTable)` reverse relation
- Update `taskTableRelations` to include `milestone: one(milestoneTable)` relation
- Generate and run migration

**Patterns to follow:**
- `apps/api/src/database/schema.ts` — existing FK pattern with `onDelete: "set null"` (see `taskTable.columnId`)

**Test scenarios:**
- Test expectation: none — pure schema migration, no behavioral logic

**Verification:**
- Migration generates and applies without error
- FK constraint: inserting a task with non-existent milestoneId fails
- Cascade: deleting a milestone sets linked tasks' milestoneId to null

---

- [x] **Unit 2: Milestone API — progress annotation and task linking**

**Goal:** Update the milestone API to return progress counts. Add milestoneId to the task update endpoint.

**Requirements:** R3, R4

**Dependencies:** Unit 1

**Files:**
- Modify: `apps/api/src/milestone/controllers/get-milestones.ts`
- Modify: `apps/api/src/task/controllers/update-task.ts` (or wherever the update controller validates)
- Modify: `apps/api/src/milestone/index.ts` (if validation schema needs milestoneId-related changes)
- Modify: `apps/api/src/task/index.ts` (add milestoneId to update validation)

**Approach:**
- `get-milestones.ts`: Annotate each milestone with `totalTasks` (count of tasks where `milestoneId = milestone.id`) and `completedTasks` (count where status is "done" or column `isFinal = true`). Use a SQL subquery or join. Return `{ ...milestone, totalTasks, completedTasks }`.
- Task update: Allow `milestoneId` as an optional field in the update body. Validate that if provided, the milestone belongs to the same project. Set to `null` to unlink.
- Update the Valibot update schema to accept `milestoneId: optional(string())`

**Patterns to follow:**
- `apps/api/src/milestone/controllers/get-milestones.ts` for existing controller shape
- `apps/api/src/task/controllers/update-task.ts` for partial update pattern with conditional field spread

**Test scenarios:**
- Happy path: `GET /milestone/project/:id` returns milestones with `totalTasks: 3, completedTasks: 1`
- Happy path: `PUT /task/:id` with `{ milestoneId: "..." }` links the task
- Happy path: `PUT /task/:id` with `{ milestoneId: null }` unlinks the task
- Error path: `PUT /task/:id` with milestoneId from a different project returns 400
- Edge case: Milestone with zero linked tasks returns `totalTasks: 0, completedTasks: 0`
- Integration: Updating a task's milestoneId is reflected in the next GET milestones response

**Verification:**
- Milestones endpoint returns progress counts
- Task milestone linking works bidirectionally (link from task side, see from milestone side)

---

- [x] **Unit 3: Frontend data layer — types, fetchers, and hooks updates**

**Goal:** Update the Milestone type, frontend Task type, fetchers, and hooks to support the new fields.

**Requirements:** R1, R3, R4

**Dependencies:** Unit 2

**Files:**
- Modify: `apps/web/src/types/milestone/index.ts`
- Modify: `apps/web/src/types/task/index.ts` (add milestoneId)
- Modify: `apps/web/src/fetchers/milestone/get-milestones.ts` (handle annotated response)
- Modify: `apps/web/src/hooks/mutations/task/use-update-task.ts` (if needed to accept milestoneId — may already work if backend accepts it)
- Test: `apps/web/src/types/milestone/index.ts` (type validation)

**Approach:**
- Milestone type: add `description?: string`, `totalTasks: number`, `completedTasks: number`
- Task type: add `milestoneId?: string | null`
- Update get-milestones fetcher if the response shape changed (annotated fields)
- The existing `useUpdateTask` mutation should already handle arbitrary fields via the API client, but verify

**Patterns to follow:**
- `apps/web/src/types/milestone/index.ts` for current Milestone type
- `apps/web/src/types/task/index.ts` for current Task type
- `apps/web/src/fetchers/milestone/get-milestones.ts` for fetcher shape

**Test scenarios:**
- Happy path: `useGetMilestones` returns milestones with `totalTasks` and `completedTasks` populated
- Happy path: task type includes `milestoneId` field
- Edge case: milestone with no linked tasks has `totalTasks: 0` in the typed response

**Verification:**
- TypeScript compiles without errors with the updated types
- Milestone data loads in the Gantt route with progress fields

---

- [x] **Unit 4: Gantt hover tooltip with progress display**

**Goal:** Add a Radix Tooltip to the milestone diamond that shows on hover with milestone name, progress ring, task count, and target date.

**Requirements:** R1, R4

**Dependencies:** Unit 3

**Files:**
- Modify: `apps/web/src/components/gantt/gantt-milestone-row.tsx`

**Approach:**
- Wrap the diamond `PopoverTrigger` in a `TooltipProvider` + `Tooltip` + `TooltipTrigger` (outer wrapper)
- Tooltip `side="top"`, `align="center"`, shows on hover (~300ms delay)
- Tooltip content: milestone title (truncated), small circular progress ring (SVG, percentage inside), "X tasks" text, formatted target date
- Progress ring: simple SVG circle with `stroke-dasharray` based on percentage. Green when >= 80%, primary when >= 40%, amber when < 40%
- The existing click `Popover` (edit form) sits inside the `TooltipTrigger` — Radix handles the interaction: hover shows tooltip, click opens popover and closes tooltip
- Import `Tooltip` from `@/components/ui/tooltip`

**Patterns to follow:**
- `apps/web/src/components/ui/tooltip.tsx` — Radix Tooltip component
- `apps/web/src/components/task/task-properties-sidebar.tsx` — uses `TooltipProvider` + `Tooltip` + `TooltipTrigger asChild` pattern

**Test scenarios:**
- Happy path: hovering over a diamond shows tooltip with correct milestone name, progress %, task count, and date
- Happy path: progress ring shows 100% green when all linked tasks are "done"
- Happy path: progress ring shows 0% when no tasks are linked
- Edge case: clicking the diamond while tooltip is visible opens the edit popover and hides the tooltip
- Happy path: tooltip disappears when mouse leaves the diamond area

**Verification:**
- Hovering over milestone diamonds shows the tooltip in all zoom levels (day/week/month)
- Click behavior (edit popover) still works correctly
- Tooltip doesn't overlap or clip with the Gantt header row

---

- [x] **Unit 5: Vertical dashed line through task rows**

**Goal:** Render a vertical dashed line from each milestone diamond down through all task rows.

**Requirements:** R2, R6

**Dependencies:** Unit 3

**Files:**
- Modify: `apps/web/src/components/gantt/gantt-milestone-row.tsx`
- Modify: `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/gantt.tsx`

**Approach:**
- The vertical line needs to span from the milestone diamond row down through all task group rows. Two possible approaches:
  1. Render the line in a shared overlay container that sits behind task bars but above the grid
  2. Render a line segment in each task row, aligned to the same column position
- Preferred approach (1): Add an absolute-positioned overlay div in the Gantt scroll container, behind task bars (`z-[5]`). For each milestone, render a `div` with `position: absolute`, `top: 0`, `height: 100%`, `border-left: 2px dashed hsl(var(--primary) / 0.3)`, `left` computed using `getColumnIndex` and `columnWidthRem`. The overlay container sits behind task bars (task bars are `z-[10]`) but above the background grid.
- Pass milestones + timeline data to the overlay container from the Gantt route
- Only render on desktop (match existing `!isMobile && milestones.length > 0` guard)

**Patterns to follow:**
- `apps/web/src/components/gantt/gantt-task-bar.tsx` for absolute positioning within the timeline grid
- `getColumnIndex` from `apps/web/src/lib/gantt-utils.ts` for column position calculation

**Test scenarios:**
- Happy path: vertical dashed line appears from diamond to bottom of task area at correct horizontal position
- Happy path: line color is subtle (primary at ~30% opacity) and does not obscure task bars
- Edge case: multiple milestones on the same date render overlapping lines (acceptable — they align)
- Edge case: line position is correct in week and month zoom levels
- Happy path: line disappears when the milestone is deleted
- Happy path: line extends through collapsed group headers as well as expanded task rows

**Verification:**
- Dashed lines appear at correct horizontal positions for each milestone in all zoom levels
- Task bars render on top of the lines (z-index ordering correct)
- Lines don't cause horizontal scrollbar or overflow issues

---

- [x] **Unit 6: Task milestone selector in properties sidebar**

**Goal:** Add a milestone selector to the task detail sheet properties sidebar, allowing users to link/unlink tasks from milestones.

**Requirements:** R3

**Dependencies:** Unit 3

**Files:**
- Create: `apps/web/src/components/task/task-milestone-popover.tsx`
- Modify: `apps/web/src/components/task/task-properties-sidebar.tsx`

**Approach:**
- Create `TaskMilestonePopover` following the `TaskStatusPopover` / `TaskPriorityPopover` pattern
- Trigger: ghost button with a `Diamond` icon (lucide `Diamond` or `Milestone`) + milestone title or "Set milestone" if none
- PopoverContent: scrollable list of project milestones (from `useGetMilestones(projectId)`). Each item shows diamond icon + title + target date. Current selection has a `Check` icon. Top item: "No milestone" to clear.
- Selection calls `useUpdateTask` with `{ milestoneId: selectedId }` or `null` to clear
- Add the popover to `TaskPropertiesSidebar` in the properties row, after the due date popover, before the labels popover. Use the same ghost button styling.
- Import `useGetMilestones` and `useUpdateTask`

**Patterns to follow:**
- `apps/web/src/components/task/task-status-popover.tsx` — exact popover structure with selection list and check icon
- `apps/web/src/components/task/task-properties-sidebar.tsx` — placement pattern for property popovers in the sidebar

**Test scenarios:**
- Happy path: clicking milestone trigger opens popover listing all project milestones sorted by targetDate
- Happy path: selecting a milestone links the task (milestoneId updates, popover closes)
- Happy path: selecting "No milestone" sets milestoneId to null
- Edge case: popover shows empty state when project has no milestones
- Happy path: current milestone shows a check icon in the list
- Happy path: after linking, the sidebar button updates to show the milestone name

**Verification:**
- Milestone selector appears in the task detail sheet sidebar
- Linking/unlinking works and persists
- The Gantt hover tooltip for the linked milestone shows the updated task count

## System-Wide Impact

- **Interaction graph:** Milestone query (`useGetMilestones`) is now consumed in two places: Gantt route and task properties sidebar. Both use the same query key `["milestones", projectId]`, so cache is shared.
- **Error propagation:** Milestone fetch failures in the sidebar show an empty list (graceful). Task update failures show a toast error (existing pattern).
- **State lifecycle risks:** Linking a task to a milestone triggers `useUpdateTask` which invalidates `["tasks", projectId]`. The milestone query (`["milestones", projectId]`) also needs invalidation to refresh progress counts — ensure the mutation's `onSuccess` invalidates both query keys.
- **API surface parity:** The milestone selector is added to the task detail sheet only. Board, list, and backlog views don't show milestones (deferred). The same `useUpdateTask` mutation is reused.
- **Integration coverage:** Linking a task to a milestone from the sidebar and then viewing the Gantt hover tooltip should show the updated count. This cross-component flow should be verified manually.
- **Unchanged invariants:** Milestone CRUD (create/edit/delete from Gantt) remains unchanged. Task drag/resize, click-to-open, search/filter, zoom, and grouping are not affected. The `milestoneId` FK is nullable — existing tasks without milestones continue to work identically.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Progress annotation query is slow with many milestones/tasks | Annotate in a single query using SQL subqueries, not N+1 fetches. Add index on `taskTable.milestoneId`. |
| Vertical dashed lines cause visual noise with many milestones | Cap at reasonable count (10-15 milestones per project is typical). Lines use low-opacity primary color. |
| Tooltip and Popover conflict on same trigger | Radix handles this natively — Tooltip shows on hover, Popover on click. Verified pattern from Radix docs. |
| milestoneId FK migration on large task table | Nullable FK with no default — migration is instant (no rewrite). Existing rows get NULL. |
| Task update validation allows milestoneId from wrong project | Validate in the task update controller: if milestoneId provided, query milestone and verify `milestone.projectId === task.projectId`. |

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-18-milestone-enhancements-requirements.md](docs/brainstorms/2026-04-18-milestone-enhancements-requirements.md)
- Plane milestone docs: https://docs.plane.so/core-concepts/projects/milestones
- Existing milestone schema: `apps/api/src/database/schema.ts`
- Gantt milestone row: `apps/web/src/components/gantt/gantt-milestone-row.tsx`
- Task properties sidebar: `apps/web/src/components/task/task-properties-sidebar.tsx`
- Completed Gantt plan: `docs/plans/2026-04-18-001-feat-linear-gantt-enhancements-plan.md`
