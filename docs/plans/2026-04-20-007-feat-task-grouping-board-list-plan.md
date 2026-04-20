---
title: "feat: Add grouping options to Board and List views"
type: feat
status: active
date: 2026-04-20
---

# feat: Add grouping options to Board and List views

## Overview

Both the Kanban Board and List View currently group tasks exclusively by workflow status (columns). This plan adds a "Group by" control to the toolbar, letting users restructure the view by **priority**, **assignee**, **label**, or **due date** in addition to the existing status grouping.

The add-task button is also moved from each column's footer to the **top-right of the column header** as a minimal icon-only plus button — applying to all grouping modes including status.

## Problem Frame

Users need to see their task landscape from different angles: "what's blocking?" (group by priority), "who is overloaded?" (group by assignee), "what's due soon?" (group by due date). The current status-only grouping forces users to filter instead, losing cross-status visibility.

## Requirements Trace

- R1. Users can select a "Group by" dimension from the BoardToolbar
- R2. Supported dimensions: status (default), priority, assignee, label, due date
- R3. Both Board and List views reflect the active grouping without layout changes to those components
- R4. Non-status groupings disable drag-and-drop (reordering within a live group has no stable status target)
- R5. Task creation is available from any group via a minimal plus button at the top-right of each column header; the created task is pre-filled with the group's attribute and defaults status to the first non-final workflow column
- R6. Grouping preference persists per-project in localStorage, parallel to filters
- R7. ListView section expansion resets to all-open when the active grouping changes
- R8. Synthetic group columns always have `isFinal: false` so the Archive action is never triggered

## Scope Boundaries

- No backend changes — all grouping is client-side transformation
- No changes to the task data model or API responses
- Milestone grouping is not included in this iteration (deferred)

### Deferred to Separate Tasks

- Group by milestone: requires fetching milestone names for display — separate iteration
- Saving grouping preference to a user profile on the server — can be added later on top of the localStorage layer

## Context & Research

### Relevant Code and Patterns

- `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/board.tsx` — owns all state; derives `sortedProject` via `useMemo`; the new `groupedProject` derivation slots in after it
- `apps/web/src/lib/sort-tasks.ts` — pure function pattern to mirror for `group-tasks.ts`
- `apps/web/src/components/board/board-toolbar.tsx` — contains `SortControl` dropdown; `GroupByControl` follows the same pattern
- `apps/web/src/components/common/sort-control.tsx` — simplest dropdown control pattern in the codebase
- `apps/web/src/hooks/use-task-filters-with-labels-support.ts` — filter hook with localStorage persistence keyed by `kaneo:board-filters:${projectId}`; `useGroupBy` mirrors this pattern
- `apps/web/src/components/kanban-board/index.tsx` — iterates `project.columns`; passes `disableDragDrop` down
- `apps/web/src/components/list-view/index.tsx` — same column iteration; owns `expandedSections` local state
- `apps/web/src/components/kanban-board/column/column-header.tsx` — receives `column` prop; plus button added here
- `apps/web/src/components/kanban-board/column/column-footer.tsx` — existing add-task button to be removed
- `apps/web/src/types/task/index.ts` — `Task` type; all grouping fields are already present
- `apps/web/src/types/project/index.ts` — `ProjectWithTasks` shape; synthetic columns conform to the same shape

### Key Task Fields Available for Grouping

| GroupField | Task field | Null group label |
|---|---|---|
| `status` | `task.status` (column ID) | — (all tasks have a status) |
| `priority` | `task.priority` | "No priority" |
| `assignee` | `task.userId` / `task.assigneeName` | "Unassigned" |
| `label` | `task.labels[]` (inline in API response) | "No label" |
| `dueDate` | `task.dueDate` | "No due date" |

Labels are already embedded inline on each task in the `get-tasks` API response — no TanStack Query cache lookups needed for grouping.

## Key Technical Decisions

