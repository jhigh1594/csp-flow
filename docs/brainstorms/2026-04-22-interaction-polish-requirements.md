---
date: 2026-04-22
topic: interaction-polish
---

# Interaction Polish — Smooth, Choreographed Motion

## Problem Frame

CSP Flow's core interactions — changing task fields, creating items, drag-and-drop, opening panels — feel abrupt because UI changes snap without transition and mutation feedback is inconsistent. The goal is a premium, deliberate motion quality similar to Linear or Notion: interactions feel responsive and choreographed, not janky.

This pass targets the highest-frequency surfaces first: the task board, inline field edits, and primary modals/panels.

## Requirements

**Inline field edits (status, priority, assignee)**
- R1. Field values (status, priority, assignee) change immediately in the UI on user interaction — the displayed value updates before the server responds.
- R2. When a changed value appears, it enters with a subtle transition (≤150ms fade or highlight) so the change reads as intentional rather than an abrupt swap.
- R3. If the server rejects the change, the field reverts to its prior value with an error toast; the rollback itself is animated consistently with R2.
- R4. While a field mutation is in flight, a subtle in-context loading indicator is shown (e.g., dimmed badge or spinner) without blocking further interaction on other fields.

**Task and column creation**
- R5. When a creation modal is submitted and dismissed, it exits with a smooth closing animation (≤200ms).
- R6. Newly created tasks enter their list with an entrance animation (≤200ms) so the appearance feels like an arrival rather than a flash.

**Drag and drop**
- R7. When a task is picked up, it lifts immediately with a visual affordance (e.g., shadow, slight scale) to signal it is in motion.
- R8. Sibling tasks animate to make room as the dragged item moves — no snap-repositioning on drop.
- R9. On drop, the task settles into its new position without a visible snap-back or layout jump.

**Modals and panels**
- R10. All dialogs enter with a consistent transition (≤200ms, e.g., scale from 0.95 + fade-in).
- R11. All dialogs exit with a matched transition (≤150ms) — no abrupt disappearance.
- R12. The task detail sidebar slides in from the right with a consistent ease-out transition (≤200ms) and slides out on close.

**Button and interactive element feedback**
- R13. All primary action buttons apply visible press feedback (e.g., brief scale-down) on click.
- R14. Buttons that trigger in-flight mutations show a pending visual state (dimmed, spinner, or reduced opacity) so users know the action registered.

## Success Criteria

- Changing a task status reflects the new value before the server responds; a server failure reverts it with an error toast.
- Dragging a task between columns shows smooth sibling-item repositioning — no snap or layout jump on drop.
- Every modal and the task detail sidebar enter and exit with transitions that feel matched, not abrupt.
- Every button that triggers a mutation has visible pending state while the request is in flight.

## Scope Boundaries

- Out of scope: keyboard shortcuts and command palette.
- Out of scope: motion beyond the task board, inline field edits, creation modals, and the task detail sidebar. Other surfaces (settings, onboarding, profile) are deferred to a later pass.
- Out of scope: mobile / touch-specific optimization.
- Out of scope: a formal motion design token system — let tokens emerge from implementation rather than being designed upfront.
- Out of scope: performance profiling or bundle-size optimization of the animation layer.

## Key Decisions

- **Premium feel over raw speed**: The primary goal is choreographed, intentional motion — not eliminating all perceived latency. Optimistic updates (R1, R3) serve the motion goal, not an independent performance goal.
- **High-frequency surfaces first**: Task board, inline edits, and primary modals are in scope. All other surfaces are deferred.
- **Consistent enter/exit pairing**: Every enter animation must have a matched exit animation. Asymmetric transitions (e.g., dialog fades in but snaps out) are a defect.

## Dependencies / Assumptions

- Framer Motion is already installed in `apps/web` — no new dependencies required for layout animations.
- The task board uses the existing drag-and-drop implementation in `apps/web/src/components/` — drag affordance improvements build on top of it.
- R1/R3 (optimistic field updates) require the mutation hooks in `apps/web/src/hooks/mutations/` to add rollback-capable cache state. This is the highest-complexity requirement and is likely where planning should begin.

## Outstanding Questions

### Resolve Before Planning
- *(none)*

### Deferred to Planning
- [Affects R1, R3][Technical] Does the existing drag-and-drop library support layout animation for sibling items, or does it need to be supplemented?
- [Affects R1, R3][Technical] Which inline field mutations are most frequent and should be prioritized for optimistic update implementation? (Likely: status > priority > assignee > due date.)
- [Affects R8, R9][Needs research] Do current drag-and-drop list rendering patterns support layout animations without re-architecting the list components?

## Next Steps

-> `/ce:plan` for structured implementation planning
