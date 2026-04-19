---
title: "feat: Add Wiki/Pages to Projects"
type: feat
status: active
date: 2026-04-18
---

# feat: Add Wiki/Pages to Projects

## Overview

Add a project-scoped wiki feature inspired by Plane's Pages. Users can create, edit, and organize rich-text documents within each project using a Tiptap WYSIWYG editor. This is the essential MVP — flat page list, CRUD, archive, and lock.

## Problem Frame

Projects currently have tasks, milestones, and a Gantt view but no place for freeform documentation. A wiki gives teams a space for meeting notes, design decisions, runbooks, and other knowledge that doesn't fit into a task. Plane's Pages feature proves this model — we're reverse-engineering the essentials.

## Requirements Trace

- R1. Users can create, view, edit, and delete wiki pages within a project
- R2. Pages support rich-text editing via Tiptap WYSIWYG editor
- R3. Pages can be archived and locked
- R4. Wiki is accessible as a project view alongside board/backlog/gantt
- R5. Only workspace members with project access can view/edit pages

## Scope Boundaries

- No page nesting/hierarchy (flat list only)
- No version history or restore
- No real-time collaboration
- No page favorites, labels, or duplication
- No workspace-level pages (project-scoped only)
- No entity embedding (linking to tasks/issues inline)
- No multi-project pages (one project per page)

## Context & Research

### Relevant Code and Patterns

- **Schema pattern**: `apps/api/src/database/schema.ts` — follow `milestoneTable` pattern (CUID2 IDs, cascade FKs, indexed columns)
- **Relations pattern**: `apps/api/src/database/relations.ts` — one-to-many from project
- **API route pattern**: `apps/api/src/milestone/index.ts` — Hono router with `describeRoute`, `validator`, `workspaceAccess` guards
- **Controller pattern**: `apps/api/src/milestone/controllers/create-milestone.ts` — pure async functions using Drizzle
- **Frontend fetcher pattern**: `apps/web/src/fetchers/milestone/create-milestone.ts` — uses type-safe Hono client
- **Query hook pattern**: `apps/web/src/hooks/queries/milestone/use-get-milestones.ts`
- **Mutation hook pattern**: `apps/web/src/hooks/mutations/milestone/use-create-milestone.ts`
- **Auth middleware**: `apps/api/src/utils/workspace-access-middleware.ts` — add `fromWikiPage()` method
- **Project layout**: `apps/web/src/components/common/project-layout.tsx` — extend view switcher with wiki tab
- **Route structure**: `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/`

### External References

- Plane's wiki implementation: `github.com/makeplane/plane` — data model uses 5 tables (Page, PageLabel, ProjectPage, PageLog, PageVersion). We simplify to 1 table.
- Tiptap editor: `tiptap.dev` — headless rich-text editor, framework-agnostic, extensible

## Key Technical Decisions

- **Single wiki_page table** (no join tables): Plane uses a ProjectPage join table because pages can belong to multiple projects. We don't need that — each page belongs to exactly one project via a direct FK. This eliminates a table and simplifies every query.
- **Content stored as HTML + JSON**: Tiptap outputs both HTML (for rendering/search) and JSON (for editor state rehydration). Store both columns, similar to Plane's approach but skip the binary format.
- **Flat page list (no nesting)**: Plane supports parent-child via self-referential FK. Skip for V1 — add later if needed. A flat list with sort_order is simpler to implement and reason about.
- **Project-scoped**: Pages belong to a project. No workspace-wide pages. This matches how the rest of the app works (tasks, milestones are all project-scoped).

## Open Questions

### Resolved During Planning

- **Editor choice**: Tiptap WYSIWYG — user confirmed. Provides rich formatting without the complexity of Plane's full ProseMirror setup.
- **Content format**: HTML + JSON dual storage — HTML for display/search, JSON for editor state.

### Deferred to Implementation

- **Tiptap extension set**: Which specific formatting options (bold, italic, headings, lists, code blocks, etc.) to enable. Decide during implementation based on bundle size and UX.

## Implementation Units

- [x] **Unit 1: Database schema, relations, and migration**

**Goal:** Add `wiki_page` table with all required columns and relations.

**Requirements:** R1, R3, R5

**Dependencies:** None

