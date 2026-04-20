---
title: "feat: Expand MCP tools — search, wiki, milestones, milestone-task assignment"
type: feat
status: active
date: 2026-04-19
origin: docs/brainstorms/2026-04-19-mcp-gap-fill-requirements.md
---

# feat: Expand MCP tools — search, wiki, milestones, milestone-task assignment

## Overview

The CSP Flow MCP server (`apps/api/src/mcp/`) already has 18 tools and a full OAuth 2.0 auth stack. This plan adds 13 more tools across four capability groups — search, wiki, milestones, and milestone-task assignment — enabling AI agents to fully drive the app without human UI interaction.

All 13 tools live in `apps/api/src/mcp/tools.ts`. No new routes, schema changes, or migrations are required. The only structural addition is two npm dependencies for Markdown-to-HTML conversion and HTML sanitization.

## Problem Frame

Agents using the existing MCP can manage workspaces, projects, tasks, comments, and labels — but cannot search for content (requiring them to know IDs in advance), read or write wiki documentation, plan with milestones, or assign tasks to milestones. This closes those gaps. (See origin: `docs/brainstorms/2026-04-19-mcp-gap-fill-requirements.md`)

## Requirements Trace

- R1. Agents can search content by keyword across tasks, projects, workspaces, comments, and activities
- R2. Agents can read and write wiki pages using natural Markdown (not raw HTML or TipTap JSON)
- R3. Wiki pages written by agents render correctly when a human reopens them in the browser editor
- R4. Agents can list, create, update, and delete milestones for a project
- R5. Agents can query tasks assigned to a milestone and assign/unassign tasks from milestones
- R6. No regressions in the 18 existing MCP tools

## Scope Boundaries

