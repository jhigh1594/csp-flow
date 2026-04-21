# Program Tracker Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Overview / Roadmap / Week-over-Week tab strip to all three Program Tracker pages so users can navigate between views that already exist but are currently unreachable without knowing the URL.

**Architecture:** A single `ProgramNav` component reads `workspaceId` as a prop and the current path via `useLocation()` to determine the active tab. It renders three `Link` elements styled as pill-buttons matching the existing project view-switcher pattern. Each of the three program route files imports `ProgramNav` and renders it as the first element inside their content area.

**Tech Stack:** React 19, TanStack Router (`useLocation`, `Link`), Tailwind CSS v4, Vitest + Testing Library

---

## File Map

| Action | Path |
|---|---|
| **Create** | `apps/web/src/components/program/program-nav.tsx` |
| **Create** | `apps/web/src/components/program/program-nav.test.tsx` |
| **Modify** | `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/program/index.tsx` |
| **Modify** | `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/program/roadmap/index.tsx` |
| **Modify** | `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/program/week-over-week/index.tsx` |

---

## Task 1: Write the failing test for ProgramNav

**Files:**
- Create: `apps/web/src/components/program/program-nav.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
// apps/web/src/components/program/program-nav.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProgramNav from "./program-nav";

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({
    pathname: "/dashboard/workspace/ws-1/program",
  }),
  Link: ({
    children,
    className,
    to,
    params,
  }: {
    children: React.ReactNode;
    className?: string;
    to: string;
    params?: Record<string, string>;
  }) => (
    <a href={to} className={className} data-params={JSON.stringify(params)}>
      {children}
    </a>
  ),
}));

describe("ProgramNav", () => {
  it("renders all three tabs", () => {
    render(<ProgramNav workspaceId="ws-1" />);
    expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Roadmap" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Week-over-Week" }),
    ).toBeInTheDocument();
  });

  it("marks Overview as active when on the program root", () => {
    render(<ProgramNav workspaceId="ws-1" />);
    const overview = screen.getByRole("link", { name: "Overview" });
    expect(overview.className).toContain("bg-secondary");
  });

  it("does not mark Roadmap or Week-over-Week as active on program root", () => {
    render(<ProgramNav workspaceId="ws-1" />);
    const roadmap = screen.getByRole("link", { name: "Roadmap" });
    const wow = screen.getByRole("link", { name: "Week-over-Week" });
    expect(roadmap.className).not.toContain("bg-secondary");
    expect(wow.className).not.toContain("bg-secondary");
  });
});

describe("ProgramNav on Roadmap route", () => {
  it("marks Roadmap as active", () => {
    vi.mocked(
      // biome-ignore lint/suspicious/noExplicitAny: test override
      (await import("@tanstack/react-router")) as any,
    );
  });
});
```

Wait — the `vi.mock` at module scope will apply to all tests in the file. To test different `pathname` values, use a factory mock with a variable. Replace the entire test file with:

```tsx
// apps/web/src/components/program/program-nav.test.tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

let mockPathname = "/dashboard/workspace/ws-1/program";

vi.mock("@tanstack/react-router", () => ({
  useLocation: () => ({ pathname: mockPathname }),
  Link: ({
    children,
    className,
    to,
    params,
  }: {
    children: React.ReactNode;
    className?: string;
    to: string;
    params?: Record<string, string>;
  }) => (
    <a href={to} className={className} data-params={JSON.stringify(params)}>
      {children}
    </a>
  ),
}));

// Imported after mock so it picks up the mock
const { default: ProgramNav } = await import("./program-nav");

describe("ProgramNav", () => {
  it("renders all three tabs", () => {
    mockPathname = "/dashboard/workspace/ws-1/program";
    render(<ProgramNav workspaceId="ws-1" />);
    expect(screen.getByRole("link", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Roadmap" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Week-over-Week" }),
    ).toBeInTheDocument();
  });

  it("marks Overview active on program root", () => {
    mockPathname = "/dashboard/workspace/ws-1/program";
    render(<ProgramNav workspaceId="ws-1" />);
    expect(
      screen.getByRole("link", { name: "Overview" }).className,
    ).toContain("bg-secondary");
    expect(
      screen.getByRole("link", { name: "Roadmap" }).className,
    ).not.toContain("bg-secondary");
    expect(
      screen.getByRole("link", { name: "Week-over-Week" }).className,
    ).not.toContain("bg-secondary");
  });

  it("marks Roadmap active on roadmap route", () => {
    mockPathname = "/dashboard/workspace/ws-1/program/roadmap";
    render(<ProgramNav workspaceId="ws-1" />);
    expect(
      screen.getByRole("link", { name: "Roadmap" }).className,
    ).toContain("bg-secondary");
    expect(
      screen.getByRole("link", { name: "Overview" }).className,
    ).not.toContain("bg-secondary");
  });

  it("marks Week-over-Week active on week-over-week route", () => {
    mockPathname = "/dashboard/workspace/ws-1/program/week-over-week";
    render(<ProgramNav workspaceId="ws-1" />);
    expect(
      screen.getByRole("link", { name: "Week-over-Week" }).className,
    ).toContain("bg-secondary");
    expect(
      screen.getByRole("link", { name: "Overview" }).className,
    ).not.toContain("bg-secondary");
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
pnpm --filter @kaneo/web test -- src/components/program/program-nav.test.tsx
```

