# MCP Gap-Fill: Search, Wiki, Milestones

**Status:** Draft  
**Date:** 2026-04-19  
**Primary use case:** AI agent automation — agents drive CSP Flow without human UI interaction

---

## Context

The MCP server at `apps/api/src/mcp/` is already operational with:
- OAuth 2.0 + PKCE + device flow authentication
- 18 tools covering workspaces, projects, tasks (CRUD + status + move), comments, and labels

This spec adds **13 new tools** across four capability groups: search, wiki, milestones, and milestone-task assignment.

---

## Goals

- Agents can discover content by keyword without needing to know IDs in advance
- Agents can read and write wiki documentation for a project
- Agents can create, track, update, and delete project milestones; query and assign tasks to them

---

## Non-Goals (this iteration)

- Task relations (blocking/blocked by)
- Time entries
- Workspace member management / invitations
- Integration management (GitHub, Gitea, Discord, Slack, Telegram, webhooks)
- Activity feed / notification management
- Column/workflow status management

---

## Tools to Add

All tools follow the existing pattern in `apps/api/src/mcp/tools.ts`: Zod input schemas, `run()` wrapper, `ApiClient` for HTTP.

### Search (1 tool)

| Tool | Description | Endpoint |
|------|-------------|----------|
| `search` | Full-text search across tasks, projects, workspaces, comments, and activities | `GET /api/search` |

**`search` inputs:**
- `q` (required) — search query string
- `type` — `"all" | "tasks" | "projects" | "workspaces" | "comments" | "activities"` (default: `"all"`)
- `workspaceId` (optional) — scope results to a workspace
- `projectId` (optional) — scope results to a project
- `limit` (optional, 1–50, default 20)

Note: do not expose `userEmail` — the MCP layer authenticates via Bearer token, so the API always resolves `userId` from the session directly.

---

### Wiki (6 tools)

| Tool | Description | Endpoint |
|------|-------------|----------|
| `list_wiki_pages` | List all wiki pages for a project | `GET /api/wiki/project/:projectId` |
| `get_wiki_page` | Get a single wiki page by ID | `GET /api/wiki/:id` |
| `create_wiki_page` | Create a new wiki page | `POST /api/wiki/` |
| `update_wiki_page` | Update title and/or content | `PATCH /api/wiki/:id` |
| `archive_wiki_page` | Archive a wiki page | `POST /api/wiki/:id/archive` |
| `delete_wiki_page` | Delete a wiki page (must be archived first — see behavior note) | `DELETE /api/wiki/:id` |

**`create_wiki_page` inputs:** `projectId`, `title`

**`update_wiki_page` inputs:** `id`, `title` (optional), `content` (optional Markdown string)

**`delete_wiki_page` behavior:** The API enforces that a page must be archived before deletion. The MCP tool handles this automatically — it calls `POST /api/wiki/:id/archive` then `DELETE /api/wiki/:id` in sequence. If archive succeeds but delete fails (e.g., network error), the page is left archived. The agent can safely retry `delete_wiki_page` — the delete endpoint is idempotent-safe on an already-archived page.

**Out of scope:** `lock_wiki_page` / `unlock_wiki_page` — locking reduces agents' own future write capability and is a human governance operation with no agent-automation use case. `unarchive_wiki_page` — no concrete agent workflow requires restoring an archived page; omit to keep the tool surface minimal.

#### Wiki Content Format

The API accepts `contentHtml` (HTML string) and `contentJson` (TipTap ProseMirror JSON). Approach for MCP:

- **Accept `content` as a Markdown string** in the `update_wiki_page` tool.
- **Convert to HTML** in `tools.ts` using `marked` (add to `apps/api/package.json` — `marked` is already in `apps/web` but packages are separate).
- **Sanitize the HTML** using `sanitize-html` or `isomorphic-dompurify` before sending to the API. `marked` alone does not sanitize and would allow XSS payloads in agent-generated Markdown to be stored.
- **Pass `contentJson: null`** alongside `contentHtml` on every wiki update. The browser's TipTap editor loads from `contentJson` preferentially; if it is not cleared, human editors will see stale content after any MCP write.
- On read (`get_wiki_page`), return `contentHtml` as-is — agents can treat it as readable text.

---

### Milestones (5 tools)

| Tool | Description | Endpoint |
|------|-------------|----------|
| `list_milestones` | List milestones for a project | `GET /api/milestone/project/:projectId` |
| `get_milestone_tasks` | List tasks assigned to a milestone | `GET /api/milestone/:milestoneId/tasks` |
| `create_milestone` | Create a new milestone | `POST /api/milestone/` |
| `update_milestone` | Update milestone title or target date | `PUT /api/milestone/:id` |
| `delete_milestone` | Delete a milestone | `DELETE /api/milestone/:id` |

**`create_milestone` inputs:** `projectId`, `title`, `targetDate` (ISO 8601 date string)

**`update_milestone` inputs:** `id`, `title` (optional), `targetDate` (optional ISO 8601)

---

### Milestone–Task Assignment (1 tool)

| Tool | Description | Endpoint |
|------|-------------|----------|
| `assign_task_milestone` | Assign or unassign a task to a milestone | `PUT /api/task/milestone/:id` |

**`assign_task_milestone` inputs:** `taskId`, `milestoneId` (nullable — pass `null` to unassign)

The endpoint at `apps/api/src/task/index.ts` validates that the milestone belongs to the same project as the task. The MCP tool should surface the validation error clearly if the milestone is in a different project.

---

## Implementation Scope

Only `apps/api/src/mcp/tools.ts` is modified. No new routes, schema changes, or migrations required.

**New dependencies in `apps/api/package.json`:**
- `marked` — Markdown-to-HTML conversion
- `sanitize-html` (or `isomorphic-dompurify`) — HTML sanitization before storage

---

## Success Criteria

- An agent can search "authentication tasks" and get relevant task/project results back without knowing any IDs
- An agent can create a wiki page, write Markdown content to it, and retrieve it; a human reopening the page in the browser sees the agent's content (not stale editor state)
- An agent can list a project's milestones, create a new milestone with a target date, and query which tasks fall under it
- An agent can assign a task to a milestone and verify the assignment via `get_milestone_tasks`
- No regressions in the 18 existing MCP tools
