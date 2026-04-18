---
title: "feat: Linear-style Gantt enhancements (80/20) + milestones"
type: feat
status: active
date: 2026-04-18
---

# feat: Linear-style Gantt enhancements (80/20) + milestones

## Overview

The existing Gantt chart is solid — drag/resize, today marker, weekend shading, click-to-open — but looks and feels flat compared to Linear's timeline. This plan adds the 20% of features that deliver 80% of the "Linear-like" experience: status-colored bars, grouping by workflow column, a zoom toggle (Day/Week/Month), a "Today" scroll button, and project milestones.

Milestones are project-level point-in-time markers rendered as diamond shapes on the timeline. They require a new DB table and API CRUD, but the frontend rendering is straightforward given the existing CSS Grid positioning system.

The linear-gantt GitHub repo (herval/linear-gantt) is a Python/Streamlit app — not directly reusable. We extend the existing custom CSS Grid implementation.

## Problem Frame

The Gantt currently renders every task in the same primary color in a flat, date-sorted list. At a glance, users can't distinguish workflow stage, can't navigate to today without scrolling manually, and month-spanning projects are illegible at day resolution. Linear's timeline solves all three problems.

## Requirements Trace

- R1. Task bars are color-coded by their workflow status — visible instantly, no interaction required
- R2. Tasks are grouped by status column (To Do / In Progress / In Review / Done) with collapsible sections, matching board view structure
- R3. A zoom toggle (Day / Week / Month) controls timeline column granularity — the single highest-value navigation improvement
- R4. A "Today" button scrolls the viewport to center on the current date
- R5. Project milestones are created, edited, deleted, and rendered as diamond markers on the timeline at their target date

## Scope Boundaries

- No dependency arrows (complex SVG math, `task_relation` not wired to Gantt)
- No progress fill (no completion percentage in data model)
- No assignee avatar grouping (separate concern, low priority)
- No quarter view (edge case, rarely needed)
- Milestones are project-level only — no task-level milestones
- No milestone dependency linking to specific tasks

## Context & Research

### Relevant Code and Patterns

- Route: `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/gantt.tsx`
- Bar component: `apps/web/src/components/gantt/gantt-task-bar.tsx`
- Status constants: `apps/web/src/constants/columns.ts` — four default statuses: `to-do`, `in-progress`, `in-review`, `done`
- Status label utility: `apps/web/src/lib/i18n/domain.ts` (`getStatusLabel`)
- Due-date color pattern: `apps/web/src/lib/due-date-status.ts` — model for a new status-color utility
- Task type: `apps/web/src/types/task/index.ts` — `status: string`, no `priority` color field
- `date-fns` 4.x is already installed: `eachWeekOfInterval`, `eachMonthOfInterval`, `differenceInWeeks`, `differenceInCalendarMonths` are all available
- DB schema pattern: `apps/api/src/database/schema.ts` — CUID2 PK, `createdAt`/`updatedAt` timestamps, explicit FK cascade. Follow `taskTable` as the reference pattern.
- API route pattern: `apps/api/src/task/index.ts` + controllers — thin route handler, business logic in controller file

### Key Architecture Facts

- `timeline.days` is currently an array of `Date[]` (one per day) — for week/month views this becomes one entry per week/month
- Bar position is computed in `gantt-task-bar.tsx` via `differenceInCalendarDays(date, rangeStart)` — must generalize for other granularities
- The scroll container is an anonymous `div.overflow-auto` in the route — needs a ref for Today button
- `pixelsPerDay` is derived from a `ResizeObserver` on `timelineTrackRef` — becomes `pixelsPerColumn` with zoom
- Task data comes from `useGetTasks` which returns `project.columns[].tasks` and `project.plannedTasks`
- The `task.columnId` field exists on `Task` — usable for grouping

## Key Technical Decisions

- **Granularity-aware column index**: Replace `differenceInCalendarDays` with a `getColumnIndex(date, rangeStart, granularity)` helper. For `day`: same as current. For `week`: `differenceInCalendarWeeks`. For `month`: `differenceInCalendarMonths`. This single helper makes bar positioning granularity-agnostic. Lives in `apps/web/src/lib/gantt-utils.ts`.

