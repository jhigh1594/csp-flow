# Requirements: Team-Centric Data Model

**Date**: 2026-04-20
**Status**: Draft
**Type**: Strategic refactor — data model + UI

---

## Problem

CSP Flow's current hierarchy is workspace → project → task. Teams exist in the schema but are orphaned — they have no relationship to projects or tasks. This makes it impossible to show all work a team owns in one place, filter by team, or structure navigation around team identity.

The goal is to make **team** the atomic unit of ownership, mirroring Linear's data model.

---

## Goals

- Teams own issues (tasks) directly — a task can exist at the team level without belonging to a project
- Teams also own projects — projects are scoped to a team, not just a workspace
- Sidebar navigation is team-first: each team expands into Issues, Projects, Members
- Each team owns its own workflow statuses (columns) — shared across that team's issues and projects
- Issue identifiers are team-scoped (e.g., `ENG-123`)

## Non-Goals

- Cross-team projects (projects that span multiple teams)
- Per-project workflow overrides
- Migrating existing data (all current data is test data and will be dropped)
- "My Issues" cross-team view (out of scope for this phase)
- Team-level roles/permissions (teams inherit workspace roles for now)

---

## Data Model Changes

### Modified Tables

**`project`** — add `team_id`
- `teamId`: `text`, required, FK → `team.id` (cascade delete)
- Remove workspace-only ownership; projects now belong to a team (which belongs to a workspace)

**`column`** (workflow statuses) — change owner from project to team
- Replace `projectId` with `teamId`: `text`, required, FK → `team.id` (cascade delete)
- Columns are shared across all issues and projects within a team

**`task`** — add team ownership, make project optional
- `teamId`: `text`, required, FK → `team.id` (cascade delete)
- `projectId`: change from required → nullable (tasks without a project are team-level issues)
- Issue number unique constraint changes from `(projectId, number)` → `(teamId, number)`

### Unchanged Tables

- `team`, `teamMember` — already correct; no changes needed
- `workspace`, `workspaceMember` — unchanged
- `milestone`, `wikiPage` — stay scoped to projects (unchanged)
- `activity`, `comment`, `label`, `asset` — stay scoped to tasks (unchanged)
- `integration`, `githubIntegration` — stay scoped to projects (unchanged)

### Schema Relationship After Change

```
Workspace
└── Team
      ├── Columns (workflow statuses) — e.g., Todo, In Progress, Done
      ├── Issues (tasks with nullable projectId)
      │     └── teamId = required | projectId = optional
      ├── Project
      │     └── Issues (tasks with this projectId)
      └── Members
```

---

## URL Structure

### New Routes

| View | URL |
|------|-----|
| Team issues (board/list) | `/dashboard/workspace/:workspaceId/team/:teamId/issues` |
| Team projects list | `/dashboard/workspace/:workspaceId/team/:teamId/projects` |
| Team members | `/dashboard/workspace/:workspaceId/team/:teamId/members` |
| Project board (under team) | `/dashboard/workspace/:workspaceId/team/:teamId/project/:projectId/board` |
| Project gantt | `/dashboard/workspace/:workspaceId/team/:teamId/project/:projectId/gantt` |
| Project backlog | `/dashboard/workspace/:workspaceId/team/:teamId/project/:projectId/backlog` |
| Task detail | `/dashboard/workspace/:workspaceId/team/:teamId/project/:projectId/task/:taskId` |

### Removed Routes

- All existing `/project/:projectId/*` routes under workspace are replaced by team-nested routes above

---

## Sidebar Navigation

Replace `NavProjects` component with `NavTeams` component.

```
SIDEBAR
├─ [WorkspaceSwitcher]
├─ Search
├─ [NavMain — existing global items]
└─ Teams
     ├─ Engineering ▾
     │    ├─ Issues          → /team/:teamId/issues
     │    ├─ Projects        → /team/:teamId/projects
     │    │    ├─ Q2 Sprint
     │    │    └─ Platform Infra
     │    └─ Members         → /team/:teamId/members
     └─ Design ▾
          ├─ Issues
          └─ Projects
```

- Teams are collapsible (default expanded for active team)
- "Create Team" action in the sidebar footer or inline
- Projects nested under their parent team; create project action scoped to team context

---

## New Views Required

### Team Issues View (`/team/:teamId/issues`)

- Shows all tasks where `teamId = :teamId` (regardless of project)
- Supports board and list views using team-scoped columns
- "No Project" group for tasks where `projectId` is null
- Grouped-by-project option to see cross-project breakdown
- Create issue button defaults to this team, no project

### Team Projects View (`/team/:teamId/projects`)

- List of all projects where `teamId = :teamId`
- Create project action — project is automatically scoped to this team
- Each project links to its board/gantt/backlog

---

## API Changes

### New/Modified Endpoints

