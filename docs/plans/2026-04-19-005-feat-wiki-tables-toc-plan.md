---
title: "feat: Add Tables and Table of Contents to Wiki Editor"
type: feat
status: active
date: 2026-04-19
origin: docs/plans/2026-04-19-004-feat-wiki-notion-editor-plan.md
---

# feat: Add Tables and Table of Contents to Wiki Editor

## Overview

Add table support and a heading-based Table of Contents to the wiki editor. Tables let users insert and edit tabular data inline. The ToC renders a clickable outline of document headings in a sidebar, with active/scroll state tracking.

## Problem Frame

The wiki editor (upgraded in plan 004) supports rich text but lacks two common document features: tables for structured data and a table of contents for long documents. Users writing project docs, meeting notes, or specifications need both.

## Requirements Trace

- R1. Users can insert tables via toolbar button and slash menu
- R2. Tables support add/delete rows and columns, merge cells, and basic cell navigation
- R3. Table styling matches the existing wiki editor aesthetic (light + dark mode)
- R4. A Table of Contents sidebar shows all document headings (h1-h3) with hierarchy
- R5. Clicking a ToC entry scrolls to that heading in the editor
- R6. ToC highlights the currently active heading based on scroll position
- R7. ToC is hidden when the document has no headings
- R8. Existing wiki functionality (save, lock, slash menu, formatting) is unaffected

## Scope Boundaries

- No table column resizing UI (Tiptap default behavior is sufficient)
- No table cell background color picker
- No ToC export or standalone rendering — ToC is editor-only
- No schema changes — table and heading data is already part of `contentJson`
- No changes to API endpoints or database

## Context & Research

### Relevant Code and Patterns

