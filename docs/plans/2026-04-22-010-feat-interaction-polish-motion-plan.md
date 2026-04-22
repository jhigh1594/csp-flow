---
title: "feat: Interaction Polish — Motion and Optimistic Updates"
type: feat
status: complete
date: 2026-04-22
completed: 2026-04-22
origin: docs/brainstorms/2026-04-22-interaction-polish-requirements.md
---

# feat: Interaction Polish — Motion and Optimistic Updates

## Overview

Adds choreographed motion quality to CSP Flow's highest-frequency surfaces: the task board, inline field edits, creation modals, and the task detail sidebar. The work has two distinct axes: (1) optimistic mutation updates with rollback so field changes are reflected instantly in the UI, and (2) entrance/exit transitions and drag-and-drop polish that make interactions feel deliberate rather than abrupt.

## Problem Frame

Task board interactions feel abrupt: changing a status waits for a server round-trip before updating, modals appear and disappear without transition, and newly created tasks flash into existence. The goal is Linear/Notion-level interaction quality on the surfaces users touch most. (see origin: docs/brainstorms/2026-04-22-interaction-polish-requirements.md)

## Requirements Trace

- R1. Field values (status, priority, assignee) change immediately in the UI before the server responds — optimistic update
- R2. Changed values enter with a subtle ≤150ms transition (fade or highlight)
- R3. Server rejection reverts the field to its prior value with an error toast; rollback is animated
- R4. While a mutation is in-flight, the field trigger shows a subtle in-context loading indicator
- R5. Creation modal exits with a smooth ≤200ms closing animation
- R6. Newly created tasks enter their list with a ≤200ms entrance animation
- R7. Dragged task lifts with a visual affordance (shadow, scale)
- R8. Sibling tasks animate to make room as the dragged item moves
- R9. Dropped task settles without a visible snap-back or layout jump
- R10. All dialogs enter with a consistent ≤200ms transition (scale from 0.95 + fade)
- R11. All dialogs exit with a matched ≤150ms transition
- R12. Task detail sidebar slides in from right with ease-out ≤200ms and slides out on close
- R13. Primary action buttons apply visible press feedback (brief scale-down) on click
- R14. Buttons triggering in-flight mutations show a pending visual state

## Scope Boundaries

- Keyboard shortcuts and command palette: out of scope
- Settings, onboarding, profile pages: out of scope (deferred to a later pass)
- Mobile / touch optimization: out of scope
- Formal motion design token system: out of scope — let tokens emerge from implementation
- Performance profiling or bundle-size optimization: out of scope

## Context & Research

### Already Satisfied (Verify, Don't Re-implement)

**R5 (modal close animation)**, **R10/R11 (dialog enter/exit)**: `apps/web/src/components/ui/dialog.tsx` already uses Base UI `data-starting-style` / `data-ending-style` Tailwind attributes with `transition-[scale,opacity,translate] duration-200`. As long as consumers use `DialogPopup` (not a raw `div`), these requirements are satisfied.

**R12 (sidebar slide)**: `apps/web/src/components/ui/sheet.tsx` already uses `data-starting-style:translate-x-8 data-ending-style:translate-x-8` with `transition-[opacity,translate] duration-200`. `task-details-sheet.tsx` delays the `setCurrentTaskId(undefined)` call by 300ms to allow the exit animation to complete.

**R7 (drag lift affordance)**: `apps/web/src/components/kanban-board/index.tsx` renders the `DragOverlay` with `rotate-1 scale-[1.03] shadow-lg ring-2 ring-ring/35`. The original card slot uses `opacity: 0.6`.

**R8 (sibling repositioning)**: dnd-kit's `SortableContext` with `verticalListSortingStrategy` + the inline `transition: "transform 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)"` on task cards already provides sibling slide animation during drag.

**R9 (drop settle)**: `dropAnimation` is configured at `{ duration: 300, easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)" }` in the board root.

### Relevant Code and Patterns