- **Timeline object shape stays the same**: `{ days, rangeStart, gridTemplateColumns, timelineMinWidthRem }` — `days` becomes an array of period-start dates (days for day view, week-start dates for week view, month-start dates for month view). Bar and header code iterates the same `timeline.days` array regardless of granularity. No consumer refactor needed beyond passing granularity to `getColumnIndex`.

- **Column widths by zoom**: `day = 2.75rem` (current), `week = 5rem`, `month = 7rem`. Wider columns compensate for fewer columns.

- **Status color utility file**: `apps/web/src/lib/gantt-status-colors.ts` — maps status string to Tailwind classes (bg, border, accent). Follows the existing pattern in `due-date-status.ts`. This is the source of truth for all status colors on the Gantt.

- **Grouping structure**: Route derives `statusGroups: { columnId: string; columnName: string; tasks: ScheduledTask[] }[]` from `project.columns` (in column order) plus a synthetic "Planned" group for `project.plannedTasks`. Groups with zero tasks are hidden. Collapse state is local `useState<Set<string>>`.

- **Today button scroll math**: `offset = todayColIdx * columnWidthPx - scrollContainerWidth / 2`. For week/month zoom, `todayColIdx` uses `getColumnIndex`. Smooth-scrolls the outer container ref.

- **Milestone data fetch**: Separate `useGetMilestones(projectId)` query (`GET /milestone/project/:projectId`) in parallel with `useGetTasks`. Keeps the task query cache unaffected and mirrors the existing per-feature query pattern.

- **Milestone diamond rendering**: A `GanttMilestoneMarker` component rendered in a sticky overlay row just below the date header, before the task rows. Position is `left = getColumnIndex(milestone.targetDate, rangeStart, granularity) * columnWidthPx + columnWidthPx/2`. Diamond shape: a `div` rotated 45° via Tailwind `rotate-45`, sized ~12px. Tooltip shows title on hover. Click opens an edit popover.

- **Milestone create UX**: Toolbar "Add milestone" button opens a small modal asking for title + date. This avoids coordinate-pick math and is simpler than click-on-column-header. The date input defaults to today.

## Open Questions

### Resolved During Planning

- **Should groups default to collapsed or expanded?** All expanded. Collapsed-by-default hides the bars and defeats the purpose of the Gantt.
- **Do the `planned` tasks (no column) get their own group?** Yes — a "Planned" group at the top, styled with `muted` colors. These tasks have dates but aren't in any workflow column yet.
- **Week view: what day does a week column start on?** Monday (`weekStartsOn: 1`), matching the existing `startOfWeek` / `endOfWeek` calls in the route.
- **Should milestones show a vertical line across all task rows?** Deferred to implementation — the diamond marker in the header row is sufficient for V1. A full-height line can be added later without schema changes.

### Deferred to Implementation

- Exact Tailwind color tokens for each status (will pick from design system tokens, verify contrast at implementation time)
- Whether mobile should hide the zoom toggle or show a simplified 2-option version (Day/Month)

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
ZoomLevel = "day" | "week" | "month"

buildTimeline(tasks, zoomLevel, isMobile) → {
  days: Date[]          // one entry per column (day/week-start/month-start)
  rangeStart: Date
  granularity: ZoomLevel
  gridTemplateColumns: string
  timelineMinWidthRem: number
  columnWidthRem: number
}

getColumnIndex(date, rangeStart, granularity) → number
  day   → differenceInCalendarDays(date, rangeStart)
  week  → differenceInCalendarWeeks(date, rangeStart, { weekStartsOn: 1 })
  month → differenceInCalendarMonths(date, rangeStart)

// Header rendering per column:
day   → show "d" number, "MMM" label on month change, today circle
week  → show "MMM d" (week-start), "MMM" label on month change
month → show "MMM yyyy"