- **Wiki editor**: `apps/web/src/components/wiki/wiki-editor.tsx` — `useEditor` with StarterKit, TaskList, TaskItem, Underline, Image, Placeholder. Custom slash menu. Does NOT include table extensions.
- **Wiki page wrapper**: `apps/web/src/components/wiki/wiki-page-editor.tsx` — loads page, manages title/content state, debounced save, lock/archive controls
- **Already installed table deps**: `@tiptap/extension-table`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header`, `@tiptap/extension-table-row` (all ^3.20.1)
- **NOT installed**: `@tiptap/extension-table-of-contents` (available on public npm at ^3.22.4)
- **Table styles**: Existing in `apps/web/src/index.css` for `.kaneo-tiptap-content` and `.kaneo-comment-editor-prose` — NOT for `.wiki-editor-content-wrapper`
- **ToC extension API**: Provides `onUpdate` callback receiving anchors array with `{ id, textContent, level, isActive, isScrolledOver }`. Configurable `scrollParent` for scroll tracking.

### External References

- Tiptap TableKit: https://tiptap.dev/docs/editor/extensions/nodes/table
- Tiptap TableOfContents: https://tiptap.dev/docs/editor/extensions/functionality/table-of-contents

## Key Technical Decisions

- **Use TableKit from `@tiptap/extension-table`**: Already installed. Provides Table, TableRow, TableCell, TableHeader in one import. Cleaner than registering each extension individually.
- **Install `@tiptap/extension-table-of-contents` from public npm**: Available at v3.22.4. No private registry needed despite docs mentioning one. Use its `onUpdate` callback to feed React state for the ToC sidebar.
- **ToC as a collapsible sidebar panel**: The wiki page layout (`wiki-page-editor.tsx`) currently has a single-column editor. The ToC will render as a right sidebar panel that appears when headings exist. It collapses to an icon when the document has no headings or the user toggles it off. This avoids layout disruption for short documents while providing navigation for long ones.
- **ToC scroll parent = editor content wrapper**: The wiki editor scrolls within `.wiki-editor-content-wrapper`, not the window. Configure `scrollParent` to return that DOM element so active-heading tracking works correctly.
- **Reuse existing table styles**: Mirror the table styles from `.kaneo-tiptap-content` to `.wiki-editor-content-wrapper` in `index.css`, adjusted for wiki editor context.

## Open Questions

### Deferred to Implementation

- **Exact ToC sidebar width and toggle UI**: The implementer should match the existing project sidebar aesthetic. A toggle button in the header bar (next to lock/archive) is the likely pattern.
- **Table slash menu icon**: The custom slash menu renders text labels. Adding a table entry with label "Table" and group "Blocks" follows the existing pattern.

## Implementation Units

- [x] **Unit 1: Add table extensions, toolbar button, and slash menu entry**

**Goal:** Enable table insertion and editing in the wiki editor via toolbar and slash menu.

**Requirements:** R1, R2, R3

**Dependencies:** None

**Files:**
- Modify: `apps/web/src/components/wiki/wiki-editor.tsx` — add TableKit to extensions, add table toolbar button, add "table" slash command
- Modify: `apps/web/src/index.css` — add wiki-editor table styles

**Approach:**
1. Import `TableKit` from `@tiptap/extension-table` and add it to the `useEditor` extensions array
2. Add a "Table" entry to the `SLASH_COMMANDS` array with group "Blocks" that calls `editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()`
3. Add a table toolbar button in the `ToolbarGroup` that contains BlockquoteButton and CodeBlockButton — an insert-table button using the `Table` icon from lucide-react
4. Add table CSS rules to `.wiki-editor-content-wrapper` mirroring the existing `.kaneo-tiptap-content .ProseMirror table` styles (border-collapse, cell borders, th background, selectedCell highlight, tableWrapper overflow)

**Patterns to follow:**
- Existing slash command entries in `wiki-editor.tsx` for the table slash command structure
- Existing `.kaneo-tiptap-content` table styles in `index.css` for CSS patterns
- Existing toolbar button pattern (BlockquoteButton, CodeBlockButton) for the table button

**Test scenarios:**
- Happy path: typing "/" shows "Table" in slash menu under Blocks group
- Happy path: selecting "Table" inserts a 3x3 table with header row
- Happy path: table toolbar button inserts a table at cursor position
- Happy path: can add/delete rows and columns via Tiptap default table controls
- Happy path: table renders with borders, header background, and cell padding
- Edge case: table in a locked/read-only page is visible but not editable
- Edge case: table overflows horizontally — wrapper scrolls

**Verification:**
- Tables render correctly in the wiki editor with proper styling
- Slash menu includes table option
- Toolbar table button works
- Table editing (add/delete rows/columns) functions

---

- [x] **Unit 2: Build Table of Contents sidebar component**

**Goal:** Create a ToC sidebar that displays document headings, tracks scroll state, and scrolls to heading on click.

**Requirements:** R4, R5, R6, R7

**Dependencies:** Unit 1 (needs the editor with TableKit extensions registered)

**Files:**
- Create: `apps/web/src/components/wiki/wiki-toc.tsx`
- Modify: `apps/web/src/components/wiki/wiki-editor.tsx` — install `@tiptap/extension-table-of-contents`, add ToC extension, expose anchors state
- Modify: `apps/web/src/components/wiki/wiki-page-editor.tsx` — render ToC sidebar, add toggle button
- Modify: `apps/web/src/index.css` — add ToC sidebar styles

**Approach:**

1. Install `@tiptap/extension-table-of-contents` via `pnpm --filter @kaneo/web add @tiptap/extension-table-of-contents`
2. In `wiki-editor.tsx`:
   - Import `TableOfContents` from `@tiptap/extension-table-of-contents`
   - Add React state `const [tocAnchors, setTocAnchors] = useState([])` 
   - Add `TableOfContents` extension configured with:
     - `scrollParent: () => editorContentRef.current` (the `.wiki-editor-content-wrapper` DOM element)
     - `onUpdate: (anchors) => setTocAnchors(anchors)`
   - Expose `tocAnchors` and `editorContentRef` via callback or forwarded ref
3. Create `wiki-toc.tsx` component:
   - Accept `anchors` array prop (from TableOfContents extension)
   - Render a vertical list of headings with indentation based on `itemIndex` and `level`
   - Each item is clickable — scrolls the editor to that heading's position
   - Active item gets a visual highlight (left border accent + bold text)
   - Scrolled-over items get muted styling
   - Hidden when `anchors.length === 0`
4. In `wiki-page-editor.tsx`:
   - Render the ToC sidebar to the right of the editor
   - Add a toggle button in the header bar (next to lock/archive) to show/hide the ToC
   - The editor and ToC share a flex row: editor takes remaining space, ToC takes fixed width (~240px)
5. Add ToC styles to `index.css` under `.wiki-toc-*` class prefix

**ToC component structure:**
```
.wiki-page-body (flex row)
  .wiki-editor-wrapper (flex-1)
  .wiki-toc-sidebar (fixed width, collapsible)
    .wiki-toc-header ("On this page")
    .wiki-toc-list
      .wiki-toc-item (per anchor, indented by level)
        .wiki-toc-link (clickable, shows textContent)