**Files:**
- Modify: `apps/api/src/database/schema.ts`
- Modify: `apps/api/src/database/relations.ts`
- Modify: `apps/api/src/database/index.ts`
- Create: migration (via `pnpm --filter @kaneo/api db:generate`)

**Approach:**
Add `wikiPageTable` with columns: `id` (CUID2 PK), `projectId` (FK to projects, cascade), `title` (text, not null), `contentHtml` (text, nullable — HTML from Tiptap), `contentJson` (jsonb, nullable — Tiptap editor state), `isLocked` (boolean, default false), `archivedAt` (timestamp, nullable), `sortOrder` (real, default 0), `createdBy` (text, FK to user), `createdAt`, `updatedAt`. Index on `projectId`. Add `wikiPageTableRelations` with one-to-one to project. Update `projectTableRelations` to include `wikiPages: many(...)`.

**Patterns to follow:**
- `apps/api/src/database/schema.ts` — `milestoneTable` definition (lines 755-776)
- `apps/api/src/database/relations.ts` — `milestoneTableRelations` (lines 115-120)

**Test scenarios:**
- Happy path: migration runs without error, table created with correct columns and types
- Edge case: foreign key cascade works — deleting a project removes all its wiki pages

**Verification:**
- `pnpm --filter @kaneo/api db:generate` produces a valid migration
- `pnpm --filter @kaneo/api db:migrate` applies it cleanly

---

- [x] **Unit 2: Auth middleware for wiki pages**

**Goal:** Add `workspaceAccess.fromWikiPage()` so endpoints can guard by page ID.

**Requirements:** R5

**Dependencies:** Unit 1

**Files:**
- Modify: `apps/api/src/utils/workspace-access-middleware.ts`

**Approach:**
Add `"wikiPage"` to the `WorkspaceIdSource` type union. Add a `case "wikiPage"` in `lookupWorkspaceId` that joins `wikiPageTable` → `projectTable` to resolve `workspaceId`. Add `fromWikiPage(idKey)` convenience method on the `workspaceAccess` object. Follow the exact pattern of the existing `fromMilestone()` method.

**Patterns to follow:**
- `apps/api/src/utils/workspace-access-middleware.ts` — `fromMilestone()` implementation

