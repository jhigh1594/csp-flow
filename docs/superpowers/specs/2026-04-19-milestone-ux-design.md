# Milestone UX Design

**Date:** 2026-04-19
**Status:** Approved

## Problem

Milestones exist as a data model (tasks have a `milestoneId` FK, progress counts are tracked) but have no dedicated management surface. Creation and editing is locked to the Gantt view. There is no way to see all tasks in a milestone, no milestone health summary, and no way to bulk-assign tasks to a release. The feature is invisible to anyone not using the Gantt.

## Users and Jobs to Be Done

**Primary — Project Manager (release planner)**
- Structure work into releases with a target date
- See which tasks are scoped into each release
- Bulk-assign existing tasks to a milestone
- Track progress toward the release date

**Secondary — Team Lead / Stakeholder**
- Understand what is included in an upcoming release
- Check overall health at a glance (completion %, overdue tasks) without drilling into every task

## Design

### Navigation

Add a **Milestones** tab to the project-level navigation alongside Board, List, Gantt, and Wiki. No new route nesting — project nav tabs are already flat.

### Milestone List View (`/project/:id/milestones`)

A card grid showing all milestones for the project, ordered by target date ascending.

**Each card shows:**
- Title
- Target date
- Auto-derived status badge (see Status Logic below)
- Progress bar
- `X / Y tasks done` count

**Header:** "Milestones" title + subtitle showing `X total · Y completed` + "＋ New Milestone" button.

**Status Logic (auto-derived, no manual status field — evaluated in this order):**
- `Completed` — all tasks done, or 0 tasks assigned and target date has passed
- `Overdue` — target date has passed and not all tasks are done
- `At Risk` — target date is ≤14 days away and completion % is below 80%
- `On Track` — everything else

### Milestone Detail View (`/project/:id/milestones/:milestoneId`)

Full-page view reached by clicking a milestone card. Breadcrumb back to the list.

**Header:**
- Milestone title (read-only display; edit via Edit button)
- Target date + days remaining / overdue indicator
- Edit and Delete action buttons

**Health Dashboard (metrics row):**
Five stat cards: Completion %, Total Tasks, Done, In Progress, Overdue.

Below the metrics row: a large gradient progress bar (indigo → green) with label "X of Y tasks completed".

**Task List:**

Filter tabs: All · To Do · In Progress · Done · Overdue (with counts).

Table columns: Task title, Status pill, Priority, Assignee avatar, Due date. Overdue due dates render in red with a ⚠ icon.

Clicking a task row opens the existing task detail sheet (no new UI required).

**Task list actions (top-right of section):**
- `＋ New task` — creates a new task pre-assigned to this milestone via the existing new-task flow
- `＋ Add existing task` — opens the assignment popover (see below)

**Remove task from milestone:** Hovering a task row reveals a `Remove` button on the right. Clicking it clears `milestoneId` on the task (sets to null). No confirmation dialog — the action is non-destructive and reversible. The task remains in the project.

### Add Existing Task Popover

Triggered by "＋ Add existing task". A popover (not a modal) with a search input and two sections:

1. **Unassigned tasks** — tasks in this project with `milestoneId = null`, filterable by title search. Each row has a `+ Add` button that immediately assigns the task to this milestone.
2. **Already in this milestone** — shown below a divider, grayed out, with a `✓ Added` indicator. Allows the PM to see what is already scoped without closing the popover.

Tasks assigned to *other* milestones are hidden entirely to prevent accidental re-scoping.

### Create / Edit Milestone

The create/edit dialog (title + target date fields) currently lives inline in `gantt.tsx`. It must be extracted to a shared `MilestoneFormDialog` component so both the Gantt and the Milestones tab can use it.

Creation: "＋ New Milestone" button on the list view opens `MilestoneFormDialog` in create mode.

Edit: "Edit" button on the detail page opens `MilestoneFormDialog` pre-populated with current values.

Delete: "Delete" button on the detail page. Requires a confirmation dialog since deletion cascades `milestoneId` to null on all associated tasks (tasks are not deleted).

### Gantt Integration (unchanged)

Milestone diamonds, vertical lines, and the milestone row in the Gantt view remain as-is. The Gantt "＋ Milestone" button continues to work. No changes to the Gantt.

### Task Properties Sidebar (unchanged)

The existing `TaskMilestonePopover` in the task properties sidebar remains as-is — individual task assignment from the task detail view still works.

## Data Model

No schema changes required. The existing `milestoneTable` and `taskTable.milestoneId` FK support all features in this design.

The `getMilestones` controller already returns `totalTasks` and `completedTasks`. A new query is needed for the detail view: tasks for a given milestone, with full task fields (status, priority, assignee, due date).

## API Changes Required

| Endpoint | Change |
|---|---|
| `GET /milestone/:projectId` | Already exists, no change |
| `POST /milestone` | Already exists, no change |
| `PATCH /milestone/:id` | Already exists, no change |
| `DELETE /milestone/:id` | Already exists, no change |
| `GET /milestone/:milestoneId/tasks` | **New** — returns tasks assigned to a milestone |
| `PATCH /task/:id/milestone` | Already exists (`update-task-milestone`), no change |

The new endpoint returns full task records (same shape as the existing task list query) filtered by `milestoneId`.

## Frontend Changes Required

| Component / Route | Change |
|---|---|
| Project nav | Add "Milestones" tab |
| `milestones.tsx` route | **New** — milestone list view |
| `milestones.$milestoneId.tsx` route | **New** — milestone detail view |
| `milestone-card.tsx` | **New** — card component for list view |
| `milestone-health-metrics.tsx` | **New** — metrics row component |
| `milestone-task-table.tsx` | **New** — task table with filter tabs and remove |
| `milestone-add-task-popover.tsx` | **New** — search + assign popover |
| `milestone-form-dialog.tsx` | **Extract from `gantt.tsx`** — shared create/edit dialog |
| `fetchers/milestone/get-milestone-tasks.ts` | **New** |
| `hooks/queries/milestone/use-get-milestone-tasks.ts` | **New** |

## Out of Scope

- Milestone status as a manual field (status is derived from task data)
- Drag-and-drop task reordering within a milestone
- Milestone dependencies or sequencing
- Milestone comments or activity feed
- Milestone visibility on the Board or List views (task milestone badge could be added later)