```

**Patterns to follow:**
- Tiptap TableOfContents React integration pattern from docs (`onUpdate` -> `useState`)
- Existing wiki editor wrapper layout for flex structure
- Existing CSS variable usage for colors (var(--foreground), var(--muted-foreground), etc.)

**Test scenarios:**
- Happy path: document with h1, h2, h3 headings shows ToC with correct hierarchy
- Happy path: clicking a ToC item scrolls the editor to that heading
- Happy path: scrolling the editor updates the active heading in ToC
- Happy path: ToC is hidden when document has no headings
- Happy path: toggle button shows/hides the ToC sidebar
- Edge case: adding a new heading via slash menu updates the ToC immediately
- Edge case: deleting all headings hides the ToC
- Edge case: very long heading text is truncated with ellipsis in ToC

**Verification:**
- ToC sidebar renders with document headings
- Click-to-scroll works
- Active heading tracking works
- Toggle show/hide works
- No headings = no ToC visible

---

- [x] **Unit 3: Verify integration and edge cases**

**Goal:** Confirm tables + ToC work together, existing features are unaffected, and both light/dark modes render correctly.

**Requirements:** R1-R8

**Dependencies:** Unit 1, Unit 2

**Files:**
- Verify: `apps/web/src/components/wiki/wiki-editor.tsx`
- Verify: `apps/web/src/components/wiki/wiki-page-editor.tsx`
- Verify: `apps/web/src/components/wiki/wiki-toc.tsx`

**Approach:**
1. Run `pnpm --filter @kaneo/web typecheck` to confirm no type errors
2. Test table + ToC interaction: insert a table below headings, verify ToC still tracks correctly
3. Test save/load: create a page with tables and headings, reload, verify content persists
4. Test locked page: tables are read-only, ToC still navigates, toggle still works
5. Test dark mode: table borders, header backgrounds, ToC sidebar all render correctly
6. Test responsive: ToC sidebar collapses or hides on narrow viewports
7. Verify existing features: slash menu, toolbar, auto-save, lock/unlock, archive all work

**Test scenarios:**
- Happy path: page with both tables and headings saves and loads correctly
- Happy path: dark mode renders tables and ToC with correct colors
- Happy path: locked page shows tables as read-only and ToC as navigation-only
- Happy path: existing task comment editor is unaffected (uses different CSS classes)

**Verification:**
- `pnpm --filter @kaneo/web typecheck` passes
- Full wiki flow works: create → edit with tables/headings → save → reload → lock → archive
- Dark mode renders correctly
- Task comment editor unaffected

## System-Wide Impact

- **Interaction graph:** Only wiki editor components change. No API, database, or other frontend modules affected.
- **API surface:** Unchanged. Tables and headings are already part of the editor's JSON output.
- **Bundle size:** Small increase from `@tiptap/extension-table-of-contents` (~10-15KB). Table extensions already installed but unused — wiring them up adds no new code.
- **Unchanged invariants:** Task comment editor, task detail editor, and all other Tiptap instances use different components and CSS classes.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| ToC scroll tracking doesn't work with editor scroll container | Configure `scrollParent` to return the actual scrolling DOM element, not window |
| Table extension version mismatch with other @tiptap packages | Pin `@tiptap/extension-table-of-contents` to `^3.20.1` to match existing tiptap versions |
| ToC sidebar breaks editor layout on narrow screens | Add responsive breakpoint to hide/collapse ToC below a threshold |
| TableOfContents extension requires headings to have IDs | The extension auto-generates IDs via its `getId` config (defaults to uuid) |

## Sources & References

- **Origin plan:** `docs/plans/2026-04-19-004-feat-wiki-notion-editor-plan.md`
- Tiptap TableKit: https://tiptap.dev/docs/editor/extensions/nodes/table
- Tiptap TableOfContents: https://tiptap.dev/docs/editor/extensions/functionality/table-of-contents
- Related code: `apps/web/src/components/wiki/wiki-editor.tsx`