| Method | Path | Change |
|--------|------|--------|
| `GET` | `/teams/:teamId/issues` | New — fetch all tasks for a team |
| `POST` | `/teams/:teamId/issues` | New — create team-level task (no project) |
| `GET` | `/teams/:teamId/columns` | New — fetch team's workflow statuses |
| `POST` | `/teams/:teamId/columns` | New — create column scoped to team |
| `GET` | `/teams/:teamId/projects` | New — fetch projects for a team |
| `POST` | `/teams/:teamId/projects` | New (replaces workspace-scoped create) |
| `POST` | `/projects/:projectId/tasks` | Modified — include `teamId` from project |
| `GET` | `/workspaces/:workspaceId/projects` | Modified — now returns `teamId` per project |

### Removed Endpoints

- `GET /workspaces/:workspaceId/columns` — replaced by team-scoped columns

---

## Migration Plan

- Drop and recreate the database (test data only — no migration needed)
- Apply clean schema with new foreign keys and constraints
- Default team created via Better Auth's `organization.createTeam()` API (not a raw DB insert — Better Auth manages `team.id` generation)
- Hook default team creation into the `afterCreateOrganization` callback in `apps/api/src/auth.ts`

---

## Implementation Notes (Pre-Resolved Blockers)

These decisions are resolved here to prevent ambiguity during planning:

**1. Team ID generation**
`teamTable.id` has no `$defaultFn` — Better Auth's organization plugin manages team IDs. All team creation (including the default team) must go through `organization.createTeam()`, not raw `db.insert`. Do not add `$defaultFn(() => createId())` to `teamTable`.

**2. `workspaceAccess` middleware — projectless tasks**
`workspace-access-middleware.ts` resolves workspace for tasks by joining `task → project`. For team-level tasks (`projectId` is null), this join must fall back to joining `task → team → workspace`. Add a nullable-`projectId` branch to the `"task"` case: `JOIN team ON task.teamId = team.id WHERE team.workspaceId = ?`.

**3. Column call sites to update**
`columnTable.projectId` is referenced in 4+ places that must switch to `teamId`:
- `workspace-access-middleware.ts` — case `"column"`: change join from `column → project` to `column → team → workspace`
- `move-task.ts` — `resolveDestinationStatus`: query by `column.teamId` not `column.projectId`
- `validate-task-fields.ts` — `getValidTaskStatuses` and `assertValidTaskStatus`: query by `teamId`
- `create-column.ts` — duplicate-slug check: scope by `teamId` instead of `projectId`
- DB unique constraint: change from `(projectId, slug)` to `(teamId, slug)`

**4. `workflowRuleTable`**
Workflow rules reference both `projectId` and `columnId`. After columns move to teams, `projectId` on a workflow rule has no relationship to the rule's column. **Decision**: workflow rules stay on projects for now but reference team columns. The `columnId` FK is sufficient to enforce team alignment (a project's team must match its workflow rule's column's team — enforced at creation time in the controller). The `WorkflowEditor` UI (`settings/projects/$projectId/workflow.tsx`) must be updated to fetch columns by `teamId` (derived from the project's `teamId`) rather than by `projectId`.

**5. `assetTable.projectId` NOT NULL**
Team-level task assets (no project) are **out of scope for this phase**. Image upload on team-level tasks (no project) is not supported until `assetTable.projectId` is made nullable in a future change. The upload endpoint should return a clear 400 error if `task.projectId` is null.

**6. Issue numbering**
`getNextTaskNumber` in `apps/api/src/task/controllers/get-next-task-number.ts` must query `MAX(task.number) WHERE teamId = ?` (not `projectId`). The DB unique constraint changes from `(projectId, number)` to `(teamId, number)`.

**7. TanStack Router — old route removal**
Old project routes at `.../workspace/$workspaceId/project/$projectId/*` are deleted (not redirected). Since this is a clean-slate build with no existing users, bookmarks are not a concern. If redirects are added later, use a loader-based redirect in the old route files.

---

## Acceptance Criteria

- [ ] Creating a workspace automatically creates a default team (via Better Auth `organization.createTeam()`)
- [ ] All new projects require a team; project creation UI scopes to a team
- [ ] All new tasks require a team; tasks created in a project inherit the project's team
- [ ] Tasks can be created without a project (team-level issues)
- [ ] Sidebar lists teams, each expandable to Issues / Projects / Members
- [ ] Team issues view shows all tasks for a team, groupable by project
- [ ] Team-scoped columns are used on both team issues view and project board
- [ ] Issue numbers are team-scoped (`ENG-1`, `ENG-2`, not restarting per project)
- [ ] Navigating to a project board works under `/team/:teamId/project/:projectId/board`
- [ ] Old workspace-project routes are removed
- [ ] `workspaceAccess` middleware handles tasks with null `projectId` via team lookup
- [ ] Column workspace resolution in middleware uses `team → workspace` join
- [ ] Image upload on team-level tasks (no project) returns a clear 400 error

---

## Open Questions

1. **Issue identifiers**: Use a team `identifier` prefix (e.g., `ENG-123`) or just sequential numbers per team? (Requires adding an `identifier` field to `teamTable` if prefix is desired.)
2. **Project-less task display**: On the project board, should team-level issues (no project) appear in a special "Unassigned" group, or only in the team issues view?