- **Synthetic columns conform to `ProjectWithTasks` shape**: `groupTasks` returns the same `columns: Column[]` type so `KanbanBoard` and `ListView` need no structural changes — they just receive different column data.
- **`isFinal: false` on all synthetic columns**: prevents the Archive button from appearing on non-status groups.
- **Grouping is the outermost transformation** in the pipeline: filter → sort → group. Filters still apply within each group.
- **Per-project persistence in localStorage** under `kaneo:group-by:${projectId}`, matching the filter pattern. Not stored in `useUserPreferencesStore` (that store is global, not per-project).
- **Multi-label tasks appear in each matching label group**: a task with two labels appears in both groups. Group task counts reflect this duplication; any header summary should show unique task count.
- **Due-date buckets**: overdue / today / this week / next week / later / no due date. Task creation from a due-date group does not pre-fill a date (too ambiguous); status defaults to first non-final column.
- **Plus button moves to column header**: applies universally to all groupings. `ColumnFooter` add-task button is removed. The header button passes the group's pre-fill values to `CreateTaskModal`.

## Open Questions

### Resolved During Planning

- *Should the add-task button be hidden for non-status groups?* Resolved: No — move it to the column header top-right as a minimal icon button and pre-fill the group attribute. (User decision, 2026-04-20)
- *Global vs. per-project persistence?* Resolved: per-project, matching filter behavior.
- *Are labels lazy-loaded from cache?* Resolved: No — labels are embedded in the `get-tasks` response. `task.labels[]` is directly usable.
- *Should DnD be disabled for non-status groupings?* Resolved: Yes — the `disableDragDrop` prop already exists in `KanbanBoard` and `ListView`; extend it for non-status groupings.

### Deferred to Implementation

- Exact bucket boundary logic for due-date grouping (today/this-week/next-week thresholds; timezone handling)
- Whether to suppress the sort dropdown when grouped by a field that conflicts (e.g. grouped by priority, sort by priority is redundant) — assess during implementation
- Group ordering for assignee (alphabetical vs. task-count desc) — decide at implementation time; alphabetical is a safe default

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
board.tsx data pipeline:
  useGetTasks(projectId)
    → filteredProject  (useTaskFiltersWithLabelsSupport)
    → sortedProject    (useMemo: sortTasks per column)  [existing]
    → groupedProject   (useMemo: groupTasks flat tasks → synthetic columns)  [NEW]
    → <KanbanBoard project={groupedProject} disableDragDrop={groupBy !== "status"} />
    → <ListView project={groupedProject} disableDragDrop={groupBy !== "status"} />

groupTasks(tasks: Task[], groupBy: GroupField, statusColumns: Column[]): Column[]
  - if groupBy === "status": return statusColumns unchanged
  - else: flatten all tasks → bucket by field → return synthetic Column[]
    - each synthetic column: { id: "<field>:<value>", name: displayLabel, isFinal: false, tasks: [] }
    - null/missing values → "No X" bucket appended last

GroupField = "status" | "priority" | "assignee" | "label" | "dueDate"

CreateTaskModal pre-fill by group:
  - status grouping:   { status: column.id }         (existing behavior)
  - priority grouping: { priority: group.value, status: firstNonFinalColumnId }
  - assignee grouping: { userId: group.value, status: firstNonFinalColumnId }
  - label grouping:    { labelId: group.value, status: firstNonFinalColumnId }
  - dueDate grouping:  { status: firstNonFinalColumnId }  (no date pre-fill)
  - "No X" groups:     { status: firstNonFinalColumnId }