- No new API routes, database schema changes, or migrations
- No lock/unlock wiki tools (human governance operation; locking would reduce agents' own write capability)
- No unarchive wiki tool (no concrete agent automation workflow requires it)
- `userEmail` not exposed in the search tool (API resolves userId from Bearer token session; no need)
- Time entries, task relations, workspace members, integrations, activity feed, column management — deferred

### Deferred to Separate Tasks

- MCP integration tests (`tests/api-integration/` coverage for new tools): separate PR after tools land

## Context & Research

### Relevant Code and Patterns

- `apps/api/src/mcp/tools.ts` — all 13 tools go here; follow existing `run()` + `ApiClient` + Zod schema pattern exactly
- `apps/api/src/mcp/index.ts` — MCP server wiring; no changes needed
- `apps/api/src/search/index.ts` — search endpoint shape
- `apps/api/src/wiki/index.ts` — all wiki endpoint shapes and precondition enforcement
- `apps/api/src/wiki/controllers/delete-wiki-page.ts` — enforces archive-before-delete; throws if `archivedAt` is null
- `apps/api/src/milestone/index.ts` — all milestone endpoint shapes
- `apps/api/src/task/index.ts` (lines 1019–1053) — `PUT /api/task/milestone/:id` for assignment
- `apps/api/src/task/controllers/update-task-milestone.ts` — validates milestone belongs to same project
- `apps/api/src/database/schema.ts` — `wikiPageTable` (contentHtml text, contentJson jsonb nullable), `milestoneTable`, `taskTable` (milestoneId nullable FK)

### Institutional Learnings

- `docs/plans/2026-04-19-004-feat-wiki-notion-editor-plan.md` — confirms TipTap browser editor loads from `contentJson` preferentially. MCP writes must send `contentJson: null` or the editor silently ignores the new HTML content
- No `docs/solutions/` directory exists in this project

### External References

- None needed; 18 existing MCP tools provide sufficient local patterns

## Key Technical Decisions

- **Markdown input for wiki writes:** Accept `content` as a Markdown string in `update_wiki_page`. Convert to HTML via `marked` in `tools.ts`. This is the only ergonomic interface for agents — raw HTML (Option B) and TipTap JSON (Option C) are both impractical.
- **HTML sanitization is mandatory:** `marked` does not sanitize; agent-generated Markdown can contain `<script>` tags or `javascript:` hrefs. Use `sanitize-html` (lighter, Node-focused) to sanitize before sending `contentHtml` to the API.
- **`markdownToSafeHtml` must be async:** In `marked@^17`, `marked.parse()` returns `string | Promise<string>`. Always `await` the result. Since all MCP tool handlers are already async functions passed to `run()`, this propagates naturally — no call-site changes needed beyond adding `await`.
- **Always send `contentJson: null` as an explicit JSON null on wiki updates:** The TipTap editor preferentially loads `contentJson`. If the MCP writes only `contentHtml` and leaves `contentJson` intact (by omitting the key), a human reopening the page sees the stale pre-MCP content. The body must include the key explicitly as `JSON.stringify({ ..., contentJson: null })` — omitting the key produces `undefined`, which the controller skips. Sending `null` clears the JSON column; the editor then falls back to the HTML. The `contentJson` column is nullable (`jsonb` with no `.notNull()`), so `null` is a valid database value.
- **`delete_wiki_page` wraps archive+delete with rollback:** The API enforces archive-before-delete at the controller level. The MCP tool calls `POST /api/wiki/:id/archive` then `DELETE /api/wiki/:id` in sequence. If the delete fails, the tool automatically calls `DELETE /api/wiki/:id/archive` (unarchive) to roll back, then returns the error. This leaves the page in its original non-archived state so the agent can retry cleanly. No separate `unarchive_wiki_page` tool is needed.
- **`update_milestone` does not need fetch-and-merge:** Unlike `update_task` (which requires all fields on PUT), the milestone PUT is a true partial update — only supplied fields are applied. No fetch-and-merge required.
- **Dependency versions:** Use `marked@^17.0.4` to match `apps/web`; add `sanitize-html` and `@types/sanitize-html` at latest stable.

## Open Questions

### Resolved During Planning

- **Should `contentJson` be omitted or explicitly nulled?** Explicitly send `null`. Omitting it preserves the stale TipTap JSON; the browser editor then ignores the new `contentHtml`. Sending `null` clears it, forcing the editor to render the HTML. (See wiki notion editor plan.)
- **Does a milestone-task assignment endpoint exist?** Yes: `PUT /api/task/milestone/:id` at task/index.ts:1019. The `:id` is the taskId; body carries `milestoneId`.
- **Is `update_milestone` a true partial update or does it need fetch-and-merge?** True partial — only `title` and `targetDate` are patchable, both optional. No fetch-and-merge needed.
- **Should `userEmail` be exposed in `search`?** No. MCP layer authenticates via Bearer token; the API resolves `userId` from the session. `userEmail` is a fallback for unauthenticated callers and has no value here.

### Deferred to Implementation

- Exact `sanitize-html` config (which tags to allow): implementation decision. A minimal allowlist (headings, paragraphs, lists, code, links, bold, italic) is a reasonable starting point; the implementer should review the wiki's rendered HTML to see what tag set the editor produces.
- Whether the `markdownToSafeHtml` helper belongs inline in `tools.ts` or in a tiny adjacent module: either is fine; inline keeps things simple given the file already holds all tool logic.

## High-Level Technical Design

> *This illustrates the intended approach and is directional guidance for review, not implementation specification. The implementing agent should treat it as context, not code to reproduce.*

```
update_wiki_page(id, title?, content?)
  │
  ├── if content provided:
  │     htmlString = await marked.parse(content)  // Markdown → HTML (async in v17)
  │     safeHtml   = sanitizeHtml(htmlString)     // strip unsafe tags/attrs
  │
  └── PATCH /api/wiki/:id  {
        title?:       title (if provided),
        contentHtml?: safeHtml (if content provided),
        contentJson:  null    // explicit null in JSON body — omitting key leaves stale TipTap state
      }
```

```
delete_wiki_page(id)
  │
  ├── POST  /api/wiki/:id/archive   // step 1: archive
  ├── DELETE /api/wiki/:id          // step 2: delete
  │     ├── success → done
  │     └── failure → DELETE /api/wiki/:id/archive  // rollback: unarchive
  │                   throw original error
  └── (page returns to non-archived state on rollback)
```

## Implementation Units

- [x] **Unit 1: Add markdown + sanitization dependencies**

**Goal:** Install `marked` and `sanitize-html` in `apps/api` so `tools.ts` can convert and sanitize Markdown.

**Requirements:** R2, R3

**Dependencies:** None

**Files:**
- Modify: `apps/api/package.json`

**Approach:**
- Add `marked@^17.0.4` (match version already in `apps/web/package.json`)
- Add `sanitize-html` at latest stable
- Add `@types/sanitize-html` in `devDependencies`
- Run `pnpm install` from repo root to update lockfile

**Test scenarios:**
- Test expectation: none — pure dependency addition with no behavioral change

**Verification:**
- `pnpm install` completes without error
- `pnpm --filter @kaneo/api build` succeeds (esbuild can resolve the new packages)

---

- [x] **Unit 2: Add `markdownToSafeHtml` helper + `search` tool**

**Goal:** Add the Markdown conversion helper and implement the `search` tool.

**Requirements:** R1

**Dependencies:** Unit 1

**Files:**
- Modify: `apps/api/src/mcp/tools.ts`

**Approach:**
- Add a private `markdownToSafeHtml(md: string): Promise<string>` helper. It `await`s `marked.parse(md)` (returns `Promise<string>` in v17) then passes the result to `sanitizeHtml()`. All callers are already in async functions (passed to `run()`), so `await markdownToSafeHtml(content)` works at every call site. Define a minimal tag allowlist matching what the TipTap editor produces (headings, p, ul, ol, li, strong, em, a, code, pre, blockquote).
- Add `search` tool using `run()` + `client.json()` pattern. Build URLSearchParams from the Zod-validated args, omit undefined fields, call `GET /api/search?${qs}`.
- Zod schema: `q: nonEmptyString`, `type: z.enum(["all","tasks","projects","workspaces","comments","activities"]).optional()`, `workspaceId: optionalNonEmptyString`, `projectId: optionalNonEmptyString`, `limit: z.number().int().min(1).max(50).optional()`. Pass `limit` as `String(args.limit)` in the query string (API expects a numeric string and does its own transform).
- Do NOT include `userEmail` in the schema.

**Patterns to follow:**
- `list_tasks` tool for URLSearchParams construction pattern
- `run()` wrapper for the tool handler

**Test scenarios:**
- Happy path: `search({ q: "authentication" })` returns results with tasks, projects, and/or activities matching the keyword
- Happy path: `search({ q: "auth", type: "tasks", projectId: "<id>" })` returns only task results scoped to the project
- Edge case: `search({ q: "zzz-no-match-xyz" })` returns an object with empty arrays and `totalCount: 0` (not an error)
- Edge case: `limit: 1` returns at most 1 result per type
- Error path: missing `q` fails Zod validation before the API call

**Verification:**
- `search({ q: "<term>" })` returns structured results with `totalCount`, `searchQuery`, and `results` array
- Results include `type` field identifying each result as task, project, workspace, etc.

---

- [x] **Unit 3: Add wiki tools**

**Goal:** Implement the 6 wiki tools: `list_wiki_pages`, `get_wiki_page`, `create_wiki_page`, `update_wiki_page`, `archive_wiki_page`, `delete_wiki_page`.

**Requirements:** R2, R3

**Dependencies:** Unit 2 (for `markdownToSafeHtml`)

**Files:**
- Modify: `apps/api/src/mcp/tools.ts`

**Approach:**

`list_wiki_pages(projectId)` → `GET /api/wiki/project/:projectId`
- Returns array of page summaries (id, title, isLocked, archivedAt — no content fields; the API intentionally excludes them from the list response)

`get_wiki_page(id)` → `GET /api/wiki/:id`
- Returns full page including `contentHtml`; include this field prominently in the tool description so agents know where to read content

`create_wiki_page(projectId, title)` → `POST /api/wiki/` with `{ projectId, title }`
- Note trailing slash in the endpoint

`update_wiki_page(id, title?, content?)` → `PATCH /api/wiki/:id`
- Build body dynamically: include `title` only if provided; always include `contentJson: null`; include `contentHtml: markdownToSafeHtml(content)` only if `content` is provided
- If neither `title` nor `content` is provided, the tool should still call the API with `{ contentJson: null }` to clear any stale TipTap state (this is a safe idempotent write)

`archive_wiki_page(id)` → `POST /api/wiki/:id/archive`

`delete_wiki_page(id)` → two-step with rollback:
1. `POST /api/wiki/:id/archive` — if page is already archived, this is a no-op (returns 200 with current state)
2. `DELETE /api/wiki/:id` — if this fails, immediately call `DELETE /api/wiki/:id/archive` (unarchive) to roll back, then throw the original error
- If both steps succeed, the page is permanently deleted
- If delete fails and rollback succeeds, the page is back in its original non-archived state; agent can retry
- Tool description should state the auto-archive behavior so agents don't call `archive_wiki_page` separately first

**Patterns to follow:**
- `create_task_comment` for simple POST with body
- `update_task` for conditional body construction

**Test scenarios:**
- Happy path: `list_wiki_pages({ projectId })` returns array of pages without contentHtml/contentJson
- Happy path: `get_wiki_page({ id })` returns full page including `contentHtml`
- Happy path: `create_wiki_page({ projectId, title: "Agent Notes" })` creates page and returns it with empty content
- Happy path: `update_wiki_page({ id, content: "# Hello\n\nWorld" })` stores sanitized HTML and clears contentJson; human reopening sees "Hello" heading
- Happy path: `update_wiki_page({ id, title: "New Title" })` updates only the title; still clears contentJson
- Happy path: `archive_wiki_page({ id })` sets archivedAt; page no longer appears in `list_wiki_pages`
- Happy path: `delete_wiki_page({ id })` on a non-archived page archives then deletes successfully
- Happy path: `delete_wiki_page({ id })` on an already-archived page skips duplicate archive and deletes
- Edge case: `update_wiki_page({ id, content: "<script>alert(1)</script>" })` — script tag is stripped from stored HTML (sanitization in effect)
- Edge case: `update_wiki_page({ id, content: "[link](javascript:alert(1))" })` — javascript: href is stripped
- Error path: `get_wiki_page({ id: "nonexistent" })` returns `{ error: "..." }` (isError: true)
- Error path: `update_wiki_page` on a locked page returns a 403 error surfaced by `run()`

**Verification:**
- After `update_wiki_page` with Markdown content, `get_wiki_page` returns `contentHtml` containing rendered HTML and `contentJson` is null
- After `archive_wiki_page`, the page does not appear in `list_wiki_pages` (list excludes archived)
- After `delete_wiki_page`, `get_wiki_page` returns 404/error

---

- [x] **Unit 4: Add milestone tools + `assign_task_milestone`**

**Goal:** Implement 5 milestone tools (`list_milestones`, `get_milestone_tasks`, `create_milestone`, `update_milestone`, `delete_milestone`) and the `assign_task_milestone` tool.

**Requirements:** R4, R5

**Dependencies:** Unit 2 (milestone tools are independent of wiki; can be done in parallel)

**Files:**
- Modify: `apps/api/src/mcp/tools.ts`

**Approach:**

`list_milestones(projectId)` → `GET /api/milestone/project/:projectId`
- Response includes computed `totalTasks` and `completedTasks` counts per milestone

`get_milestone_tasks(milestoneId)` → `GET /api/milestone/:milestoneId/tasks`
- Note: path param is `milestoneId`, not `id`
- Returns task array with status, priority, assignee info

`create_milestone(projectId, title, targetDate)` → `POST /api/milestone/`
- `targetDate`: accept as ISO 8601 string (date or datetime); reuse `isoDateTimeSchema` for consistency or use `z.string().min(1)` — the API calls `new Date(targetDate)` so both work. Use `isoDateTimeSchema` for strictness.

`update_milestone(id, title?, targetDate?)` → `PUT /api/milestone/:id`
- True partial update — only include fields that are defined. No fetch-and-merge needed (unlike `update_task`).

`delete_milestone(id)` → `DELETE /api/milestone/:id`
- Tasks with this milestone get `milestoneId = null` (DB cascade `set null`)

`assign_task_milestone(taskId, milestoneId)` → `PUT /api/task/milestone/:taskId`
- Body: `{ milestoneId: string | null }` — send `null` to unassign
- URL param is **taskId** (not milestoneId); easy to confuse given the route name
- API validates milestone belongs to same project as task; surface validation error clearly
- Zod schema: `taskId: nonEmptyString`, `milestoneId: nonEmptyString.nullable()`

**Patterns to follow:**
- `create_project` for simple POST
- `update_project` for optional-field PUT (though no fetch-and-merge needed here)

**Test scenarios:**
- Happy path: `list_milestones({ projectId })` returns array with `totalTasks` and `completedTasks` counts
- Happy path: `create_milestone({ projectId, title: "v1.0", targetDate: "2026-06-30T00:00:00Z" })` creates and returns milestone
- Happy path: `update_milestone({ id, title: "v1.1" })` updates only title; targetDate unchanged
- Happy path: `update_milestone({ id, targetDate: "2026-07-15T00:00:00Z" })` updates only targetDate
- Happy path: `assign_task_milestone({ taskId, milestoneId })` assigns task; `get_milestone_tasks` then returns that task
- Happy path: `assign_task_milestone({ taskId, milestoneId: null })` unassigns task; task no longer appears in `get_milestone_tasks`
- Happy path: `delete_milestone({ id })` removes milestone; tasks previously assigned to it have `milestoneId: null`
- Edge case: `get_milestone_tasks({ milestoneId })` on a milestone with no tasks returns empty array
- Error path: `assign_task_milestone` with a milestoneId from a different project returns an API 400 error surfaced via `run()`
- Error path: `delete_milestone({ id: "nonexistent" })` returns a clear error

**Verification:**
- After `create_milestone`, it appears in `list_milestones`
- After `assign_task_milestone`, the task appears in `get_milestone_tasks` for that milestone
- After `delete_milestone`, `list_milestones` no longer includes it; `get_task` for previously-assigned tasks shows `milestoneId: null`

## System-Wide Impact

- **Interaction graph:** Only `apps/api/src/mcp/tools.ts` is modified. The new tools call existing API endpoints; no new middleware, observers, or callbacks are triggered beyond what those endpoints already do.
- **Error propagation:** All errors propagate via `run()` + `errorResult()` — same as existing tools. API errors (4xx/5xx) surface as `{ error: "<message>", isError: true }` in the MCP response.
- **State lifecycle risks:** `delete_wiki_page` two-step has a partial-failure window (page stays archived if delete fails). This is recoverable — the agent can retry. No data loss possible.
- **API surface parity:** No new API endpoints are added; existing REST endpoints are the authoritative source. MCP tools are thin wrappers.
- **Integration coverage:** Wiki content roundtrip (write via MCP → read via browser editor) requires the `contentJson: null` write to be correct. This cannot be verified by unit tests alone — a manual smoke test against a running instance is the definitive check.
- **Unchanged invariants:** The 18 existing MCP tools, the OAuth auth flow, and all API routes are unchanged. The `tools.ts` module adds new `server.registerTool` calls; existing calls are untouched.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `marked` + `sanitize-html` add non-trivial bundle size to the API | Check with `pnpm --filter @kaneo/api build` — both are small; `marked` is ~70KB, `sanitize-html` ~100KB. Acceptable. |
| `sanitize-html` allowlist too restrictive (strips valid content) | Start with a permissive allowlist matching TipTap's output: headings, p, strong, em, ul/ol/li, a, code, pre, blockquote, br. Adjust if agents report stripped content. |
| `contentJson: null` write breaks existing wiki pages for human users | It does not affect pages written by humans — those pages have `contentJson` set by the browser, and the MCP only sends `null` when the MCP is writing. After an MCP write, `contentJson` is null and the editor renders from `contentHtml` — which is valid behavior. |
| `delete_wiki_page` rollback could also fail if unarchive call errors | Edge-within-an-edge (DB down scenario). Page stays archived. Agent can inspect via `get_wiki_page` and use browser UI to recover. |
| Route param confusion: `assign_task_milestone` URL uses `taskId` not `milestoneId` | Verified in research: `PUT /api/task/milestone/:id` where `:id` is taskId, body carries `milestoneId`. Both the tool name and variable names must make this clear. |

## Documentation / Operational Notes

- No new environment variables or deployment changes required
- The MCP server (`GET /api/mcp`) does not need to be restarted separately — it is part of the same Hono process as the API

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-19-mcp-gap-fill-requirements.md](docs/brainstorms/2026-04-19-mcp-gap-fill-requirements.md)
- Related code: `apps/api/src/mcp/tools.ts`, `apps/api/src/wiki/index.ts`, `apps/api/src/milestone/index.ts`, `apps/api/src/task/index.ts`
- Related plan: `docs/plans/2026-04-19-004-feat-wiki-notion-editor-plan.md` (TipTap contentJson behavior)
