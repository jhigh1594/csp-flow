---
title: "feat: Upgrade Wiki Editor to Tiptap Simple Template + Slash Menu"
type: feat
status: active
date: 2026-04-19
---

# feat: Upgrade Wiki Editor to Tiptap Simple Template + Slash Menu

## Overview

Replace the basic Tiptap editor in wiki pages with Tiptap's MIT-licensed Simple template and slash dropdown menu. This gives a Notion-like editing experience — clean toolbar, slash commands for quick formatting, responsive design, and dark mode support — without paid Tiptap Cloud dependencies.

## Problem Frame

The current wiki editor (`apps/web/src/components/wiki/tiptap-editor.tsx`) is a barebones Tiptap setup using only `StarterKit` with a manual toolbar of icon buttons. It works but feels utilitarian. The user wants a modern, Notion-like editing experience: clean formatting toolbar, slash commands, better visual polish, and an inline page title that feels like part of the document.

## Requirements Trace

- R1. Wiki editor has a clean, modern toolbar with common formatting (bold, italic, underline, headings, lists, alignment, links, images, undo/redo)
- R2. Typing `/` opens a slash command dropdown for quick block insertion (headings, lists, code block, blockquote, task list)
- R3. Page title is visually integrated as the first block in the editing area (inline title)
- R4. Editor supports dark mode and responsive design
- R5. Existing auto-save, lock, and archive functionality is preserved
- R6. No paid dependencies or external service requirements

## Scope Boundaries

- No real-time collaboration (Tiptap Cloud not needed)
- No AI features (no `@tiptap-pro/extension-ai`)
- No emoji picker or mentions (avoid paid deps)
- No drag-and-drop block reordering (not in Simple template)
- No schema changes — existing `title`, `contentHtml`, `contentJson` columns suffice
- No changes to wiki list view, create dialog, or API endpoints

## Context & Research

### Relevant Code and Patterns

