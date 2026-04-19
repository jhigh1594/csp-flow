---
title: Milestone Enhancements — Plane-Inspired Gantt Experience
type: feature
date: 2026-04-18
status: active
---

# Milestone Enhancements — Plane-Inspired Gantt Experience

## Problem Frame

Milestones exist as basic diamond markers on the Gantt (title + target date only). Users can't see progress, can't link tasks to milestones, and the hover experience shows nothing — you have to click the diamond to see the title. Plane's Pro milestone feature gives a much richer experience: vertical dashed lines on the timeline, hover popovers showing progress and linked work, and task-to-milestone linking that enables automatic progress tracking.

## Intended Behavior

### Gantt Enhancements
- Milestones render as a **blue diamond** with a **vertical dashed line** extending down through all task rows — matching Plane's visual pattern
- **Hover tooltip** on the diamond shows: milestone name, circular progress indicator (%), linked task count, target date
- **Click** opens the existing edit popover (title, date, save, delete) — unchanged from current behavior
- Vertical dashed line uses a subtle blue/primary color to avoid visual noise

### Task-Milestone Linking
- Each task can belong to **one milestone** (FK on task table)
- Users can set/unset a task's milestone from:
  - The task detail sheet/properties panel
  - The milestone hover popover (future — deferred to separate task)
- Progress is computed: `done tasks / total linked tasks`

### Milestone Schema Extension
- Add `description` field to milestones (optional text)
- Add `milestoneId` FK to tasks (nullable, references milestone, cascade on delete)

### Milestone Management (Deferred)
- A dedicated milestone management page outside the Gantt is out of scope for this iteration
- The Gantt toolbar "Add milestone" dialog is the primary creation path

## Scope Boundaries

- No milestone status workflow (planned/in-progress/completed) — milestones don't have states, they track progress via linked tasks
- No many-to-many task-milestone linking — one milestone per task
- No dedicated milestone management/list page outside the Gantt
- No milestone listing in board, list, or backlog views
- No weighted progress calculation — simple done/total ratio
- No milestone-level description editing from the Gantt (deferred to management page)
- No mobile milestone enhancements (current mobile restriction remains)

## Success Criteria

1. Hovering over a milestone diamond on the Gantt shows a tooltip with name, progress %, task count, and target date
2. A vertical dashed line extends from each milestone diamond through all task rows
3. Tasks can be linked to milestones via the task detail sheet
4. Milestone progress % updates automatically as linked tasks move to "done"
5. Creating/editing milestones still works from the Gantt toolbar and diamond click popover
6. The vertical dashed lines don't obscure or interfere with task bar readability

## Key Decisions

- **One milestone per task** (FK on task) over many-to-many — simpler schema, simpler progress calc, matches most real-world PM workflows where a task targets one milestone
- **Done/total progress ratio** over weighted — the existing 4-status model (to-do, in-progress, in-review, done) means only "done" counts as complete. Simple and predictable.
- **Hover tooltip + click to edit** over minimal hover + rich click — matches Plane's exact pattern and gives the most information at a glance
- **Vertical dashed line** is a visual indicator only — no click interaction, no drag behavior
- **Description field** added to schema but not surfaced in the Gantt popover — kept minimal for now, editable in a future management page

## Open Questions

### Resolved

- Task-milestone relationship: one-to-many (one milestone per task)
- Progress calculation: done tasks / total linked tasks
- Hover UX: tooltip on hover (name, progress, count, date), existing popover on click

### Deferred to Planning

- Whether the vertical dashed line renders behind or in front of task bars (z-index decision)
- Exact tooltip positioning (top, right, or bottom of diamond)
- Whether the task detail sheet uses a dropdown or inline selector for milestone assignment
- Color of the vertical dashed line (primary at reduced opacity vs. a specific shade)