Expected: FAIL — `Cannot find module './program-nav'`

---

## Task 2: Create the ProgramNav component

**Files:**
- Create: `apps/web/src/components/program/program-nav.tsx`

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/program/program-nav.tsx
import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/cn";

type ProgramNavProps = {
  workspaceId: string;
};

export default function ProgramNav({ workspaceId }: ProgramNavProps) {
  const location = useLocation();
  const base = `/dashboard/workspace/${workspaceId}/program`;

  const isOverview =
    location.pathname === base || location.pathname === `${base}/`;
  const isRoadmap = location.pathname.startsWith(`${base}/roadmap`);
  const isWoW = location.pathname.startsWith(`${base}/week-over-week`);

  const tabClass = (active: boolean) =>
    cn(
      "inline-flex h-6 items-center rounded-md px-2 text-xs font-medium transition-colors",
      active
        ? "bg-secondary text-secondary-foreground"
        : "text-foreground hover:bg-accent",
    );

  return (
    <div className="inline-flex h-8 items-center gap-0.5 rounded-lg border border-border/80 bg-background p-0.5">
      <Link
        to="/dashboard/workspace/$workspaceId/program"
        params={{ workspaceId }}
        className={tabClass(isOverview)}
      >
        Overview
      </Link>
      <Link
        to="/dashboard/workspace/$workspaceId/program/roadmap"
        params={{ workspaceId }}
        className={tabClass(isRoadmap)}
      >
        Roadmap
      </Link>
      <Link
        to="/dashboard/workspace/$workspaceId/program/week-over-week"
        params={{ workspaceId }}
        className={tabClass(isWoW)}
      >
        Week-over-Week
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Run the test to confirm it passes**

```bash
pnpm --filter @kaneo/web test -- src/components/program/program-nav.test.tsx
```

Expected: All 4 tests PASS

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/program/program-nav.tsx apps/web/src/components/program/program-nav.test.tsx
git commit -m "feat(program): add ProgramNav tab strip component"
```

---

## Task 3: Add ProgramNav to the Overview page

**Files:**
- Modify: `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/program/index.tsx`

The overview page has two render paths: loading skeleton and main content. Add `<ProgramNav workspaceId={workspaceId} />` as the first element inside the content `<div>` of both.

- [ ] **Step 1: Add import at the top of the file**

Find the existing imports block and add:

```tsx
import ProgramNav from "@/components/program/program-nav";
```

- [ ] **Step 2: Add ProgramNav to the loading state**

Find the loading return (search for `isLoading`). It renders:

```tsx
<WorkspaceLayout title="Program Tracker">
  <div className="p-6 space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

Change it to:

```tsx
<WorkspaceLayout title="Program Tracker">
  <div className="p-6 space-y-6">
    <ProgramNav workspaceId={workspaceId} />
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
```

- [ ] **Step 3: Add ProgramNav to the main content render**

Find the main return (search for `space-y-8`). It renders:

```tsx
<WorkspaceLayout title="Program Tracker">
  <div className="p-6 space-y-8">
    {/* Team cards grid */}
```

Change it to:

```tsx
<WorkspaceLayout title="Program Tracker">
  <div className="p-6 space-y-8">
    <ProgramNav workspaceId={workspaceId} />
    {/* Team cards grid */}
```

- [ ] **Step 4: Type-check**

```bash
pnpm --filter @kaneo/web typecheck
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add "apps/web/src/routes/_layout/_authenticated/dashboard/workspace/\$workspaceId/program/index.tsx"
git commit -m "feat(program): add ProgramNav to overview page"
```

---

## Task 4: Add ProgramNav to the Roadmap page

**Files:**
- Modify: `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/program/roadmap/index.tsx`

The roadmap page has two render paths: loading skeleton and main content.

- [ ] **Step 1: Add import**

Add at the top of the file:

```tsx
import ProgramNav from "@/components/program/program-nav";
```

- [ ] **Step 2: Add ProgramNav to the loading state**

Find the loading return (search for `isLoading`). It renders:

```tsx
<WorkspaceLayout title="Roadmap">
  <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 xl:grid-cols-4">
```

Change the outer div to include the nav:

```tsx
<WorkspaceLayout title="Roadmap">
  <div className="p-6 space-y-4">
    <ProgramNav workspaceId={workspaceId} />
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
```

- [ ] **Step 3: Add ProgramNav to the main content render**

Find the main return (search for the second `WorkspaceLayout` with title="Roadmap"). It renders:

```tsx
<WorkspaceLayout title="Roadmap">
  <div className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 xl:grid-cols-4">
```

Change it to:

```tsx
<WorkspaceLayout title="Roadmap">
  <div className="p-6 space-y-4">
    <ProgramNav workspaceId={workspaceId} />
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
```

Note: the grid `div` that was a direct child of `WorkspaceLayout` is now nested inside the wrapper `div`. Close the new outer `div` at the end of the render, after the closing `</div>` of the grid.

- [ ] **Step 4: Type-check**

```bash
pnpm --filter @kaneo/web typecheck
```

Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add "apps/web/src/routes/_layout/_authenticated/dashboard/workspace/\$workspaceId/program/roadmap/index.tsx"
git commit -m "feat(program): add ProgramNav to roadmap page"
```

---

## Task 5: Add ProgramNav to the Week-over-Week page

**Files:**
- Modify: `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/program/week-over-week/index.tsx`

This page has three render paths: loading, empty (no snapshots), and main content. Add `<ProgramNav workspaceId={workspaceId} />` to each.

- [ ] **Step 1: Add import**

Add at the top of the file:

```tsx
import ProgramNav from "@/components/program/program-nav";
```

- [ ] **Step 2: Add ProgramNav to the loading state**

Find the loading return (search for `isLoading`). It renders:

```tsx
<WorkspaceLayout title="Week-over-Week">
  <div className="p-6 space-y-4">
    <div className="flex gap-2">
```

Change to:

```tsx
<WorkspaceLayout title="Week-over-Week">
  <div className="p-6 space-y-4">
    <ProgramNav workspaceId={workspaceId} />
    <div className="flex gap-2">
```

- [ ] **Step 3: Add ProgramNav to the empty state**

Find the empty state return (search for `No snapshots yet`). It renders:

```tsx
<WorkspaceLayout title="Week-over-Week">
  <div className="flex items-center justify-center min-h-[60vh]">
```

Change to:

```tsx
<WorkspaceLayout title="Week-over-Week">
  <div className="p-6 space-y-4">
    <ProgramNav workspaceId={workspaceId} />
    <div className="flex items-center justify-center min-h-[60vh]">
      {/* existing empty state content */}
    </div>
  </div>
```

Note: the inner `div` that was a direct child of `WorkspaceLayout` is now nested. Close the new outer wrapper `div` after the inner `div`.

- [ ] **Step 4: Add ProgramNav to the main content render**

Find the main return (the `return (` after the empty state check). Locate the first `<WorkspaceLayout title="Week-over-Week">` in that block. Its first child content div — add `<ProgramNav workspaceId={workspaceId} />` as the first element inside it.

The pattern will be whatever the existing first child div is — add `<ProgramNav workspaceId={workspaceId} />` before its contents.

- [ ] **Step 5: Type-check**

```bash
pnpm --filter @kaneo/web typecheck
```

Expected: no errors

- [ ] **Step 6: Commit**

```bash
git add "apps/web/src/routes/_layout/_authenticated/dashboard/workspace/\$workspaceId/program/week-over-week/index.tsx"
git commit -m "feat(program): add ProgramNav to week-over-week page"
```

---

## Task 6: Verify in the browser

- [ ] **Step 1: Start the dev servers**

```bash
pnpm dev
```

Open `http://localhost:5173` and navigate to a workspace's Program Tracker.

- [ ] **Step 2: Check all three tabs render on the Overview**

Navigate to `/dashboard/workspace/<id>/program`. Confirm the tab strip shows Overview (active), Roadmap, Week-over-Week.

- [ ] **Step 3: Click Roadmap tab**

Confirm you land on the roadmap page with the quarterly grid. Confirm Roadmap tab is now highlighted, Overview is not.

- [ ] **Step 4: Click Week-over-Week tab**

Confirm you land on the week-over-week page. Confirm Week-over-Week tab is highlighted.

- [ ] **Step 5: Navigate directly to each route via URL**

Visit `/dashboard/workspace/<id>/program/roadmap` directly — confirm Roadmap tab is active. Visit `/dashboard/workspace/<id>/program/week-over-week` directly — confirm Week-over-Week tab is active.

- [ ] **Step 6: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass

---

## Self-Review

**Spec coverage:**
- ✅ New `ProgramNav` component with three router links (Overview, Roadmap, Week-over-Week)
- ✅ Active state via `useLocation()` matching current pathname
- ✅ Added to all three program route files
- ✅ No backend changes
- ✅ No new routes

**Placeholder scan:** None found.

**Type consistency:** `ProgramNavProps.workspaceId: string` used consistently across all tasks. `tabClass(active: boolean)` returns a string and is called in all three `Link` elements.

**Edge case:** The overview route pathname check handles both `/program` and `/program/` (with trailing slash) to guard against TanStack Router trailing-slash behavior differences.