**Framer Motion (v12.34.3) — existing usage patterns**
- `apps/web/src/components/task/subtask-row.tsx` — `motion.div` with `layout`, `initial={{ opacity: 0, height: 0 }}`, `animate={{ opacity: 1, height: "auto" }}`, `exit={{ opacity: 0, height: 0 }}`, `transition={{ duration: 0.2, ease: "easeOut" }}`. **This is the canonical template for new task entrance animation (R6).**
- `apps/web/src/components/task/task-subtasks.tsx` — `<AnimatePresence initial={false}>` wrapping the list. Pairs with subtask-row.
- `apps/web/src/components/onboarding/onboarding-flow.tsx` — `fadeTransition` constant `{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -20 } }`. Pattern for reusable motion variants.

**Drag-and-drop stack**: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/modifiers`. Board in `apps/web/src/components/kanban-board/`.

**Zustand project store**: `apps/web/src/store/project.ts` exposes `{ project: ProjectWithTasks | undefined, setProject }`. The board and task cards read from this store.

**Dual-store architecture (critical)**: The kanban board renders from the Zustand `project` store, not directly from TanStack Query. When task mutations fire today, they call `queryClient.invalidateQueries` on success — the refetch eventually updates Zustand, but only after the server responds. For optimistic updates on the board, the Zustand store must also be updated in `onMutate`. The drag-and-drop `handleDragEnd` already uses this pattern (`setProject(produce(project, draft => {...}))`).

**Mutation hook structure**: `use-update-task-status.ts`, `use-update-task-status-priority.ts`, `use-update-task-assignee.ts` all use `onSuccess: invalidateQueries` only. No `onMutate`, `cancelQueries`, `setQueryData`, or rollback anywhere in these hooks.

**TanStack Query v5.90.x optimistic update API**:
- `onMutate(variables, _ctx)` → return snapshot (`{ previousProject, previousTaskData }`) — becomes `onMutateResult` in `onError`/`onSettled`
- `onError(_err, variables, onMutateResult, _ctx)` → restore snapshots
- `onSettled(_data, _err, variables, _onMutateResult, _ctx)` → always invalidate to reconcile with server
- In v5, the third parameter to `onError` is the snapshot (`onMutateResult`), not the v4 `context`

**Button component**: `apps/web/src/components/ui/button.tsx` uses Base UI and CVA. It already applies `[:active,[data-pressed]]:inset-shadow-[...]` for press feedback via inset shadow, but has no scale transform or `loading` prop.

### Institutional Learnings

- No `docs/solutions/` directory exists — all patterns sourced from live codebase
- **Do not mix Framer Motion `layout` prop inside dnd-kit `useSortable` context** — the transform systems conflict. Keep Framer Motion for list entrance/exit (opacity, height), dnd-kit CSS transforms for drag positioning.

## Key Technical Decisions

- **Dual-store optimistic update**: `onMutate` must update both TanStack Query cache (for detail panel) and Zustand `project` store (for the board). Rollback restores both snapshots. This matches the existing drag-and-drop pattern and avoids re-architecting how the board reads data.
- **Shared `applyTaskPatch` helper**: The three field mutation hooks (status, priority, assignee) all patch a `Task` inside `ProjectWithTasks.columns[].tasks[]` and `plannedTasks[]`. A shared helper avoids tripling the traversal code. A factory hook (`useTaskFieldMutation`) eliminates duplicated `onMutate`/`onError` boilerplate.
- **CSS transitions for R2 (field value change)**: For status and priority (color badges), `transition-colors duration-150` on the badge element provides a smooth color change when the optimistic value is applied. For assignee (text/avatar discrete swap), a React `key={value}` on the display element triggers a short Framer Motion opacity entry.
- **Base UI `data-starting-style` / `data-ending-style` for modals**: R5, R10, R11, R12 are architecturally satisfied by the existing `dialog.tsx` and `sheet.tsx` primitives. Unit 5 is an audit/fix pass, not a reimplementation.
- **Button `loading` prop for R14**: Add a `loading?: boolean` prop to `Button`. When true: render a spinner icon, set `aria-busy="true"`, and apply `opacity-70` to communicate pending state. Wire to `isPending` at call sites on the task board.
- **`active:scale-[0.97]` for R13**: Add `[:active,[data-pressed]]:scale-[0.97]` to the Button's base class alongside the existing inset-shadow press feedback. Tailwind `transition-transform` class on the button ensures it animates.

## Open Questions

### Resolved During Planning

- **Which query keys to snapshot for rollback?** `["task", taskId]` and `["tasks", projectId]`. The Zustand `project` store is also snapshotted. `["notifications"]`, `["activities"]`, `["projects"]` are invalidated in `onSettled` but NOT optimistically updated — they're secondary consumers that don't drive board rendering.
- **Does `task-status-popover.tsx` pass `projectId` through mutation variables?** The mutation must receive a `Task` object (or at minimum `{ id, projectId, status }`). The implementer should verify `projectId` is available at the call site; if not, the popover component needs to receive it as a prop.
- **Are R7/R8/R9 already done?** R7 (DragOverlay lift) and R9 (dropAnimation) are confirmed done. R8 (sibling slide) is confirmed done via dnd-kit CSS transform. Unit 6 is a light audit and ghost placeholder polish only.
- **Are R10/R11/R12 already done?** Yes, via Base UI CSS transitions in `dialog.tsx` and `sheet.tsx`. Unit 5 verifies no consumer bypasses the wrappers; fix any gaps found.

### Deferred to Implementation

- **Does `handleDragEnd` snapshot Zustand before writing?** The current drag-and-drop uses immer to produce a new state and calls `setProject` — it does NOT snapshot for rollback on drag. This is acceptable because the drag mutation failures are currently silent. The implementer may choose to add drag rollback separately, but it's not in scope for this plan.
- **Exact `ProjectWithTasks` field shape for `applyTaskPatch`**: The helper traverses `columns[].tasks[]` and `plannedTasks[]`. Verify whether `archivedTasks[]` also needs patching (likely yes for consistency).
- **`use-update-task-status-priority.ts` exports `useUpdateTaskPriority()`**: Confirmed — this file is the priority-only hook, not a combined hook. The name is misleading; no investigation needed. Rename the file to `use-update-task-priority.ts` during Unit 1 refactor if the naming creates confusion, but do not change the exported hook name without updating all import sites.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

**Optimistic update data flow (R1, R3):**

```
User picks new status in popover
  → onMutate fires immediately
      → cancelQueries(["task", id], ["tasks", projectId])
      → snapshot TQ cache + Zustand project store
      → setQueryData(["task", id], { ...task, status: newStatus })
      → setQueryData(["tasks", projectId], applyTaskPatch(old, id, { status }))
      → setProject(applyTaskPatch(project, id, { status }))   ← board re-renders instantly
  → Mutation in flight (isPending=true)
      → field trigger dimmed (R4)
  → onError: restore both snapshots → error toast → field reverts with animation (R3)
  → onSuccess: no-op (optimistic state already correct)
  → onSettled: invalidateQueries → server truth reconciles