// Grouped row structure:
[
  { columnId: "planned",     columnName: "Planned",     tasks: [...plannedTasks with dates] },
  { columnId: "to-do",       columnName: "To Do",       tasks: [...] },
  { columnId: "in-progress", columnName: "In Progress", tasks: [...] },
  { columnId: "in-review",   columnName: "In Review",   tasks: [...] },
  { columnId: "done",        columnName: "Done",         tasks: [...] },
]

// Milestone marker row (between date header and task groups):
sticky overlay row, full timeline width, 24px tall
  for each milestone:
    diamond div at left = getColumnIndex(milestone.targetDate, rangeStart, granularity) * columnWidthPx
    tooltip: milestone.title
    click: open edit popover (title, targetDate, delete)

// Milestone data shape:
{ id, projectId, title, targetDate: Date }
```

## Implementation Units

- [ ] **Unit 1: Status color utility and colored bars**

**Goal:** Replace the flat `bg-primary/12` bar style with per-status colors so workflow stage is visible instantly.

**Requirements:** R1

**Dependencies:** None

**Files:**
- Create: `apps/web/src/lib/gantt-status-colors.ts`
- Modify: `apps/web/src/components/gantt/gantt-task-bar.tsx`

**Approach:**
- Create `getGanttStatusColors(status: string)` returning `{ bg: string; border: string; handleBg: string }` as Tailwind class strings
- Map `to-do` → slate/muted, `in-progress` → primary (blue, current), `in-review` → amber/warning, `done` → green/success, fallback → primary
- Update `GanttTaskBar`: replace hardcoded `bg-primary/12`, `border-primary/25`, `bg-primary/8` etc. with values from `getGanttStatusColors(task.status)`
- Pass `task.status` as a prop — it's already on the `ScheduledTask` type

**Patterns to follow:**
- `apps/web/src/lib/due-date-status.ts` — same shape for a status→classes mapping

**Test scenarios:**
- Happy path: task with status `in-progress` renders with primary color classes; `done` renders green
- Edge case: unknown status string falls back to primary color without throwing
- Happy path: resize handles and drag area inherit the correct status accent colors (not hardcoded primary)

**Verification:**
- Four status types show visually distinct colors in the Gantt
- No `bg-primary/12` hardcoded references remain in `gantt-task-bar.tsx`

---

- [ ] **Unit 2: Zoom levels (Day / Week / Month toggle)**

**Goal:** Add a zoom control that changes column granularity, making month-spanning projects readable.

**Requirements:** R3

**Dependencies:** Unit 1 (bar shape stays the same; granularity changes column math)

**Files:**
- Create: `apps/web/src/lib/gantt-utils.ts`
- Modify: `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/gantt.tsx`
- Modify: `apps/web/src/components/gantt/gantt-task-bar.tsx`

**Approach:**
- Extract `buildTimeline(tasks, zoomLevel, columnWidthRem)` from the current inline `useMemo` into `gantt-utils.ts`
  - `day`: current logic — `eachDayOfInterval`, `columnWidthRem = 2.75`
  - `week`: `eachWeekOfInterval({ weekStartsOn: 1 })`, `columnWidthRem = 5`
  - `month`: `eachMonthOfInterval`, `columnWidthRem = 7`
  - Add `granularity: ZoomLevel` to the returned object
- Add `getColumnIndex(date, rangeStart, granularity)` — single helper for column position math
  - `day`: `differenceInCalendarDays`
  - `week`: `differenceInCalendarWeeks(date, rangeStart, { weekStartsOn: 1 })`
  - `month`: `differenceInCalendarMonths`
- Update `GanttTaskBar` to accept `granularity` on the timeline prop and call `getColumnIndex` instead of `differenceInCalendarDays` directly
- Update the timeline header rendering: week columns show `MMM d` (week start); month columns show `MMM yyyy`; the "show month label on first day of month" logic becomes "show year label on first month of year" for month view
- Add a zoom toggle (segmented control / three buttons) to the toolbar row — `Day | Week | Month`. Desktop only; mobile defaults to day view and hides the toggle
- State: `const [zoom, setZoom] = useState<"day" | "week" | "month">("day")` in the route

**Patterns to follow:**
- Existing `isMobile` branching in the route for mobile-only behavior
- `apps/web/src/components/ui/button` for the toggle buttons, with `variant="outline"` + active state styling

**Test scenarios:**
- Happy path: switching to Week view re-renders columns as weeks, bar positions align correctly
- Happy path: switching to Month view collapses all months into single columns
- Edge case: task spanning a partial week shows bar from its start day's week column to its end day's week column (no rounding outside the task's actual span)
- Edge case: today falls in the middle of a week column — today circle appears on the correct week column header
- Happy path: zoom state persists when search query changes (independent state slices)

**Verification:**
- Day view is identical to current behavior
- Week view: each column represents Mon–Sun, header shows "Apr 14" etc.
- Month view: each column represents a calendar month
- Bar positions are accurate in all three views

---

- [ ] **Unit 3: Group tasks by status column**

**Goal:** Render tasks in labeled, collapsible workflow-status groups instead of a flat sorted list.

**Requirements:** R2

**Dependencies:** Unit 2 (zoom must be stable before restructuring the row renderer)

**Files:**
- Modify: `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/gantt.tsx`

**Approach:**
- Replace the flat `scheduledTasks` derivation with `statusGroups` — a `useMemo` over `project.columns` + `project.plannedTasks`:
  - For each project column (in column order), collect tasks with dates that match search query
  - Prepend a "Planned" group for `project.plannedTasks` tasks that have dates
  - Filter out groups with zero matching tasks
- Collapse state: `const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())` keyed by `columnId`
- Render a group header row before each group's task rows:
  - Full-width sticky-left label: status icon (from `DEFAULT_COLUMNS`), column name, task count badge, chevron
  - No timeline columns in the header row — it spans only the task rail width, with the timeline area showing a subtle divider line
  - Click toggles collapse for that group
- Collapsed groups: render only the header row, zero task rows
- The `DEFAULT_COLUMNS` icons (`Circle`, `CircleDot`, `Search`, `Check`) are already imported in `columns.ts` — use them in the group header

**Patterns to follow:**
- The existing task rail cell layout (sticky left, `z-[11]`, `border-r border-border`) for the group header sticky behavior
- `DEFAULT_COLUMNS` from `apps/web/src/constants/columns.ts` for icons and ordering

**Test scenarios:**
- Happy path: four workflow columns each render their tasks in separate labeled sections in correct order (Planned → To Do → In Progress → In Review → Done)
- Happy path: collapsing "In Progress" hides its task rows and collapses the timeline area for that group
- Edge case: a column with no scheduled tasks (all tasks lack dates) is omitted from the grouped view
- Happy path: search query filters tasks within each group, hiding empty groups if all tasks in that group are filtered out
- Edge case: `plannedTasks` that lack dates are not shown in the Planned group (they have no bar to render)

**Verification:**
- Tasks appear under their correct workflow column heading
- Collapse/expand works per group without affecting others
- The existing flat-list search filter behavior is preserved within the grouped structure

---

- [ ] **Unit 4: "Today" scroll button**

**Goal:** Add a "Today" button that scrolls the timeline viewport to center on today's date.

**Requirements:** R4

**Dependencies:** Unit 2 (scroll offset math must account for granularity)

**Files:**
- Modify: `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/gantt.tsx`

**Approach:**
- Add `scrollContainerRef = useRef<HTMLDivElement>` on the outer `div.overflow-auto`
- `handleScrollToToday()`:
  - `todayColIdx = getColumnIndex(today, timeline.rangeStart, timeline.granularity)`
  - `columnWidthPx = timeline.columnWidthRem * parseFloat(getComputedStyle(document.documentElement).fontSize)`
  - `offset = todayColIdx * columnWidthPx - scrollContainer.clientWidth / 2`
  - `scrollContainerRef.current.scrollTo({ left: Math.max(0, offset), behavior: "smooth" })`
- Disable (greyed) the button when `timeline` is null (no scheduled tasks)
- Button placement: toolbar row, right side, beside the zoom toggle. Label: "Today". Use `Calendar` icon from lucide-react. Desktop only — mobile hides it (already tight toolbar)
- On initial mount, scroll to today automatically (call `handleScrollToToday` once in a `useLayoutEffect` after the timeline is built)

**Patterns to follow:**
- Existing `Button` with `variant="outline"` and `size="xs"` in the toolbar
- `useLayoutEffect` pattern already in the route for `pixelsPerDay` initialization

**Test scenarios:**
- Happy path: clicking "Today" scrolls to approximately center today's column in the viewport
- Happy path: auto-scroll on mount lands today in view (within the first render of a timeline)
- Edge case: today is before `timeline.rangeStart` (today is outside the rendered range) — button scrolls to `left: 0` without throwing
- Edge case: today is after `timeline.rangeEnd` — button scrolls to `scrollWidth - clientWidth`

**Verification:**
- Clicking "Today" visually centers today's column in the scroll container
- Works correctly in all three zoom levels (day / week / month)
- Auto-scroll fires once on initial mount and not on re-renders

---

- [ ] **Unit 5: Milestone DB schema and migration**

**Goal:** Add a `milestone` table to the database to persist project milestones.

**Requirements:** R5

**Dependencies:** None (parallel with Units 1–4)

**Files:**
- Modify: `apps/api/src/database/schema.ts`
- Modify: `apps/api/src/database/relations.ts`
- Generate: `apps/api/drizzle/` (migration file via `pnpm --filter @kaneo/api db:generate`)

**Approach:**
- Add `milestoneTable` to `schema.ts`:
  - `id`: CUID2 primary key
  - `projectId`: FK → `projectTable.id`, `onDelete: "cascade"`, `onUpdate: "cascade"`
  - `title`: `text`, NOT NULL
  - `targetDate`: `timestamp({ mode: "date" })`, NOT NULL — date-only semantics, stored as midnight UTC
  - `createdAt`, `updatedAt`: standard timestamp fields
  - Index on `projectId`
- Add `milestoneRelations` to `relations.ts`: milestone belongsTo project; project hasMany milestones
- Run `db:generate` to produce the migration — migration auto-runs on API startup

**Patterns to follow:**
- `taskTable` in `apps/api/src/database/schema.ts` for CUID2, timestamps, FK cascade, and index patterns

**Test scenarios:**
- Test expectation: none — pure schema migration with no behavioral logic to assert

**Verification:**
- Migration file generated, table exists in DB after startup
- FK constraint rejects milestones for non-existent projectId
- Deleting a project cascades to delete its milestones

---

- [ ] **Unit 6: Milestone API CRUD endpoints**

**Goal:** Expose create, read, update, and delete endpoints for project milestones.

**Requirements:** R5

**Dependencies:** Unit 5

**Files:**
- Create: `apps/api/src/milestone/controllers/get-milestones.ts`
- Create: `apps/api/src/milestone/controllers/create-milestone.ts`
- Create: `apps/api/src/milestone/controllers/update-milestone.ts`
- Create: `apps/api/src/milestone/controllers/delete-milestone.ts`
- Create: `apps/api/src/milestone/index.ts`
- Modify: `apps/api/src/index.ts` (register milestone router)

**Approach:**
- `GET /milestone/project/:projectId` → returns all milestones for the project, ordered by `targetDate` asc
- `POST /milestone` → body: `{ projectId, title, targetDate }`, Valibot schema validates all required; returns created milestone
- `PUT /milestone/:id` → body: `{ title?, targetDate? }`, partial update; returns updated milestone
- `DELETE /milestone/:id` → deletes and returns `{ success: true }`
- All routes use `describeRoute` for OpenAPI docs and `validator` with Valibot schemas
- Route handlers are thin — DB logic lives in controllers
- Auth: routes use `c.get("userId")` — verify the requesting user has access to the project before read/write (follow the pattern used in task controllers)

**Patterns to follow:**
- `apps/api/src/task/index.ts` for route structure
- `apps/api/src/task/controllers/get-tasks.ts` for controller shape and auth check

**Test scenarios:**
- Happy path: `GET /milestone/project/:projectId` returns milestones sorted by `targetDate`
- Happy path: `POST /milestone` with valid body creates and returns a milestone
- Error path: `POST /milestone` with missing `title` returns 400
- Error path: `POST /milestone` for a `projectId` the user doesn't have access to returns 403
- Happy path: `PUT /milestone/:id` with only `title` updates title, leaves `targetDate` unchanged
- Error path: `PUT /milestone/:id` for non-existent id returns 404
- Happy path: `DELETE /milestone/:id` removes the milestone and returns success

**Verification:**
- All four operations work via API client or curl
- Non-member cannot read or mutate another project's milestones

---

- [ ] **Unit 7: Milestone frontend data layer**

**Goal:** Add fetcher, query hook, and mutation hooks so the Gantt can load and mutate milestones.

**Requirements:** R5

**Dependencies:** Unit 6

**Files:**
- Create: `apps/web/src/fetchers/milestone/get-milestones.ts`
- Create: `apps/web/src/fetchers/milestone/create-milestone.ts`
- Create: `apps/web/src/fetchers/milestone/update-milestone.ts`
- Create: `apps/web/src/fetchers/milestone/delete-milestone.ts`
- Create: `apps/web/src/hooks/queries/milestone/use-get-milestones.ts`
- Create: `apps/web/src/hooks/mutations/milestone/use-create-milestone.ts`
- Create: `apps/web/src/hooks/mutations/milestone/use-update-milestone.ts`
- Create: `apps/web/src/hooks/mutations/milestone/use-delete-milestone.ts`
- Create: `apps/web/src/types/milestone/index.ts`

**Approach:**
- `Milestone` type: `{ id: string; projectId: string; title: string; targetDate: string; createdAt: string }`
- `useGetMilestones(projectId)`: `queryKey: ["milestones", projectId]`, `refetchInterval: 30000` (matches task query cadence)
- Create/update/delete mutations invalidate `["milestones", projectId]` on success
- Fetchers call the API endpoints from Unit 6 with standard `fetch` + auth headers (follow existing fetcher pattern)

**Patterns to follow:**
- `apps/web/src/fetchers/task/get-tasks.ts` for fetcher shape
- `apps/web/src/hooks/queries/task/use-get-tasks.ts` for query hook shape
- `apps/web/src/hooks/mutations/task/use-update-task.ts` for mutation hook + cache invalidation

**Test scenarios:**
- Happy path: `useGetMilestones` returns parsed milestone array from the API
- Happy path: `useCreateMilestone` on success invalidates the milestones query, causing a refetch
- Error path: create mutation with a network error surfaces the error to the caller without crashing

**Verification:**
- Milestone data loads in the Gantt route without console errors
- Create/edit/delete mutations reflect in the UI within one refetch cycle

---

- [ ] **Unit 8: Milestone rendering and CRUD UI on the Gantt**

**Goal:** Render milestone diamonds on the timeline and let users create, edit, and delete them without leaving the Gantt.

**Requirements:** R5

**Dependencies:** Units 2, 7 (needs zoom-aware column positioning and milestone data)

**Files:**
- Create: `apps/web/src/components/gantt/gantt-milestone-row.tsx`
- Modify: `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/gantt.tsx`

**Approach:**
- `GanttMilestoneRow`: a full-width sticky row rendered between the date header and the first task group
  - Same horizontal scroll sync as the task grid (no separate scrollable container needed — it's part of the same `min-w-max` layout)
  - Row height: `1.75rem` (~28px)
  - For each milestone: render a diamond `div` (12px × 12px, `rotate-45`, `bg-primary border border-primary/50`) absolutely positioned via `left` pixel offset computed from `getColumnIndex(parseISO(milestone.targetDate), timeline.rangeStart, timeline.granularity)` and `columnWidthPx`
  - Hover: show tooltip with milestone title (Radix `Tooltip`)
  - Click: open a Radix `Popover` with: title input, date input, save button, delete button
  - Popover calls `useUpdateMilestone` on save, `useDeleteMilestone` on delete
- "Add milestone" button in the toolbar (desktop, beside the Today button): opens a Radix `Dialog` with title input + date input (defaulting to today). Calls `useCreateMilestone`.
- The milestone row is omitted on mobile (narrow screen, diamonds would overlap)

**Patterns to follow:**
- `apps/web/src/components/gantt/gantt-task-bar.tsx` for absolute pixel positioning within the timeline grid
- Existing Radix Tooltip and Popover usage in the codebase for hover + click interactions

**Test scenarios:**
- Happy path: milestone with `targetDate = today` renders diamond in the today column
- Happy path: milestone in week view renders centered in the week column containing its date
- Edge case: milestone date outside `timeline.rangeStart..rangeEnd` is not rendered (off-screen, no overflow)
- Happy path: clicking a diamond opens the edit popover with the current title and date pre-filled
- Happy path: editing title and saving persists the change via the update mutation
- Happy path: clicking delete in the popover removes the milestone from the row after mutation completes
- Happy path: "Add milestone" dialog creates a new diamond at the specified date
- Edge case: two milestones on the same date render without overlapping (offset slightly or stack with a count badge — deferred to implementation to pick approach)

**Verification:**
- Milestone diamonds appear at correct horizontal positions in day, week, and month views
- Edit and delete work from the inline popover
- Create works from the toolbar dialog
- Milestone row is hidden on mobile

## System-Wide Impact

- **Interaction graph:** Units 1–4 are entirely within the Gantt route and bar component. Units 5–8 add a new `milestone` table, a new API router, and a new frontend query — all additive, no existing routes modified.
- **Error propagation:** Task query failures and milestone query failures are independent — a failed milestone fetch shows zero diamonds but does not break the task Gantt.
- **State lifecycle risks:** Milestone CRUD invalidates `["milestones", projectId]` only. Task query cache (`["tasks", projectId]`) is never touched by milestone mutations. Collapse state is local and unaffected by either query.
- **API surface parity:** The new milestone endpoints are Gantt-only for now. If a future board or backlog view wants milestones, the same API is reusable without changes.
- **Cascade safety:** Deleting a project cascades to delete its milestones — no orphan rows possible.
- **Unchanged invariants:** Drag-to-move, drag-to-resize, click-to-open, search/filter, and mobile task behavior remain unchanged. The `useUpdateTask` mutation path is not touched.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Zoom view shifts bar positions incorrectly near week/month boundaries | Test with tasks that start mid-week and span partial months; `getColumnIndex` uses calendar-aligned functions from date-fns which handle this correctly |
| Grouped rendering breaks mobile task rail sticky behavior | Keep the same sticky/z-index pattern for group header rows; test on mobile after Unit 3 |
| Status color choices clash with Tailwind v4 design tokens | Pick colors at implementation time from existing token vocabulary; check contrast |
| `eachWeekOfInterval` / `eachMonthOfInterval` edge cases at range boundaries | Pad rangeStart/rangeEnd by an extra week/month in `buildTimeline` for week and month views |
| Two milestones on the same date overlap visually | Pick one approach at implementation time: slight x-offset, stacked count badge, or a combined popover listing both |
| Milestone `targetDate` timezone ambiguity (date stored as midnight UTC, displayed in local time) | Store and parse as date-only ISO string (no time component); follow the same pattern as `task.startDate` |
| Migration on existing deployments with data | Additive table — no existing data touched, safe to run on live DB without downtime |

## Sources & References

- Existing Gantt route: `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/gantt.tsx`
- Bar component: `apps/web/src/components/gantt/gantt-task-bar.tsx`
- Status constants: `apps/web/src/constants/columns.ts`
- Color pattern: `apps/web/src/lib/due-date-status.ts`
- Reference repo (Python, not directly used): https://github.com/herval/linear-gantt