- **Current editor**: `apps/web/src/components/wiki/tiptap-editor.tsx` — `useEditor` with `StarterKit`, manual toolbar buttons
- **Wiki page editor wrapper**: `apps/web/src/components/wiki/wiki-page-editor.tsx` — loads page, manages title state, debounced content save, lock/archive controls
- **Wiki route**: `apps/web/src/routes/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/wiki/$pageId.tsx` — renders `WikiPageEditor` inside `ProjectLayout`
- **Existing Tiptap deps**: `@tiptap/core`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-image`, `@tiptap/extension-link`, `@tiptap/extension-list`, `@tiptap/extension-task-list`, `@tiptap/extension-code-block-lowlight`, `@tiptap/extension-placeholder`, `@tiptap/extension-underline`, `@tiptap/extension-table*`, `@tiptap/markdown` — all already installed
- **Existing Tiptap styles**: `apps/web/src/index.css` — extensive `.kaneo-tiptap-*` and `.kaneo-comment-editor-*` classes for task comment editor and main editor. Wiki editor does NOT use these (it has its own minimal styling via Tailwind prose classes)
- **Update mutation**: `apps/web/src/hooks/mutations/wiki/use-update-wiki-page.ts` — accepts `{ id, title?, contentHtml?, contentJson? }`
- **Update fetcher**: `apps/web/src/fetchers/wiki/update-wiki-page.ts` — calls `client.wiki[":id"].$patch()`
- **API validation**: `apps/api/src/wiki/index.ts` — PATCH accepts optional `title`, `contentHtml`, `contentJson`

### External References

- Tiptap Simple template: https://tiptap.dev/docs/ui-components/templates/simple-editor — MIT licensed, installs via CLI
- Tiptap Slash Dropdown Menu: https://tiptap.dev/docs/ui-components/components/slash-dropdown-menu — MIT licensed
- Tiptap style setup: https://tiptap.dev/docs/ui-components/getting-started/style — SCSS-based, auto-injected into global stylesheet

## Key Technical Decisions

- **Inline title as visually integrated input (not part of editor content):** The title remains a separate controlled input, but styled to look like the first block in the editor — large font, no border, same background, placed directly above the editor content area. This avoids the complexity of extracting titles from editor JSON while giving the visual appearance the user wants. The slash menu does not trigger in the title input.
- **Simple template via CLI, not manual assembly:** Running `npx @tiptap/cli@latest add simple-editor slash-dropdown-menu` generates all the React components, hooks, icons, and utilities needed. These are MIT-licensed files we own and can modify. This is faster and more maintainable than building each component from scratch.
- **SCSS compilation with sass:** The template generates `.scss` files. Vite needs the `sass` package to compile them. The CLI auto-injects SCSS imports into `apps/web/src/index.css`.
- **Existing `kaneo-` styles are for task editors, not wiki:** The wiki editor currently uses Tailwind prose classes. The new Simple template will bring its own SCSS-based styles. These coexist because they target different CSS classes/elements.
- **Slash menu config (no AI/emoji/mentions):** Only enable: text, heading 1-3, bullet list, ordered list, task list, blockquote, code block. Skip items that require `@tiptap-pro` packages.

## Open Questions

### Deferred to Implementation

- **Exact generated component structure:** The Tiptap CLI generates components on install. Exact file paths and component APIs depend on what the CLI produces. The implementer should inspect the generated files and adapt the integration accordingly.
- **SCSS style conflicts:** The template's SCSS may introduce styles that interact with existing `.kaneo-tiptap-*` classes. The implementer should test both wiki editor and task comment editor after installation to verify no regressions.

## Implementation Units

- [x] **Unit 1: Install SCSS support and Tiptap template components**

**Goal:** Set up SCSS compilation and install the Simple template + slash dropdown menu via Tiptap CLI.

**Requirements:** R1, R2, R4

**Dependencies:** None

**Files:**
- Modify: `apps/web/package.json` — add `sass` dev dependency
- Create: `apps/web/src/components/tiptap-templates/` — generated by CLI
- Create: `apps/web/src/components/tiptap-ui/` — generated by CLI
- Create: `apps/web/src/components/tiptap-lib/` — generated by CLI (utils, hooks)
- Create: `apps/web/src/styles/` — generated SCSS files
- Modify: `apps/web/src/index.css` — auto-injected SCSS imports

**Approach:**
1. Install `sass` as a dev dependency: `pnpm --filter @kaneo/web add -D sass`
2. Run `npx @tiptap/cli@latest add simple-editor` from `apps/web/` directory
3. Run `npx @tiptap/cli@latest add slash-dropdown-menu` from `apps/web/` directory
4. The CLI will: generate React components, generate SCSS style files, inject `@import` statements into `apps/web/src/index.css`
5. Verify SCSS compiles by starting the dev server

**Patterns to follow:**
- Tiptap CLI standard installation flow

**Test scenarios:**
- Happy path: dev server starts without SCSS compilation errors
- Happy path: generated `SimpleEditor` component renders in a test page
- Edge case: existing task comment editor styles are unaffected

**Verification:**
- `pnpm dev` starts without errors
- Generated component files exist in `src/components/tiptap-templates/`

---

- [x] **Unit 2: Create wiki editor with Simple template + slash menu + inline title**

**Goal:** Build the new wiki editor component that composes the Simple template editor, slash dropdown menu, and inline title into a cohesive Notion-like editing experience.

**Requirements:** R1, R2, R3, R4, R5

**Dependencies:** Unit 1

**Files:**
- Create: `apps/web/src/components/wiki/wiki-editor.tsx`
- Modify: `apps/web/src/components/wiki/wiki-page-editor.tsx`

**Approach:**

Create a new `wiki-editor.tsx` component that:
1. Renders the SimpleEditor template (or a custom composition of its generated UI components) with the editor instance exposed
2. Renders the SlashDropdownMenu alongside the editor, configured with enabled items: text, heading 1-3, bullet list, ordered list, task list, blockquote, code block
3. Provides the `editor` instance to the parent via a ref or callback so the wiki-page-editor can extract content for saving
4. Handles `editable` prop for locked pages (read-only mode hides toolbar and disables editing)
5. Accepts `contentJson` for initial content and calls `onUpdate(html, json)` on content changes
6. The inline title is a borderless input (`<input>` or `<textarea>`) styled to match the editor's typography — placed directly above the editor in the same container, with no visual separator

Update `wiki-page-editor.tsx` to:
1. Replace the old `TiptapEditor` component with the new `WikiEditor`
2. Keep the existing title state management (but render it as the inline title input inside the editor container)
3. Keep the existing debounced content save (`handleContentUpdate`, `handleSaveContent`)
4. Keep lock/unlock and archive buttons in the header bar
5. Remove the old separate title `<Input>` and toolbar area

**Inline title styling approach:**
- Title input: `text-2xl font-semibold tracking-tight bg-transparent border-0 outline-none placeholder:text-muted-foreground/40 w-full px-0 py-2` — visually matches an h1 in the editor
- Editor area starts immediately below with no border or separator
- Both wrapped in a single container with consistent padding

**Slash menu configuration:**
```tsx
config={{
  enabledItems: ['text', 'heading_1', 'heading_2', 'heading_3', 'bullet_list', 'ordered_list', 'task_list', 'quote', 'code_block'],
  showGroups: true,
  itemGroups: {
    text: 'Basic',
    heading_1: 'Headings',
    heading_2: 'Headings',
    heading_3: 'Headings',
    bullet_list: 'Lists',
    ordered_list: 'Lists',
    task_list: 'Lists',
    quote: 'Blocks',
    code_block: 'Blocks',
  },
}}
```

**Execution note:** After CLI installation in Unit 1, inspect the generated `SimpleEditor` component to understand its exact API (props, editor instance access, content initialization). Adapt the composition accordingly.

**Patterns to follow:**
- Existing `wiki-page-editor.tsx` for state management, save logic, and header controls
- Generated `SimpleEditor` component for editor structure and UI components

**Test scenarios:**
- Happy path: editor renders with toolbar, slash menu, and inline title
- Happy path: typing `/` opens slash dropdown with configured items
- Happy path: selecting a slash item inserts the correct block type
- Happy path: content auto-saves with 300ms debounce
- Happy path: title saves on blur (unchanged from current behavior)
- Edge case: locked page shows read-only content, toolbar hidden
- Edge case: empty page shows placeholder text in both title and content
- Edge case: existing page with content loads correctly into the new editor

**Verification:**
- Wiki page renders in browser with new editor
- All formatting toolbar buttons work
- Slash menu opens and inserts blocks
- Content saves and persists across page reloads
- Locked pages are read-only

---

- [x] **Unit 3: Clean up and verify**

**Goal:** Remove the old editor component, verify the full wiki flow works end-to-end, and ensure no regressions in the task comment editor.

**Requirements:** R1-R6

**Dependencies:** Unit 2

**Files:**
- Delete: `apps/web/src/components/wiki/tiptap-editor.tsx`
- Verify: `apps/web/src/components/wiki/wiki-page-editor.tsx` — no imports from deleted file

**Approach:**
1. Delete `apps/web/src/components/wiki/tiptap-editor.tsx` — it's no longer imported anywhere
2. Verify no remaining imports reference the deleted file
3. Run typecheck to confirm no compile errors
4. Test the full wiki flow in browser: create page → edit title → add content → use slash menu → lock → archive → navigate back
5. Test task comment editor still works (it uses the existing `.kaneo-tiptap-*` styles, not the wiki editor)
6. Test dark mode toggle — editor should render correctly in both themes

**Test scenarios:**
- Happy path: full wiki CRUD flow works without errors
- Happy path: task comment editor renders and functions correctly (no regression)
- Happy path: dark mode renders correctly for wiki editor
- Happy path: wiki page list still shows correct titles and timestamps

**Verification:**
- `pnpm --filter @kaneo/web typecheck` passes
- Wiki flow works end-to-end in browser
- Task comment editor unaffected

## System-Wide Impact

- **Interaction graph:** Only the wiki editor component changes. No API, database, or other frontend components are affected.
- **API surface:** Unchanged. The update mutation still accepts `{ id, title?, contentHtml?, contentJson? }`.
- **Bundle size:** The Simple template adds SCSS-compiled CSS and additional React components. Expect moderate bundle increase (~50-100KB) from new UI components.
- **Unchanged invariants:** Task comment editor, task detail editor, and all other Tiptap instances use different components and CSS classes. Wiki editor changes do not affect them.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| SCSS compilation fails in Vite | Install `sass` before running CLI. Verify with `pnpm dev`. |
| Generated component API differs from docs | Inspect generated files before composing. Adapt integration to actual API. |
| SCSS styles conflict with existing Tiptap styles | Wiki editor uses different CSS classes than task editor. Test both after install. |
| Slash dropdown menu requires paid extensions | Configure `enabledItems` to exclude AI/emoji/mention items that need `@tiptap-pro`. |
| Bundle size increase from template components | Simple template is MIT and tree-shakeable. Only imports used components. |

## Sources & References

- Tiptap Simple template: https://tiptap.dev/docs/ui-components/templates/simple-editor
- Tiptap Slash Dropdown Menu: https://tiptap.dev/docs/ui-components/components/slash-dropdown-menu
- Tiptap style setup: https://tiptap.dev/docs/ui-components/getting-started/style
- Origin wiki plan: `docs/plans/2026-04-18-002-feat-wiki-pages-plan.md`