```

**Task entrance animation (R6):**

```
column-dropzone.tsx
└─ <AnimatePresence initial={false}>
    └─ {tasks.map(task =>
         <motion.div key={task.id}
           initial={{ opacity: 0, height: 0 }}
           animate={{ opacity: 1, height: "auto" }}
           exit={{ opacity: 0, height: 0 }}
           transition={{ duration: 0.15, ease: "easeOut" }}
         >
           <TaskCard task={task} ... />
         </motion.div>
       )}
```

Note: **no `layout` prop** on the `motion.div` — it lives inside dnd-kit's `SortableContext` and the transform systems would conflict.

## Implementation Units

- [x] **Unit 1: Optimistic mutation infrastructure (R1, R3)**

**Goal:** Add `onMutate` / `onError` / `onSettled` pattern to the three inline field mutation hooks, updating both TanStack Query cache and the Zustand project store optimistically, with full rollback on error.

**Requirements:** R1, R3

**Dependencies:** None

**Files:**
- Create: `apps/web/src/lib/optimistic-task-update.ts` — `applyTaskPatch` helper
- Modify: `apps/web/src/hooks/mutations/task/use-update-task-status.ts`
- Modify: `apps/web/src/hooks/mutations/task/use-update-task-status-priority.ts`
- Modify: `apps/web/src/hooks/mutations/task/use-update-task-assignee.ts`

**Approach:**
- Create `applyTaskPatch(project: ProjectWithTasks, taskId: string, patch: Partial<Task>): ProjectWithTasks` that traverses `columns[].tasks[]`, `plannedTasks[]`, and `archivedTasks[]`. Returns a new object (do not mutate in place).
- In each hook's `onMutate`: (1) `await cancelQueries` for `["task", id]` and `["tasks", projectId]`, (2) snapshot both TQ cache values and the Zustand `project`, (3) call `setQueryData` for both keys with the patched value, (4) call `setProject(applyTaskPatch(project, id, patch))`, (5) return the snapshot.
- In `onError`: restore both TQ snapshots via `setQueryData` and call `setProject(previousProject)`. Show error toast.
- In `onSettled`: `invalidateQueries` for `["task", id]`, `["tasks", projectId]`, `["notifications"]`, `["activities", id]`. Do NOT cancel or snapshot these — they are secondary consumers.
- The Zustand store is accessed inside the hook via `useProjectStore`. The snapshot is `const previousProject = useProjectStore.getState().project`.
- **`projectId` availability (confirmed)**: The `Task` type has `projectId: string | null`. All three popovers receive a `task: Task` prop and call `mutateAsync({ ...task, status })` — so `projectId` is always in the mutation variables. Guard against null: if `task.projectId` is null, skip the `["tasks", projectId]` cache operations (optimistically update `["task", id]` and Zustand only).
- **Zustand `undefined` edge case**: When the mutation fires from the task detail panel (not the board), `useProjectStore.getState().project` may be `undefined` if the board route is not mounted. `applyTaskPatch(undefined, ...)` must return `undefined` — do not throw. `setProject(undefined)` on rollback is a deliberate no-op in that case; the board wasn't showing anything to revert.
- **Use `getState()` for Zustand reads in `onMutate`**: Call `useProjectStore.getState().project` (not subscribed `useProjectStore()`) to read the snapshot inside the async `onMutate` callback. Subscribing to the store inside a mutation hook would cause spurious re-renders on every project change. Write via `useProjectStore.getState().setProject(...)`.
- **Extract `useTaskFieldMutation(mutationFn, getPatch)` factory**: The three hooks (status, priority, assignee) are structurally identical — same `onMutate`, `onError`, `onSettled` shape, same query keys. Extract the factory. Do not duplicate the dual-store rollback logic three times.

**Patterns to follow:**
- `apps/web/src/components/kanban-board/index.tsx` `handleDragEnd` — Zustand store + immer pattern for immediate board updates
- TanStack Query v5 `onMutate` / `onError` / `onSettled` signatures (see Key Technical Decisions)

**Test scenarios:**
- Happy path: calling `mutate({ id, projectId, status: "in-progress" })` immediately updates the status badge in the board column before the server responds
- Happy path: `onSettled` fires after success and re-fetches the task — board remains consistent with server truth
- Error path: when the server returns a 4xx, the field reverts to the prior value with a matching ≤150ms transition (R3) and an error toast appears
- Error path: `onMutateResult` is `undefined` if `onMutate` itself throws — `onError` handles this without crashing (snapshot guard with optional chaining)
- Edge case: `projectId` is not available in the mutation variables — verify this cannot happen; the call site must supply it
- Integration: optimistic update on the board column AND the task detail panel (if open simultaneously) both show the new value before server response

**Verification:**
- Changing a task status on the board reflects the new value in the column immediately (before network response)
- Simulating a network failure (e.g., offline or 500 mock) reverts the field and shows a toast
- `queryClient.getQueryData(["task", id])` has the patched value immediately after `onMutate`
- The Zustand `project` store has the patched task immediately after `onMutate`

---

- [x] **Unit 2: Field-change visual feedback and in-context loading indicator (R2, R4)**

**Goal:** Make the optimistic value change feel intentional with a subtle transition, and show a dimmed/spinner state on field triggers while the mutation is in-flight.

**Requirements:** R2, R4

**Dependencies:** Unit 1 (must have `isPending` available from the mutation hooks)

**Files:**
- Modify: `apps/web/src/components/task/task-status-popover.tsx`
- Modify: `apps/web/src/components/task/task-priority-popover.tsx`
- Modify: `apps/web/src/components/task/task-assignee-popover.tsx`

**Approach:**
- R2 (value transition): Add `transition-colors duration-150` to the status and priority badge elements (color changes smoothly when the optimistic value is applied). For assignee (discrete text/avatar swap), use `<motion.div animate={{ opacity: [0.5, 1] }} transition={{ duration: 0.1 }}>` keyed by the current display value — this triggers on every value change without remounting the element and avoids dropping any local state (hover, focus) that a key-based remount would lose.
- R4 (loading indicator): Destructure `isPending` from each mutation hook. Apply `data-[pending]:opacity-50` or `aria-busy` + `pointer-events-none` to the popover trigger button when `isPending` is true. Do not block interaction on other fields — only the currently mutating field should dim.
- The dimmed state should be removed when `onSettled` fires (mutation hook resets `isPending` automatically).

**Patterns to follow:**
- Existing `transition-colors` usage on task card: `apps/web/src/components/kanban-board/task-card.tsx`
- Framer Motion opacity entry: `apps/web/src/components/onboarding/onboarding-flow.tsx` (fadeTransition pattern)

**Test scenarios:**
- Happy path: selecting a new status immediately shows the badge in the new color with a smooth `duration-150` color transition (not a snap)
- Happy path: the field trigger button is visually dimmed (opacity ~50%) while the status mutation is in-flight
- Happy path: changing priority on one field does not dim status or assignee fields
- Edge case: if two mutations are triggered in rapid succession on the same field (unlikely but possible), `isPending` remains true until all settle

**Verification:**
- Status badge color change does not snap — a slow network connection shows the color smoothly transitioning to the new value
- During mutation flight, the field trigger is visually distinct from its idle state

---

- [x] **Unit 3: Button press feedback and pending state (R13, R14)**

**Goal:** Give primary action buttons a scale-down on press and a spinner/dimmed state while their triggered mutation is in-flight.

**Requirements:** R13, R14

**Dependencies:** None (independent of optimistic update work)

**Files:**
- Modify: `apps/web/src/components/ui/button.tsx`
- Modify: call sites on the task board that trigger mutations (create task button, any submit/action buttons in create-task-modal, task card context menu actions) — identify during implementation

**Approach:**
- R13 (press scale): Add `[:active,[data-pressed]]:scale-[0.97]` to the Button's base CVA class. Add `transition-[transform,box-shadow] duration-100` to ensure both the scale and existing inset-shadow transitions animate smoothly together.
- R14 (pending state): Add `loading?: boolean` prop to Button. When `loading=true`: render a small spinner icon (Lucide `Loader2` with `animate-spin`) alongside children, set `disabled` and `aria-busy="true"`, apply `opacity-70` on the button. The button should remain in the layout (not collapse) while loading.
- At call sites on the task board, pass `loading={isPending}` from the mutation `isPending` state. Identify call sites during implementation — likely includes the submit button in `create-task-modal.tsx` and any task board action button that can fire a mutation.

**Patterns to follow:**
- Existing `[:active,[data-pressed]]` class usage in `button.tsx` for inset-shadow
- `Loader2` from `lucide-react` (already a project dependency); grep for existing usage to confirm import style before adding

**Test scenarios:**
- Happy path: clicking a primary button shows a brief scale-down (97%) then returns to normal on release
- Happy path: calling a mutation with `loading={true}` shows the spinner and dims the button
- Happy path: `loading={false}` returns the button to its normal interactive state
- Edge case: `loading=true` makes the button non-clickable (disabled) — no double-submit possible
- Test expectation: no automated tests for visual scale animation (visual-only); test that `disabled` attribute is set when `loading=true` and the spinner element is present in the DOM

**Verification:**
- Button renders spinner and is non-interactive when `loading=true`
- Button renders normally and is clickable when `loading=false`
- Scale transition on press is visible in manual browser test (no automated test for this)

---

- [x] **Unit 4: New task entrance animation (R6)**

**Goal:** Newly created tasks slide into their column with a subtle entrance animation rather than appearing instantly.

**Requirements:** R6

**Dependencies:** None (independent)

**Files:**
- Modify: `apps/web/src/components/kanban-board/column/column-dropzone.tsx`

**Approach:**
- Wrap the task list mapping in `<AnimatePresence initial={false}>` (the `initial={false}` prevents entrance animation on page load — only new arrivals animate).
- Wrap each `<TaskCard>` in a `motion.div` with `key={task.id}`, `initial={{ opacity: 0, height: 0 }}`, `animate={{ opacity: 1, height: "auto" }}`, `exit={{ opacity: 0, height: 0 }}`, `transition={{ duration: 0.15, ease: "easeOut" }}`.
- **Critical**: Do NOT add the `layout` prop to the `motion.div`. The `motion.div` lives inside dnd-kit's `SortableContext`, which manages its own CSS transform-based positioning. Mixing Framer Motion `layout` with dnd-kit transforms causes conflicting positioning systems. Sibling slide-to-make-room continues to be handled by dnd-kit CSS transitions.
- The `motion.div` wrapper should not interfere with `useSortable`'s `setNodeRef` — the `useSortable` ref and drag listeners attach to the inner `TaskCard` element (or its existing wrapper), not the `motion.div`.

**Patterns to follow:**
- `apps/web/src/components/task/subtask-row.tsx` — exact template: `motion.div` with `layout`, `initial`, `animate`, `exit`
- `apps/web/src/components/task/task-subtasks.tsx` — `AnimatePresence initial={false}` wrapping

**Test scenarios:**
- Happy path: after creating a task via the creation modal, the new task card appears in the target column with a ≤200ms fade-in/slide-in, not as an instant appearance
- Happy path: existing task cards on page load do NOT animate in (the `initial={false}` flag prevents this)
- Edge case: if a task is deleted (removed from the list), it exits with the matching opacity/height animation — no layout jump on surrounding cards
- Integration: the entrance animation does not conflict with the dnd-kit drag system — picking up a card immediately after it animates in works correctly

**Verification:**
- Creating a task shows the entrance animation in the correct column
- Page load shows no entrance animation on existing tasks
- Dragging a recently-created task card works normally (no transform conflict)

---

- [x] **Unit 5: Modal and sidebar animation audit (R5, R10, R11, R12)**

**Goal:** Verify that all in-scope dialogs and the task detail sidebar use the Base UI animation wrappers correctly, and fix any consumer that bypasses them.

**Requirements:** R5, R10, R11, R12

**Dependencies:** None (independent)

**Files:**
- Read/audit: `apps/web/src/components/ui/dialog.tsx`
- Read/audit: `apps/web/src/components/ui/sheet.tsx`
- Read/audit: `apps/web/src/components/shared/modals/create-task-modal.tsx`
- Read/audit: `apps/web/src/components/task/task-details-sheet.tsx`
- Modify (if gaps found): the files above

**Approach:**
- Audit `dialog.tsx`: confirm `DialogPopup` applies `transition-[scale,opacity,translate] duration-200` via `data-starting-style` / `data-ending-style`. Confirm backdrop uses `transition-all duration-200` with `data-starting-style:opacity-0`.
- Audit `sheet.tsx`: confirm `SheetPopup` applies `transition-[opacity,translate] duration-200` with `data-starting-style:translate-x-8` for the right-side drawer.
- Audit `create-task-modal.tsx`: confirm it uses `DialogPopup` (not a raw `div`). If it bypasses the wrapper, update it to use the `dialog.tsx` primitives.
- Audit `task-details-sheet.tsx`: confirm it uses `Sheet` with `side="right"` and that the 300ms close delay is in place to let the exit animation finish before unmounting the task ID.
- Search for any other modals or dialogs in scope (board view, task board area) that may use a different modal approach (e.g., a raw `dialog` element or a third-party modal). Fix any found.
- If all consumers are already correctly wired, this unit is a no-op (log the verification result).

**Patterns to follow:**
- `apps/web/src/components/ui/dialog.tsx` — Base UI wrapper pattern
- `apps/web/src/components/ui/sheet.tsx` — Base UI sheet wrapper

**Test scenarios:**
- Happy path: opening and closing the create-task-modal shows a scale+fade entrance and a matched exit (no abrupt snap-out)
- Happy path: opening and closing the task detail sidebar shows a right-to-left slide-in and matched slide-out
- Happy path: every dialog that appears during a typical board workflow (create task, delete task confirmation, edit column) has both an enter and an exit transition
- Edge case: dialogs that are dismissed via ESC key also play the exit animation (Base UI handles this, but verify)

**Verification:**
- Manual browser test: open and dismiss each in-scope modal/panel. Every one has a visible entrance AND exit animation. None snap in or out abruptly.
- No modal renders a raw `div` with `position: fixed` or `z-index` that bypasses the Base UI wrapper

---

- [x] **Unit 6: Drag-and-drop affordance polish (R7, R8, R9)**

**Goal:** Polish the ghost placeholder and confirm sibling-repositioning and drop-settle animations are correct. This is primarily an audit with targeted fixes.

**Requirements:** R7, R8, R9

**Dependencies:** None (independent)

**Files:**
- Modify (if needed): `apps/web/src/components/kanban-board/task-card.tsx`
- Modify (if needed): `apps/web/src/components/kanban-board/index.tsx`

**Approach:**
- **R7 (lift affordance)**: The `DragOverlay` already renders the lifted card with `rotate-1 scale-[1.03] shadow-lg ring-2 ring-ring/35`. The ghost placeholder at the original slot has `opacity: 0.6`. Evaluate whether the ghost reads clearly — if it blends into the background, update it to include a dashed border (`border-2 border-dashed border-border`) with `opacity-50` to better communicate the empty slot.
- **R8 (sibling repositioning)**: Confirm the existing `transition: transition || "transform 250ms cubic-bezier(0.25, 0.46, 0.45, 0.94)"` on `task-card.tsx` provides smooth sibling slide during drag. No additional changes needed unless testing reveals a visual gap.
- **R9 (drop settle)**: Confirm `dropAnimation` config at `duration: 300ms / cubic-bezier(...)` produces a smooth settle. No changes expected.
- If the ghost placeholder update is the only change, it is a one-liner in `task-card.tsx` (conditional classes when `isDragging`).

**Patterns to follow:**
- Existing `DragOverlay` style in `apps/web/src/components/kanban-board/index.tsx`
- Existing `isDragging` conditional style in `apps/web/src/components/kanban-board/task-card.tsx`

**Test scenarios:**
- Happy path: picking up a task card shows the DragOverlay lifted card with tilt + shadow; the original slot is clearly visually distinct from a filled card
- Happy path: moving the dragged card over other cards shows sibling cards smoothly sliding to make room (no snap repositioning)
- Happy path: dropping the card shows it settling into the new position without a visible jump or flash
- Edge case: dragging a card back to its original position shows correct animation (no flicker)

**Verification:**
- Manual browser test: drag a task card between columns. Lift affordance, sibling slide, and settle all read as intentional motion (not janky).
- The ghost placeholder at the original slot is clearly readable as "empty slot reserved here"

## System-Wide Impact

- **Interaction graph**: The three field mutation hooks (`useUpdateTaskStatus`, `useUpdateTaskPriority`, `useUpdateTaskAssignee`) are called from field popover components in both the board task card and the task detail panel. Optimistic updates must correctly update both views; verify by testing with the detail panel open while changing a status from the board.
- **Error propagation**: Mutation errors trigger cache rollback AND Zustand store rollback. The error toast is the only user-visible error signal. If `onMutate` itself throws (e.g., snapshot code fails), `onMutateResult` is `undefined` in `onError` — all rollback code must guard with optional chaining.
- **State lifecycle risks**: Rapid sequential mutations on the same field (e.g., quickly changing status twice) could result in an `onError` restoring a stale snapshot. The `cancelQueries` in `onMutate` mitigates this — it cancels in-flight refetches but not pending mutations. For now, the last mutation's rollback wins, which is acceptable given the low probability and the `onSettled` reconciliation.
- **API surface parity**: The `projectId` field must be available to mutation call sites. The board's `TaskCard` → popover chain must pass `projectId` down. Audit the prop chain for each popover component.
- **Integration coverage**: Unit tests alone cannot prove that the Zustand store is correctly snapshotted and restored — an integration test with a real mutation failure is the only way to verify rollback end-to-end.
- **Unchanged invariants**: Drag-and-drop task reordering continues to use the immer Zustand update pattern; this plan does not change drag-and-drop mutation behavior. The `createTask` mutation flow is unchanged — `syncTaskIntoProject` continues to handle board insertion; the entrance animation in Unit 4 will trigger naturally when the task appears in the Zustand-backed list.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Framer Motion `layout` conflict with dnd-kit transforms | Plan explicitly prohibits `layout` on `motion.div` inside `SortableContext`. Use height/opacity animation only. |
| Dual-store rollback complexity | Both stores must be snapshotted in `onMutate`. Guard all rollback calls with optional chaining. `onSettled` always invalidates as the final reconcile. |
| `projectId` not available at mutation call site | Verify the prop chain for each popover component during Unit 1 implementation. Fail fast if not available. |
| Ghost placeholder change breaks drag visual clarity | Test with a real drag interaction before finalizing the placeholder style change in Unit 6. |
| `onMutate` context/onMutateResult naming (v5 breaking change vs v4) | v5 uses `onMutateResult` as the third parameter to `onError` and `onSettled`, not `context`. The shared factory must follow v5 signatures. |

## Documentation / Operational Notes

- No migration or database changes.
- No new npm dependencies — Framer Motion v12 is already installed.
- Test in both the board view and the task detail panel open simultaneously to verify dual-view optimistic update consistency.
- The motion timing constants (≤150ms for field transitions, ≤200ms for modal/entrance) should be consistent across units. Consider extracting a shared `apps/web/src/lib/motion.ts` if more than 2-3 components define the same variant object.

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-22-interaction-polish-requirements.md](docs/brainstorms/2026-04-22-interaction-polish-requirements.md)
- Subtask entrance animation pattern: `apps/web/src/components/task/subtask-row.tsx`
- Kanban board drag-and-drop: `apps/web/src/components/kanban-board/index.tsx`
- Button component: `apps/web/src/components/ui/button.tsx`
- Task field popovers: `apps/web/src/components/task/task-status-popover.tsx`, `task-priority-popover.tsx`, `task-assignee-popover.tsx`
- Mutation hooks: `apps/web/src/hooks/mutations/task/use-update-task-status.ts`, `use-update-task-status-priority.ts`, `use-update-task-assignee.ts`
- TanStack Query v5 optimistic update types: `node_modules/@tanstack/query-core` (v5.90.20 — `onMutateResult` is the third parameter to `onError`, not `context`)
- Zustand project store: `apps/web/src/store/project.ts`
- Base UI dialog: `apps/web/src/components/ui/dialog.tsx`
- Base UI sheet: `apps/web/src/components/ui/sheet.tsx`