```

## Implementation Units

- [ ] **Unit 1: `group-tasks.ts` pure utility**

**Goal:** A single pure function that transforms a flat task array into a synthetic `Column[]` ready to be consumed by the existing board/list view components.

**Requirements:** R2, R3, R8

**Dependencies:** None — pure utility with no component dependencies

**Files:**
- Create: `apps/web/src/lib/group-tasks.ts`
- Test: `apps/web/src/lib/group-tasks.test.ts`

**Approach:**
- Export `GroupField = "status" | "priority" | "assignee" | "label" | "dueDate"` union type
- Export `groupTasks(tasks: Task[], groupBy: GroupField, statusColumns: Column[]): Column[]`
- For `"status"`: return `statusColumns` unchanged (zero transform, preserves `isFinal`)
- For all other fields: flatten all tasks, bucket by field value, return synthetic columns
- Synthetic column shape: `{ id: "${field}:${value}", name: displayLabel, isFinal: false, tasks: [] }`
- Null bucket appended last: `{ id: "${field}:none", name: "No priority" | "Unassigned" | etc. }`
- Priority group order: urgent → high → medium → low → no priority (mirrors `priorityOrder` in `sort-tasks.ts`)
- Assignee group order: alphabetical by `assigneeName`
- Label grouping: emit one column entry per label; tasks with multiple labels appear in each matching column
- Due date grouping: overdue → today → this week → next week → later → no due date

**Patterns to follow:**
- `apps/web/src/lib/sort-tasks.ts` — pure function, typed inputs, no side effects

**Test scenarios:**
- Happy path — `groupBy: "priority"`: tasks with different priorities are separated into correct columns; task with null priority lands in "No priority" column
- Happy path — `groupBy: "status"`: returns the original `statusColumns` array unchanged (referential equality check acceptable)
- Happy path — `groupBy: "label"`: task with 2 labels appears in 2 separate columns; task with 0 labels lands in "No label" column
- Happy path — `groupBy: "assignee"`: tasks grouped by `userId`; columns labelled by `assigneeName`
- Happy path — `groupBy: "dueDate"`: a task with a past due date lands in "Overdue"; a null dueDate lands in "No due date"
- Edge case — empty task array: returns empty columns array (not null/undefined)
- Edge case — all tasks have null priority: single "No priority" column with all tasks
- Edge case — single task: one column with one task, no crashes
- Edge case — `isFinal` on synthetic columns: all returned columns have `isFinal: false`
- Edge case — priority group order: urgent group appears before high, high before medium, null group last

**Verification:**
- `pnpm --filter @kaneo/web test -- apps/web/src/lib/group-tasks.test.ts` passes with no failures
- TypeScript compiles cleanly

---

- [ ] **Unit 2: `useGroupBy` hook**

**Goal:** A hook that reads/writes the per-project group-by preference from localStorage, parallel to `useTaskFiltersWithLabelsSupport`.

**Requirements:** R6

**Dependencies:** Unit 1 (uses `GroupField` type)

**Files:**
- Create: `apps/web/src/hooks/use-group-by.ts`
- Test: `apps/web/src/hooks/use-group-by.test.ts`

**Approach:**
- Signature: `useGroupBy(projectId: string): { groupBy: GroupField; setGroupBy: (f: GroupField) => void }`
- Persist under `kaneo:group-by:${projectId}` in localStorage
- Default value: `"status"` (existing behavior when no preference stored)
- Validate stored value against the `GroupField` union on read (guard against stale/invalid values); fall back to `"status"` if invalid
- No Zustand — plain `useState` + `localStorage` read/write, following `use-task-filters.ts` pattern

**Patterns to follow:**
- `apps/web/src/hooks/use-task-filters-with-labels-support.ts` — localStorage key pattern, `normalizeFilters`-style validation

**Test scenarios:**
- Happy path — first load with no stored value: returns `"status"` as default
- Happy path — stored valid value: returns the stored `GroupField`
- Happy path — `setGroupBy("priority")`: updates state and writes to localStorage
- Edge case — stored value is an invalid string (stale/corrupt): falls back to `"status"` without throwing
- Edge case — `projectId` changes: returns the preference for the new project, not the previous one

**Verification:**
- Hook returns correct default and persists correctly when tested in isolation
- TypeScript compiles cleanly

---

- [ ] **Unit 3: `GroupByControl` in BoardToolbar**

**Goal:** Add a "Group by" dropdown to the BoardToolbar, visually consistent with the existing Sort control.

**Requirements:** R1, R2

**Dependencies:** Unit 1 (`GroupField` type), Unit 2 (`useGroupBy` hook)

**Files:**
- Modify: `apps/web/src/components/board/board-toolbar.tsx`
- Modify: `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/board.tsx`

**Approach:**
- Add `groupBy: GroupField` and `onGroupByChange: (f: GroupField) => void` props to `BoardToolbar`
- Render a `DropdownMenu` containing one `DropdownMenuItem` per `GroupField` value; active item indicated with a check mark (reuse `CheckSlot` pattern from the toolbar's sort control)
- Button label: "Group: Status" / "Group: Priority" / etc. — shows active group inline
- Slot: left side of toolbar, after Filter button, before Sort button
- Wire `useGroupBy(projectId)` in `board.tsx` and pass down to `BoardToolbar`
- All user-facing strings must go through `t()` for i18n (i18next)

**Patterns to follow:**
- `apps/web/src/components/common/sort-control.tsx` — same dropdown structure, single-select items
- `apps/web/src/components/board/board-toolbar.tsx` — existing filter/sort button styling

**Test scenarios:**
- Test expectation: none — toolbar rendering is a UI concern verified via the agent-browser dev server test

**Verification:**
- Dropdown renders in toolbar; selecting a group option calls `onGroupByChange` with the correct `GroupField`
- Active group is reflected in button label
- All labels render (no missing translation keys)

---

- [ ] **Unit 4: Column header plus button + remove footer add-task**

**Goal:** Move the add-task entry point from `ColumnFooter` to the top-right of `ColumnHeader` as a minimal icon-only plus button. The button must work correctly for all grouping modes (pre-filling the group attribute for non-status groups).

**Requirements:** R5

**Dependencies:** Unit 1 (`GroupField` type)

**Files:**
- Modify: `apps/web/src/components/kanban-board/column/column-header.tsx`
- Modify: `apps/web/src/components/kanban-board/column/column-footer.tsx`
- Modify: `apps/web/src/components/list-view/index.tsx` (list view column section header)

**Approach:**
- Add a `+` icon button (Lucide `Plus`, small, muted/ghost variant) to the top-right area of `ColumnHeader`
- Button opens `CreateTaskModal` with pre-fill props:
  - `groupBy === "status"`: `{ status: column.id }` — same as the footer button today
  - `groupBy === "priority"`: `{ priority: groupValue, status: firstNonFinalColumnId }`
  - `groupBy === "assignee"`: `{ userId: groupValue, status: firstNonFinalColumnId }`
  - `groupBy === "label"`: `{ labelId: groupValue, status: firstNonFinalColumnId }`
  - `groupBy === "dueDate"`: `{ status: firstNonFinalColumnId }` (no date pre-fill)
  - Any "No X" null group: `{ status: firstNonFinalColumnId }`
- `firstNonFinalColumnId` is derived from the original status columns (passed through from `board.tsx`)
- Remove (or suppress) the add-task button from `ColumnFooter` — footer may remain for other actions (e.g. archive) but the "+ Add task" text button is removed
- Apply same change to ListView's `ColumnSection` header

**Patterns to follow:**
- Existing `CreateTaskModal` invocation in `column-footer.tsx` — props interface to understand what pre-fill fields are accepted

**Test scenarios:**
- Test expectation: none — button placement and pre-fill behavior verified via the agent-browser dev server test

**Verification:**
- Plus button visible at column header top-right in both board and list views for all group modes
- Creating a task from a "Priority: High" group pre-fills priority to high and sets a valid status
- Footer no longer shows the "+ Add task" text button

---

- [ ] **Unit 5: `board.tsx` integration**

**Goal:** Wire `useGroupBy` and `groupTasks` into the board route's data pipeline; pass correct props to both view components.

**Requirements:** R1, R3, R4, R6

**Dependencies:** Units 1, 2, 3, 4

**Files:**
- Modify: `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/board.tsx`

**Approach:**
- Call `useGroupBy(projectId)` to get `{ groupBy, setGroupBy }`
- Add a `groupedProject` `useMemo` after the existing `sortedProject` derivation:
  - Flatten all tasks from `sortedProject.columns`
  - Call `groupTasks(flatTasks, groupBy, project.columns)` to produce synthetic columns
  - Return a new `ProjectWithTasks` with the synthetic columns
- Pass `groupedProject` (not `sortedProject`) to `<KanbanBoard>` and `<ListView>`
- Pass `disableDragDrop={groupBy !== "status"}` to both views (this prop already exists)
- Pass `groupBy` and `firstNonFinalColumn` down to column components (for plus-button pre-fill) via the project prop or a separate prop — assess cleanest path during implementation
- Pass `{ groupBy, onGroupByChange: setGroupBy }` to `BoardToolbar`

**Patterns to follow:**
- Existing `sortedProject` `useMemo` in `board.tsx` — same derivation pattern
- `disableDragDrop` prop usage in `kanban-board/index.tsx`

**Test scenarios:**
- Test expectation: none — integration is a UI concern verified via the dev server test

**Verification:**
- Switching group mode in the toolbar causes visible regrouping in both Board and List views
- Grouping preference survives page navigation and returns on revisit
- DnD is active for status grouping, inactive for all others
- TypeScript compiles cleanly with no `any` casts

---

- [ ] **Unit 6: ListView `expandedSections` reset**

**Goal:** When the active grouping changes, all ListView sections reset to expanded so the user sees full content rather than stale-keyed collapsed groups.

**Requirements:** R7

**Dependencies:** Unit 5 (groupBy prop flows into ListView)

**Files:**
- Modify: `apps/web/src/components/list-view/index.tsx`

**Approach:**
- Accept `groupBy: GroupField` as a prop on `ListView` (or derive it from the column IDs)
- Add a `useEffect` that watches the columns key-set (column IDs joined); when it changes, reset `expandedSections` to all `true` for the new column IDs
- This handles the case where switching groupBy produces columns with different IDs than the previous grouping, which would leave new sections collapsed (undefined === falsy in the current init logic)

**Patterns to follow:**
- Existing `expandedSections` initialization in `apps/web/src/components/list-view/index.tsx`

**Test scenarios:**
- Test expectation: none — collapse/expand behavior verified via the dev server test

**Verification:**
- Switching from status grouping to priority grouping opens all priority group sections in ListView
- Switching back to status re-opens all status sections

---

## System-Wide Impact

- **Interaction graph:** `board.tsx` is the single orchestration point. `KanbanBoard`, `ListView`, and `BoardToolbar` all receive data or props from it — no other routes are affected.
- **DnD:** `disableDragDrop` prop already threaded through both view components; extend it for `groupBy !== "status"`. No changes to DnD core logic.
- **Filters:** Filters continue to apply upstream of grouping. An active status filter while grouped by priority will narrow which tasks appear in each priority group — this is valid behavior. Active filter chips in the toolbar remain visible to communicate the narrowing.
- **Bulk selection:** `BulkToolbar` actions (e.g. "Move to status") operate on task IDs and hit the API directly; they self-heal after mutation invalidation. No immediate conflict, but optimistic updates may flash briefly during re-grouping.
- **Archive action:** Suppressed on all synthetic columns via `isFinal: false` (Unit 1 invariant). The archive button only appears on status columns where `isFinal` is set by the project schema.
- **Unchanged invariants:** API contracts, task mutation hooks, filter state, and sort state are untouched. The `ProjectWithTasks` type is reused (not extended) for synthetic columns.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Multi-label task duplication confuses task count | Group headers show per-group count; no global count shown in grouped view unless unique-counted |
| `CreateTaskModal` pre-fill interface may not accept all group fields today | Inspect modal props during Unit 4 implementation; add optional props as needed |
| Due-date bucket boundaries vary by timezone | Use local date (no UTC conversion) consistent with how `dueDate` is already rendered in task cards |
| Synthetic column IDs collide with real column IDs | Prefix synthetic IDs: `"priority:high"`, `"assignee:abc"` — real status IDs are plain slugs like `"to-do"` |

## Sources & References

- Related code: `apps/web/src/lib/sort-tasks.ts`
- Related code: `apps/web/src/hooks/use-task-filters-with-labels-support.ts`
- Related code: `apps/web/src/components/board/board-toolbar.tsx`
- Related code: `apps/web/src/components/kanban-board/column/column-footer.tsx`
- Related code: `apps/web/src/components/list-view/index.tsx`