**Test scenarios:**
- Happy path: valid page ID resolves to correct workspace ID
- Error path: nonexistent page ID returns null (middleware will 403)
- Edge case: archived page still resolves (archive doesn't affect access)

**Verification:**
- TypeScript compiles without errors
- New method follows the same signature as `fromMilestone()`

---

- [x] **Unit 3: API endpoints (CRUD + archive + lock)**

**Goal:** Create full wiki page API with list, create, get, update, delete, archive/unarchive, and lock/unlock.

**Requirements:** R1, R3, R5

**Dependencies:** Unit 1, Unit 2

**Files:**
- Create: `apps/api/src/wiki/index.ts`
- Create: `apps/api/src/wiki/controllers/create-wiki-page.ts`
- Create: `apps/api/src/wiki/controllers/get-wiki-pages.ts`
- Create: `apps/api/src/wiki/controllers/get-wiki-page.ts`
- Create: `apps/api/src/wiki/controllers/update-wiki-page.ts`
- Create: `apps/api/src/wiki/controllers/delete-wiki-page.ts`
- Create: `apps/api/src/wiki/controllers/archive-wiki-page.ts`
- Create: `apps/api/src/wiki/controllers/lock-wiki-page.ts`
- Modify: `apps/api/src/index.ts` — mount route, add to AppType

**Approach:**

Endpoints:
- `GET /wiki/project/:projectId` — list pages (exclude archived, ordered by sortOrder then createdAt)
- `POST /wiki` — create page (requires projectId, title; content defaults empty)
- `GET /wiki/:id` — get single page
- `PATCH /wiki/:id` — update page (title, contentHtml, contentJson, sortOrder)
- `DELETE /wiki/:id` — delete page (must be archived first)
- `POST /wiki/:id/archive` — set archivedAt timestamp
- `DELETE /wiki/:id/archive` — clear archivedAt (unarchive)
- `POST /wiki/:id/lock` — set isLocked true
- `DELETE /wiki/:id/lock` — set isLocked false

List and create use `workspaceAccess.fromProject("projectId")`. Single-page operations use `workspaceAccess.fromWikiPage("id")`. All controllers are pure async functions using Drizzle. Valibot validation on all inputs.

**Patterns to follow:**
- `apps/api/src/milestone/index.ts` — route structure
- `apps/api/src/milestone/controllers/create-milestone.ts` — controller pattern

**Test scenarios:**
- Happy path: create page with title and projectId, verify returned object has correct fields
- Happy path: list pages returns only non-archived pages for the project
- Happy path: update page content (HTML + JSON) persists both formats
- Happy path: archive then unarchive a page
- Happy path: lock then unlock a page
- Error path: delete non-archived page returns error
- Error path: unauthenticated request returns 401
- Error path: non-member request returns 403

**Verification:**
- `pnpm build` succeeds
- `pnpm --filter @kaneo/api test:unit` passes

---

- [x] **Unit 4: Frontend fetchers and hooks**

**Goal:** Create the data layer — fetchers, query hooks, and mutation hooks for all wiki operations.

**Requirements:** R1, R3

**Dependencies:** Unit 3

**Files:**
- Create: `apps/web/src/fetchers/wiki/create-wiki-page.ts`
- Create: `apps/web/src/fetchers/wiki/get-wiki-pages.ts`
- Create: `apps/web/src/fetchers/wiki/get-wiki-page.ts`
- Create: `apps/web/src/fetchers/wiki/update-wiki-page.ts`
- Create: `apps/web/src/fetchers/wiki/delete-wiki-page.ts`
- Create: `apps/web/src/fetchers/wiki/archive-wiki-page.ts`
- Create: `apps/web/src/fetchers/wiki/lock-wiki-page.ts`
- Create: `apps/web/src/hooks/queries/wiki/use-get-wiki-pages.ts`
- Create: `apps/web/src/hooks/queries/wiki/use-get-wiki-page.ts`
- Create: `apps/web/src/hooks/mutations/wiki/use-create-wiki-page.ts`
- Create: `apps/web/src/hooks/mutations/wiki/use-update-wiki-page.ts`
- Create: `apps/web/src/hooks/mutations/wiki/use-delete-wiki-page.ts`
- Create: `apps/web/src/hooks/mutations/wiki/use-archive-wiki-page.ts`
- Create: `apps/web/src/hooks/mutations/wiki/use-lock-wiki-page.ts`

**Approach:**
Each fetcher wraps a single `client.wiki` call. Query hooks use `useQuery` with key `["wiki-pages", projectId]` or `["wiki-page", pageId]`. Mutation hooks invalidate the list query on success. Follow the exact naming and structure of the milestone fetchers/hooks.

**Patterns to follow:**
- `apps/web/src/fetchers/milestone/create-milestone.ts`
- `apps/web/src/hooks/queries/milestone/use-get-milestones.ts`
- `apps/web/src/hooks/mutations/milestone/use-create-milestone.ts`

**Test scenarios:**
- Happy path: create mutation calls fetcher and invalidates wiki-pages query
- Happy path: list query fetches pages for a project
- Edge case: query disabled when projectId is empty

**Verification:**
- `pnpm --filter @kaneo/web typecheck` passes

---

- [x] **Unit 5: Wiki list view (route + components)**

**Goal:** Create the wiki list page showing all pages in a project with create, archive, and delete actions.

**Requirements:** R1, R3, R4

**Dependencies:** Unit 4

**Files:**
- Create: `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/wiki.tsx`
- Create: `apps/web/src/components/wiki/wiki-page-list.tsx`
- Create: `apps/web/src/components/wiki/wiki-page-list-item.tsx`
- Create: `apps/web/src/components/wiki/create-wiki-page-dialog.tsx`

**Approach:**
The wiki route file uses `createFileRoute()` and renders a wiki-specific layout. The list component fetches pages via `useGetWikiPages(projectId)`, displays them as a simple list (title, last updated, locked/archived badges). Each item has a click handler to navigate to the page editor. A "New Page" button opens a dialog to create a page (title only, then navigates to editor). Archive and delete actions on each list item.

**Patterns to follow:**
- Existing project route files in `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/`
- List components in the codebase (task lists, milestone lists)

**Test scenarios:**
- Happy path: list renders pages with titles and metadata
- Happy path: clicking a page navigates to the editor route
- Happy path: create dialog creates a page and navigates to it
- Edge case: empty state when no pages exist — show helpful message with create button
- Edge case: archived pages shown with visual indicator

**Verification:**
- Route renders without errors in browser
- Create, archive, and delete actions work end-to-end

---

- [x] **Unit 6: Wiki page editor (route + Tiptap)**

**Goal:** Create the page editor view with Tiptap WYSIWYG and page metadata controls (lock, archive, delete).

**Requirements:** R2, R3, R5

**Dependencies:** Unit 4, Unit 5

**Files:**
- Create: `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/wiki/$pageId.tsx`
- Create: `apps/web/src/components/wiki/wiki-page-editor.tsx`
- Create: `apps/web/src/components/wiki/tiptap-editor.tsx`

**Approach:**
The editor route loads a single page via `useGetWikiPage(pageId)`. The page title is an editable field at the top (auto-save on blur via `useUpdateWikiPage`). The Tiptap editor renders `contentJson` as the initial state and saves both HTML and JSON on changes (debounced). A toolbar with basic formatting: bold, italic, headings (h1-h3), bullet list, ordered list, code block, blockquote. Lock/unlock and archive buttons in the page header. Navigation back to wiki list.

The `tiptap-editor.tsx` component wraps Tiptap's `useEditor` hook and `EditorContent`. Install `@tiptap/react`, `@tiptap/starter-kit`, and `@tiptap/pm` as dependencies. Use `StarterKit` extension as the base (includes paragraph, heading, bold, italic, lists, code, blockquote, etc.).

**Patterns to follow:**
- Route pattern from other project-scoped detail routes (e.g., task detail)
- Component pattern from existing editor or form components

**Test scenarios:**
- Happy path: page loads with title and content from API
- Happy path: editing title auto-saves on blur
- Happy path: typing in editor updates content, saves debounced
- Happy path: formatting toolbar applies bold, italic, headings, lists
- Edge case: locked page shows read-only content with unlock button
- Edge case: new page with empty content shows placeholder text
- Error path: nonexistent pageId shows 404 or redirect to list

**Verification:**
- Page renders in browser with Tiptap editor functional
- Content saves and reloads correctly
- Lock, archive, delete actions work

---

- [x] **Unit 7: Project layout integration**

**Goal:** Add "Wiki" tab to the project view switcher so users can navigate to the wiki from any project view.

**Requirements:** R4

**Dependencies:** Unit 5

**Files:**
- Modify: `apps/web/src/components/common/project-layout.tsx`

**Approach:**
Add a "Wiki" option to the view switcher (currently supports backlog, board, gantt). The tab navigates to the wiki route. Use the same styling and active-state pattern as existing tabs.

**Patterns to follow:**
- Existing tab definitions in `project-layout.tsx`

**Test scenarios:**
- Happy path: wiki tab appears alongside board/backlog/gantt
- Happy path: clicking wiki tab navigates to the wiki list route
- Happy path: wiki tab shows active state when on wiki routes

**Verification:**
- Wiki tab visible and functional in browser
- Navigation between views works without errors

## System-Wide Impact

- **Interaction graph:** Wiki pages are a new leaf entity — no existing callbacks, middleware, or observers need modification beyond the auth middleware and project layout
- **API surface:** New `/wiki` route mounted in the API. No existing routes change.
- **Unchanged invariants:** Tasks, milestones, projects, and all existing CRUD operations remain untouched. Wiki is purely additive.
- **Bundle size:** Tiptap adds ~100-150KB to the frontend bundle. StarterKit keeps it minimal.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Tiptap bundle size | Use StarterKit only (minimal extensions). No custom extensions in V1. |
| Content loss on concurrent edits | Out of scope for V1 — no real-time collab. Last write wins. Document this limitation. |
| Migration safety | Standard Drizzle migration — additive only, no existing table changes. Low risk. |

## Sources & References

- **Plane's wiki implementation:** `github.com/makeplane/plane` — data model (Page, ProjectPage, PageLog, PageVersion tables), API routes, frontend components
- **Tiptap documentation:** `tiptap.dev` — editor setup, extensions, React integration
- **Existing milestone feature** — schema, routes, controllers, fetchers, hooks as the canonical pattern to follow
