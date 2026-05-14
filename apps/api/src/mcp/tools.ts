import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { z } from "zod";
import { registerContextTools } from "./context-tools";

export class ApiClient {
  constructor(
    private baseUrl: string,
    private token: string,
  ) {}

  async json<T = unknown>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set("Authorization", `Bearer ${this.token}`);
    if (init?.body != null && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
    const res = await fetch(url, {
      ...init,
      headers,
      signal: AbortSignal.timeout(10_000),
    });

    const text = await res.text();
    let body: unknown = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }
    if (!res.ok) {
      const detail =
        typeof body === "object" && body !== null && "message" in body
          ? (body as { message: string }).message
          : typeof body === "string" && body.length > 0
            ? body.slice(0, 500)
            : `HTTP ${res.status}`;
      throw new Error(`${path}: ${detail}`);
    }
    return body as T;
  }
}

export function textResult(data: unknown, isError = false): CallToolResult {
  const text =
    typeof data === "string" ? data : (JSON.stringify(data, null, 2) ?? "");
  return { content: [{ type: "text", text }], isError };
}

export function errorResult(message: string): CallToolResult {
  return textResult({ error: message }, true);
}

export function run(fn: () => Promise<unknown>): Promise<CallToolResult> {
  return fn()
    .then((data) => textResult(data))
    .catch((e: unknown) =>
      errorResult(e instanceof Error ? e.message : String(e)),
    );
}

const WIKI_ALLOWED_TAGS = [
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "p",
  "br",
  "hr",
  "strong",
  "em",
  "s",
  "code",
  "pre",
  "ul",
  "ol",
  "li",
  "blockquote",
  "a",
  "img",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
];

async function markdownToSafeHtml(md: string): Promise<string> {
  const html = await marked.parse(md);
  return sanitizeHtml(html, {
    allowedTags: WIKI_ALLOWED_TAGS,
    allowedAttributes: {
      a: ["href", "title", "target"],
      img: ["src", "alt", "title"],
      code: ["class"],
      pre: ["class"],
      th: ["align"],
      td: ["align"],
    },
    allowedSchemes: ["http", "https", "mailto"],
  });
}

const PRIORITIES = ["no-priority", "low", "medium", "high", "urgent"] as const;

function isTaskPriority(v: string): v is (typeof PRIORITIES)[number] {
  return (PRIORITIES as readonly string[]).includes(v);
}

function formatOptionalIso(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return undefined;
}

function buildFullTaskUpdateBody(
  existing: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, string | number | undefined> {
  const positionRaw = patch.position ?? existing.position;
  const position =
    typeof positionRaw === "number"
      ? positionRaw
      : typeof positionRaw === "string"
        ? Number(positionRaw)
        : Number.NaN;
  if (!Number.isFinite(position))
    throw new Error(
      "Cannot update task: missing numeric `position` on existing task.",
    );

  const title =
    (patch.title as string) ??
    (typeof existing.title === "string" ? existing.title : undefined);
  if (!title) throw new Error("Cannot update task: missing title.");

  const description =
    patch.description !== undefined
      ? patch.description === null
        ? ""
        : String(patch.description)
      : existing.description == null
        ? ""
        : String(existing.description);

  const status =
    (patch.status as string) ??
    (typeof existing.status === "string" ? existing.status : undefined);
  if (!status) throw new Error("Cannot update task: missing status.");

  const priorityRaw =
    (patch.priority as string) ??
    (typeof existing.priority === "string" ? existing.priority : undefined);
  if (!priorityRaw || !isTaskPriority(priorityRaw))
    throw new Error("Cannot update task: invalid or missing priority.");

  const projectId =
    (patch.projectId as string) ??
    (typeof existing.projectId === "string" ? existing.projectId : undefined);
  if (!projectId) throw new Error("Cannot update task: missing projectId.");

  const userId =
    patch.userId !== undefined
      ? patch.userId === null
        ? ""
        : (patch.userId as string)
      : typeof existing.userId === "string"
        ? existing.userId
        : undefined;

  const startDate = formatOptionalIso(
    patch.startDate !== undefined ? patch.startDate : existing.startDate,
  );
  const dueDate = formatOptionalIso(
    patch.dueDate !== undefined ? patch.dueDate : existing.dueDate,
  );

  const body: Record<string, string | number | undefined> = {
    title,
    description,
    status,
    priority: priorityRaw,
    projectId,
    position,
  };
  if (startDate !== undefined) body.startDate = startDate;
  if (dueDate !== undefined) body.dueDate = dueDate;
  if (userId !== undefined) body.userId = userId;
  return body;
}

const prioritySchema = z.enum([
  "no-priority",
  "low",
  "medium",
  "high",
  "urgent",
]);
const nonEmptyString = z.string().trim().min(1);
const optionalNonEmptyString = nonEmptyString.optional();
const nullableOptionalNonEmptyString = nonEmptyString.nullable().optional();
const isoDateTimeSchema = z.string().datetime({ offset: true });
const optionalIsoDateTimeSchema = isoDateTimeSchema.optional();
const nullableOptionalIsoDateTimeSchema = isoDateTimeSchema
  .nullable()
  .optional();
const hexColorSchema = z
  .string()
  .regex(
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
    "Expected a hex color like #FF6600",
  );

export function registerMcpTools(
  server: McpServer,
  baseUrl: string,
  token: string,
): void {
  const client = new ApiClient(baseUrl, token);

  server.registerTool(
    "whoami",
    {
      description: "Return the current Kaneo session and user.",
      inputSchema: z.object({}),
    },
    async () =>
      run(() => client.json("/api/auth/get-session", { method: "GET" })),
  );

  server.registerTool(
    "list_workspaces",
    {
      description: "List workspaces the signed-in user can access.",
      inputSchema: z.object({}),
    },
    async () =>
      run(() => client.json("/api/auth/organization/list", { method: "GET" })),
  );

  server.registerTool(
    "list_projects",
    {
      description: "List projects in a workspace.",
      inputSchema: z.object({
        workspaceId: nonEmptyString.describe("Workspace ID"),
        includeArchived: z
          .boolean()
          .optional()
          .describe("Include archived projects"),
      }),
    },
    async (args) => {
      const qs = new URLSearchParams({ workspaceId: args.workspaceId });
      if (args.includeArchived === true) qs.set("includeArchived", "true");
      return run(() =>
        client.json(`/api/project?${qs.toString()}`, { method: "GET" }),
      );
    },
  );

  server.registerTool(
    "get_project",
    {
      description: "Get a single project by ID.",
      inputSchema: z.object({ id: nonEmptyString }),
    },
    async (args) =>
      run(() => client.json(`/api/project/${encodeURIComponent(args.id)}`)),
  );

  server.registerTool(
    "create_project",
    {
      description: "Create a project in a workspace.",
      inputSchema: z.object({
        name: nonEmptyString,
        workspaceId: nonEmptyString,
        icon: nonEmptyString,
        slug: nonEmptyString,
      }),
    },
    async (args) =>
      run(() =>
        client.json("/api/project", {
          method: "POST",
          body: JSON.stringify({
            name: args.name,
            workspaceId: args.workspaceId,
            icon: args.icon,
            slug: args.slug,
          }),
        }),
      ),
  );

  server.registerTool(
    "update_project",
    {
      description:
        "Update project metadata (PATCH-style: only provided fields are changed).",
      inputSchema: z.object({
        id: nonEmptyString,
        name: optionalNonEmptyString,
        icon: z.string().optional(),
        slug: optionalNonEmptyString,
        description: z.string().optional(),
        isPublic: z.boolean().optional(),
      }),
    },
    async (args) => {
      const { id, ...patch } = args;
      return run(async () => {
        const existing = (await client.json(
          `/api/project/${encodeURIComponent(id)}`,
          { method: "GET" },
        )) as Record<string, unknown>;
        const name =
          patch.name ??
          (typeof existing.name === "string" ? existing.name : "");
        if (!name) throw new Error("Cannot update project: missing name.");
        const icon =
          patch.icon !== undefined
            ? patch.icon
            : typeof existing.icon === "string"
              ? existing.icon
              : "Layout";
        const slug =
          patch.slug ??
          (typeof existing.slug === "string" ? existing.slug : "");
        if (!slug) throw new Error("Cannot update project: missing slug.");
        const description =
          patch.description !== undefined
            ? patch.description
            : typeof existing.description === "string"
              ? existing.description
              : "";
        const isPublic =
          patch.isPublic !== undefined
            ? patch.isPublic
            : typeof existing.isPublic === "boolean"
              ? existing.isPublic
              : false;
        return client.json(`/api/project/${encodeURIComponent(id)}`, {
          method: "PUT",
          body: JSON.stringify({ name, icon, slug, description, isPublic }),
        });
      });
    },
  );

  server.registerTool(
    "list_tasks",
    {
      description: "List tasks for a project (optionally filtered/sorted).",
      inputSchema: z.object({
        projectId: nonEmptyString,
        status: optionalNonEmptyString,
        priority: prioritySchema.optional(),
        assigneeId: optionalNonEmptyString,
        page: z.number().int().positive().optional(),
        limit: z.number().int().positive().optional(),
        sortBy: z
          .enum([
            "createdAt",
            "priority",
            "dueDate",
            "position",
            "title",
            "number",
          ])
          .optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
        dueBefore: optionalIsoDateTimeSchema,
        dueAfter: optionalIsoDateTimeSchema,
      }),
    },
    async (args) => {
      const { projectId, ...rest } = args;
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(rest)) {
        if (v !== undefined && v !== null) qs.set(k, String(v));
      }
      const q = qs.toString();
      return run(() =>
        client.json(
          `/api/task/tasks/${encodeURIComponent(projectId)}${q ? `?${q}` : ""}`,
          { method: "GET" },
        ),
      );
    },
  );

  server.registerTool(
    "get_task",
    {
      description: "Get a task by ID.",
      inputSchema: z.object({ taskId: nonEmptyString }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/task/${encodeURIComponent(args.taskId)}`, {
          method: "GET",
        }),
      ),
  );

  server.registerTool(
    "create_task",
    {
      description: "Create a task in a project.",
      inputSchema: z.object({
        projectId: nonEmptyString,
        title: nonEmptyString,
        description: z.string(),
        priority: prioritySchema,
        status: nonEmptyString,
        startDate: optionalIsoDateTimeSchema,
        dueDate: optionalIsoDateTimeSchema,
        userId: optionalNonEmptyString,
      }),
    },
    async (args) => {
      const body: Record<string, string | undefined> = {
        title: args.title,
        description: args.description,
        priority: args.priority,
        status: args.status,
      };
      if (args.startDate !== undefined) body.startDate = args.startDate;
      if (args.dueDate !== undefined) body.dueDate = args.dueDate;
      if (args.userId !== undefined) body.userId = args.userId;
      return run(() =>
        client.json(`/api/task/${encodeURIComponent(args.projectId)}`, {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
    },
  );

  server.registerTool(
    "update_task",
    {
      description:
        "Update a task (fetches current task, merges fields, then full update).",
      inputSchema: z.object({
        taskId: nonEmptyString,
        title: optionalNonEmptyString,
        description: z.string().nullable().optional(),
        status: optionalNonEmptyString,
        priority: prioritySchema.optional(),
        projectId: optionalNonEmptyString,
        position: z.number().optional(),
        startDate: nullableOptionalIsoDateTimeSchema,
        dueDate: nullableOptionalIsoDateTimeSchema,
        userId: nullableOptionalNonEmptyString,
      }),
    },
    async (args) => {
      const { taskId, ...patch } = args;
      return run(async () => {
        const existing = (await client.json(
          `/api/task/${encodeURIComponent(taskId)}`,
          { method: "GET" },
        )) as Record<string, unknown>;
        const body = buildFullTaskUpdateBody(existing, patch);
        return client.json(`/api/task/${encodeURIComponent(taskId)}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
      });
    },
  );

  server.registerTool(
    "move_task",
    {
      description:
        "Move a task to another project (and optional column status).",
      inputSchema: z.object({
        taskId: nonEmptyString,
        destinationProjectId: nonEmptyString,
        destinationStatus: optionalNonEmptyString,
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/task/move/${encodeURIComponent(args.taskId)}`, {
          method: "PUT",
          body: JSON.stringify({
            destinationProjectId: args.destinationProjectId,
            ...(args.destinationStatus !== undefined
              ? { destinationStatus: args.destinationStatus }
              : {}),
          }),
        }),
      ),
  );

  server.registerTool(
    "update_task_status",
    {
      description: "Update only the status (column) of a task.",
      inputSchema: z.object({ taskId: nonEmptyString, status: nonEmptyString }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/task/status/${encodeURIComponent(args.taskId)}`, {
          method: "PUT",
          body: JSON.stringify({ status: args.status }),
        }),
      ),
  );

  server.registerTool(
    "list_task_comments",
    {
      description: "List comments on a task.",
      inputSchema: z.object({ taskId: nonEmptyString }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/comment/${encodeURIComponent(args.taskId)}`, {
          method: "GET",
        }),
      ),
  );

  server.registerTool(
    "create_task_comment",
    {
      description: "Add a comment to a task.",
      inputSchema: z.object({
        taskId: nonEmptyString,
        content: nonEmptyString,
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/comment/${encodeURIComponent(args.taskId)}`, {
          method: "POST",
          body: JSON.stringify({ content: args.content }),
        }),
      ),
  );

  server.registerTool(
    "list_workspace_labels",
    {
      description: "List labels defined in a workspace.",
      inputSchema: z.object({ workspaceId: nonEmptyString }),
    },
    async (args) =>
      run(() =>
        client.json(
          `/api/label/workspace/${encodeURIComponent(args.workspaceId)}`,
          { method: "GET" },
        ),
      ),
  );

  server.registerTool(
    "create_label",
    {
      description:
        "Create a label in a workspace (optionally attach to a task).",
      inputSchema: z.object({
        name: nonEmptyString,
        color: hexColorSchema,
        workspaceId: nonEmptyString,
        taskId: optionalNonEmptyString,
      }),
    },
    async (args) =>
      run(() =>
        client.json("/api/label", {
          method: "POST",
          body: JSON.stringify({
            name: args.name,
            color: args.color,
            workspaceId: args.workspaceId,
            ...(args.taskId !== undefined ? { taskId: args.taskId } : {}),
          }),
        }),
      ),
  );

  server.registerTool(
    "attach_label_to_task",
    {
      description: "Attach an existing label to a task.",
      inputSchema: z.object({
        labelId: nonEmptyString,
        taskId: nonEmptyString,
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/label/${encodeURIComponent(args.labelId)}/task`, {
          method: "PUT",
          body: JSON.stringify({ taskId: args.taskId }),
        }),
      ),
  );

  server.registerTool(
    "detach_label_from_task",
    {
      description: "Detach a label from its current task.",
      inputSchema: z.object({ labelId: nonEmptyString }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/label/${encodeURIComponent(args.labelId)}/task`, {
          method: "DELETE",
        }),
      ),
  );

  // ── Search ──────────────────────────────────────────────────────────────────

  server.registerTool(
    "search",
    {
      description:
        "Search across tasks, projects, workspaces, comments, and activities. Returns results with relevance scores. Use this to discover content by keyword before operating on it.",
      inputSchema: z.object({
        q: nonEmptyString.describe("Search query"),
        type: z
          .enum([
            "all",
            "tasks",
            "projects",
            "workspaces",
            "comments",
            "activities",
          ])
          .optional()
          .describe("Limit results to one entity type (default: all)"),
        workspaceId: optionalNonEmptyString.describe("Scope to a workspace"),
        projectId: optionalNonEmptyString.describe("Scope to a project"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(50)
          .optional()
          .describe("Max results (1–50, default 20)"),
      }),
    },
    async (args) => {
      const qs = new URLSearchParams({ q: args.q });
      if (args.type !== undefined) qs.set("type", args.type);
      if (args.workspaceId !== undefined)
        qs.set("workspaceId", args.workspaceId);
      if (args.projectId !== undefined) qs.set("projectId", args.projectId);
      if (args.limit !== undefined) qs.set("limit", String(args.limit));
      return run(() =>
        client.json(`/api/search?${qs.toString()}`, { method: "GET" }),
      );
    },
  );

  // ── Wiki ────────────────────────────────────────────────────────────────────

  server.registerTool(
    "list_wiki_pages",
    {
      description:
        "List all wiki pages for a project. Returns summaries (id, title, isLocked, archivedAt) — use get_wiki_page to read full content.",
      inputSchema: z.object({
        projectId: nonEmptyString.describe("Project ID"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/wiki/project/${encodeURIComponent(args.projectId)}`, {
          method: "GET",
        }),
      ),
  );

  server.registerTool(
    "get_wiki_page",
    {
      description:
        "Get a single wiki page by ID, including its full HTML content in the contentHtml field.",
      inputSchema: z.object({
        id: nonEmptyString.describe("Wiki page ID"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/wiki/${encodeURIComponent(args.id)}`, {
          method: "GET",
        }),
      ),
  );

  server.registerTool(
    "create_wiki_page",
    {
      description:
        "Create a new wiki page in a project. Content can be added afterward with update_wiki_page.",
      inputSchema: z.object({
        projectId: nonEmptyString.describe("Project ID"),
        title: nonEmptyString.describe("Page title"),
      }),
    },
    async (args) =>
      run(() =>
        client.json("/api/wiki/", {
          method: "POST",
          body: JSON.stringify({
            projectId: args.projectId,
            title: args.title,
          }),
        }),
      ),
  );

  server.registerTool(
    "update_wiki_page",
    {
      description:
        "Update a wiki page's title and/or content. Provide content as Markdown — it will be converted to HTML automatically. At least one of title or content should be provided.",
      inputSchema: z.object({
        id: nonEmptyString.describe("Wiki page ID"),
        title: optionalNonEmptyString.describe("New title"),
        content: z
          .string()
          .optional()
          .describe("New content in Markdown format"),
      }),
    },
    async (args) => {
      const body: Record<string, unknown> = { contentJson: null };
      if (args.title !== undefined) body.title = args.title;
      if (args.content !== undefined) {
        body.contentHtml = await markdownToSafeHtml(args.content);
      }
      return run(() =>
        client.json(`/api/wiki/${encodeURIComponent(args.id)}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      );
    },
  );

  server.registerTool(
    "archive_wiki_page",
    {
      description:
        "Archive a wiki page so it no longer appears in page listings.",
      inputSchema: z.object({
        id: nonEmptyString.describe("Wiki page ID"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/wiki/${encodeURIComponent(args.id)}/archive`, {
          method: "POST",
        }),
      ),
  );

  server.registerTool(
    "delete_wiki_page",
    {
      description:
        "Permanently delete a wiki page. This tool automatically archives the page first (as required by the API), then deletes it. If the delete step fails, the archive is rolled back.",
      inputSchema: z.object({
        id: nonEmptyString.describe("Wiki page ID"),
      }),
    },
    async (args) => {
      const id = encodeURIComponent(args.id);
      return run(async () => {
        await client.json(`/api/wiki/${id}/archive`, { method: "POST" });
        try {
          return await client.json(`/api/wiki/${id}`, { method: "DELETE" });
        } catch (deleteErr) {
          // Roll back: unarchive so the page is back in its original state
          try {
            await client.json(`/api/wiki/${id}/archive`, { method: "DELETE" });
          } catch {
            // Rollback failed — page stays archived; surface original error
          }
          throw deleteErr;
        }
      });
    },
  );

  // ── Milestones ──────────────────────────────────────────────────────────────

  server.registerTool(
    "list_milestones",
    {
      description:
        "List all milestones for a project, ordered by target date. Each milestone includes totalTasks and completedTasks counts.",
      inputSchema: z.object({
        projectId: nonEmptyString.describe("Project ID"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(
          `/api/milestone/project/${encodeURIComponent(args.projectId)}`,
          {
            method: "GET",
          },
        ),
      ),
  );

  server.registerTool(
    "get_milestone_tasks",
    {
      description: "List all tasks assigned to a milestone.",
      inputSchema: z.object({
        milestoneId: nonEmptyString.describe("Milestone ID"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(
          `/api/milestone/${encodeURIComponent(args.milestoneId)}/tasks`,
          { method: "GET" },
        ),
      ),
  );

  server.registerTool(
    "create_milestone",
    {
      description: "Create a new milestone for a project.",
      inputSchema: z.object({
        projectId: nonEmptyString.describe("Project ID"),
        title: nonEmptyString.describe("Milestone title"),
        targetDate: isoDateTimeSchema.describe(
          "Target date (ISO 8601, e.g. 2026-06-30T00:00:00Z)",
        ),
      }),
    },
    async (args) =>
      run(() =>
        client.json("/api/milestone/", {
          method: "POST",
          body: JSON.stringify({
            projectId: args.projectId,
            title: args.title,
            targetDate: args.targetDate,
          }),
        }),
      ),
  );

  server.registerTool(
    "update_milestone",
    {
      description:
        "Update a milestone's title and/or target date. Only provided fields are changed.",
      inputSchema: z.object({
        id: nonEmptyString.describe("Milestone ID"),
        title: optionalNonEmptyString.describe("New title"),
        targetDate: optionalIsoDateTimeSchema.describe(
          "New target date (ISO 8601)",
        ),
      }),
    },
    async (args) => {
      const { id, ...patch } = args;
      const body: Record<string, string> = {};
      if (patch.title !== undefined) body.title = patch.title;
      if (patch.targetDate !== undefined) body.targetDate = patch.targetDate;
      return run(() =>
        client.json(`/api/milestone/${encodeURIComponent(id)}`, {
          method: "PUT",
          body: JSON.stringify(body),
        }),
      );
    },
  );

  server.registerTool(
    "delete_milestone",
    {
      description:
        "Delete a milestone. Tasks previously assigned to it will have their milestone cleared.",
      inputSchema: z.object({
        id: nonEmptyString.describe("Milestone ID"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/milestone/${encodeURIComponent(args.id)}`, {
          method: "DELETE",
        }),
      ),
  );

  server.registerTool(
    "assign_task_milestone",
    {
      description:
        "Assign a task to a milestone, or unassign it by passing null. The milestone must belong to the same project as the task.",
      inputSchema: z.object({
        taskId: nonEmptyString.describe("Task ID to assign"),
        milestoneId: nonEmptyString
          .nullable()
          .describe("Milestone ID to assign to, or null to unassign"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/task/milestone/${encodeURIComponent(args.taskId)}`, {
          method: "PUT",
          body: JSON.stringify({ milestoneId: args.milestoneId }),
        }),
      ),
  );

  server.registerTool(
    "program_list_teams",
    {
      description:
        "List all program teams in a workspace with their latest health status, open risk count, and next milestone date.",
      inputSchema: z.object({
        workspaceId: nonEmptyString.describe("Workspace ID"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(
          `/api/program/${encodeURIComponent(args.workspaceId)}/teams`,
        ),
      ),
  );

  server.registerTool(
    "program_get_team_status",
    {
      description:
        "Get full workstream data for a program team: current week status, lifecycle milestone dates, risks, and roadmap releases.",
      inputSchema: z.object({
        workspaceId: nonEmptyString.describe("Workspace ID"),
        teamId: nonEmptyString.describe("Team ID"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(
          `/api/program/${encodeURIComponent(args.workspaceId)}/teams/${encodeURIComponent(args.teamId)}/status`,
        ),
      ),
  );

  server.registerTool(
    "program_upsert_team_status",
    {
      description:
        "Save (or update) the weekly status for a program team. Sets the health (green/amber/red), accomplishments, next week focus, and leadership asks for the current week.",
      inputSchema: z.object({
        workspaceId: nonEmptyString.describe("Workspace ID"),
        teamId: nonEmptyString.describe("Team ID"),
        health: z.enum(["green", "amber", "red"]).describe("RAG health status"),
        accomplishments: z
          .string()
          .optional()
          .describe("What the team accomplished this week"),
        nextWeekFocus: z
          .string()
          .optional()
          .describe("What the team will focus on next week"),
        leadershipAsks: z
          .string()
          .optional()
          .describe("Escalations or asks for leadership"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(
          `/api/program/${encodeURIComponent(args.workspaceId)}/teams/${encodeURIComponent(args.teamId)}/status`,
          {
            method: "PUT",
            body: JSON.stringify({
              health: args.health,
              accomplishments: args.accomplishments ?? null,
              nextWeekFocus: args.nextWeekFocus ?? null,
              leadershipAsks: args.leadershipAsks ?? null,
            }),
          },
        ),
      ),
  );

  server.registerTool(
    "program_get_roadmap",
    {
      description:
        "Get all roadmap releases across all program teams in a workspace, sorted by fiscal year and quarter.",
      inputSchema: z.object({
        workspaceId: nonEmptyString.describe("Workspace ID"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(
          `/api/program/${encodeURIComponent(args.workspaceId)}/roadmap`,
        ),
      ),
  );

  server.registerTool(
    "program_get_week_diff",
    {
      description:
        "Get a week-over-week diff for all program teams in a workspace. Shows RAG changes, text updates, demand date changes, risk status changes, and roadmap moves between two weeks.",
      inputSchema: z.object({
        workspaceId: nonEmptyString.describe("Workspace ID"),
        from: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("Earlier week start date (YYYY-MM-DD)"),
        to: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .describe("Later week start date (YYYY-MM-DD)"),
      }),
    },
    async (args) => {
      const qs = new URLSearchParams({ from: args.from, to: args.to });
      return run(() =>
        client.json(
          `/api/program/${encodeURIComponent(args.workspaceId)}/snapshots/diff?${qs.toString()}`,
        ),
      );
    },
  );

  // ── Deletion tools (U2) ──────────────────────────────────────────

  server.registerTool(
    "delete_task",
    {
      description: "Delete a task by ID.",
      inputSchema: z.object({
        id: nonEmptyString.describe("Task ID to delete"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/task/${encodeURIComponent(args.id)}`, {
          method: "DELETE",
        }),
      ),
  );

  server.registerTool(
    "delete_project",
    {
      description: "Delete a project and all its tasks by ID.",
      inputSchema: z.object({
        id: nonEmptyString.describe("Project ID to delete"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/project/${encodeURIComponent(args.id)}`, {
          method: "DELETE",
        }),
      ),
  );

  server.registerTool(
    "delete_label",
    {
      description:
        "Delete a workspace label by ID, or detach a label from a task.",
      inputSchema: z.object({
        id: nonEmptyString.describe("Label ID to delete"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/label/${encodeURIComponent(args.id)}`, {
          method: "DELETE",
        }),
      ),
  );

  server.registerTool(
    "delete_comment",
    {
      description: "Delete a comment/activity by ID.",
      inputSchema: z.object({
        id: nonEmptyString.describe("Comment/activity ID to delete"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/comment/${encodeURIComponent(args.id)}`, {
          method: "DELETE",
        }),
      ),
  );

  // ── Column CRUD tools (U3) ──────────────────────────────────────

  server.registerTool(
    "list_columns",
    {
      description: "List all columns for a project or team board.",
      inputSchema: z.object({
        projectId: optionalNonEmptyString.describe(
          "Project ID (use for project boards)",
        ),
        teamId: optionalNonEmptyString.describe(
          "Team ID (use for team boards)",
        ),
      }),
    },
    async (args) => {
      if (args.projectId) {
        return run(() =>
          client.json(
            `/api/column?projectId=${encodeURIComponent(args.projectId!)}`,
          ),
        );
      }
      if (args.teamId) {
        return run(() =>
          client.json(`/api/team/${encodeURIComponent(args.teamId!)}/columns`),
        );
      }
      return errorResult("Provide either projectId or teamId");
    },
  );

  server.registerTool(
    "create_column",
    {
      description: "Create a new column on a project or team board.",
      inputSchema: z.object({
        projectId: optionalNonEmptyString.describe("Project ID"),
        teamId: optionalNonEmptyString.describe("Team ID"),
        name: nonEmptyString.describe("Column name"),
        position: z.number().describe("Column position (0-based)"),
        icon: optionalNonEmptyString.describe("Column icon"),
        color: optionalNonEmptyString.describe("Column color (hex)"),
        isFinal: z
          .boolean()
          .optional()
          .describe("Whether this is a final/done column"),
      }),
    },
    async (args) => {
      if (args.projectId) {
        return run(() =>
          client.json("/api/column", {
            method: "POST",
            body: JSON.stringify({
              projectId: args.projectId,
              name: args.name,
              position: args.position,
              icon: args.icon,
              color: args.color,
            }),
          }),
        );
      }
      if (args.teamId) {
        return run(() =>
          client.json(`/api/team/${encodeURIComponent(args.teamId!)}/columns`, {
            method: "POST",
            body: JSON.stringify({
              name: args.name,
              icon: args.icon,
              color: args.color,
              isFinal: args.isFinal,
            }),
          }),
        );
      }
      return errorResult("Provide either projectId or teamId");
    },
  );

  server.registerTool(
    "update_column",
    {
      description: "Update a column's name, position, or other properties.",
      inputSchema: z.object({
        id: nonEmptyString.describe("Column ID"),
        name: optionalNonEmptyString.describe("New name"),
        position: z.number().optional().describe("New position"),
        icon: optionalNonEmptyString.describe("New icon"),
        color: optionalNonEmptyString.describe("New color (hex)"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/column/${encodeURIComponent(args.id)}`, {
          method: "PUT",
          body: JSON.stringify({
            name: args.name,
            position: args.position,
            icon: args.icon,
            color: args.color,
          }),
        }),
      ),
  );

  server.registerTool(
    "delete_column",
    {
      description: "Delete a column from a board.",
      inputSchema: z.object({
        id: nonEmptyString.describe("Column ID to delete"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/column/${encodeURIComponent(args.id)}`, {
          method: "DELETE",
        }),
      ),
  );

  server.registerTool(
    "reorder_columns",
    {
      description:
        "Reorder columns on a team board. Provide an array of { id, position }.",
      inputSchema: z.object({
        teamId: nonEmptyString.describe("Team ID"),
        columns: z
          .array(
            z.object({
              id: nonEmptyString.describe("Column ID"),
              position: z.number().describe("New position"),
            }),
          )
          .describe("Ordered list of column IDs with their new positions"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(
          `/api/team/${encodeURIComponent(args.teamId)}/columns/reorder`,
          {
            method: "PUT",
            body: JSON.stringify({ columns: args.columns }),
          },
        ),
      ),
  );

  // ── Task relation tools (U3) ────────────────────────────────────

  server.registerTool(
    "list_task_relations",
    {
      description:
        "List all task relations (dependencies, subtasks) for a task.",
      inputSchema: z.object({
        taskId: nonEmptyString.describe("Task ID"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(
          `/api/task-relation?taskId=${encodeURIComponent(args.taskId)}`,
        ),
      ),
  );

  server.registerTool(
    "create_task_relation",
    {
      description:
        "Create a relation between two tasks (blocks, blocked_by, subtask, related).",
      inputSchema: z.object({
        taskId: nonEmptyString.describe("Source task ID"),
        relatedTaskId: nonEmptyString.describe("Target task ID"),
        type: z
          .enum(["blocks", "blocked_by", "subtask", "related"])
          .describe("Relation type"),
      }),
    },
    async (args) =>
      run(() =>
        client.json("/api/task-relation", {
          method: "POST",
          body: JSON.stringify({
            taskId: args.taskId,
            relatedTaskId: args.relatedTaskId,
            type: args.type,
          }),
        }),
      ),
  );

  server.registerTool(
    "delete_task_relation",
    {
      description: "Delete a task relation by ID.",
      inputSchema: z.object({
        id: nonEmptyString.describe("Task relation ID to delete"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/task-relation/${encodeURIComponent(args.id)}`, {
          method: "DELETE",
        }),
      ),
  );

  // ── Team + workspace user tools (U4) ─────────────────────────────

  server.registerTool(
    "list_teams",
    {
      description: "List all teams in a workspace.",
      inputSchema: z.object({
        workspaceId: nonEmptyString.describe("Workspace ID"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(
          `/api/auth/organization/list-teams?organizationId=${encodeURIComponent(args.workspaceId)}`,
          {
            method: "POST",
            body: JSON.stringify({ organizationId: args.workspaceId }),
          },
        ),
      ),
  );

  server.registerTool(
    "create_team",
    {
      description: "Create a new team in a workspace.",
      inputSchema: z.object({
        workspaceId: nonEmptyString.describe("Workspace ID"),
        name: nonEmptyString.describe("Team name"),
        identifier: optionalNonEmptyString.describe(
          "Short identifier (auto-derived from name if omitted)",
        ),
      }),
    },
    async (args) =>
      run(() =>
        client.json("/api/teams", {
          method: "POST",
          body: JSON.stringify({
            workspaceId: args.workspaceId,
            name: args.name,
            identifier: args.identifier,
          }),
        }),
      ),
  );

  server.registerTool(
    "update_team",
    {
      description: "Update a team's name or identifier.",
      inputSchema: z.object({
        teamId: nonEmptyString.describe("Team ID"),
        name: optionalNonEmptyString.describe("New name"),
        identifier: optionalNonEmptyString.describe("New identifier"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/teams/${encodeURIComponent(args.teamId)}`, {
          method: "PUT",
          body: JSON.stringify({
            name: args.name,
            identifier: args.identifier,
          }),
        }),
      ),
  );

  server.registerTool(
    "get_team_issues",
    {
      description:
        "List all issues (team-level tasks) for a team with pagination.",
      inputSchema: z.object({
        teamId: nonEmptyString.describe("Team ID"),
        cursor: optionalNonEmptyString.describe("Pagination cursor"),
        limit: z.number().int().positive().optional().describe("Page size"),
      }),
    },
    async (args) => {
      const qs = new URLSearchParams();
      if (args.cursor) qs.set("cursor", args.cursor);
      if (args.limit) qs.set("limit", String(args.limit));
      return run(() =>
        client.json(
          `/api/teams/${encodeURIComponent(args.teamId)}/issues${qs.toString() ? `?${qs.toString()}` : ""}`,
        ),
      );
    },
  );

  server.registerTool(
    "get_team_projects",
    {
      description: "List all projects for a team.",
      inputSchema: z.object({
        teamId: nonEmptyString.describe("Team ID"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/teams/${encodeURIComponent(args.teamId)}/projects`),
      ),
  );

  server.registerTool(
    "create_team_project",
    {
      description: "Create a new project for a team.",
      inputSchema: z.object({
        teamId: nonEmptyString.describe("Team ID"),
        name: nonEmptyString.describe("Project name"),
        description: z.string().optional().describe("Project description"),
        slug: optionalNonEmptyString.describe("URL slug"),
        icon: optionalNonEmptyString.describe("Project icon"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/teams/${encodeURIComponent(args.teamId)}/projects`, {
          method: "POST",
          body: JSON.stringify({
            name: args.name,
            description: args.description,
            slug: args.slug,
            icon: args.icon,
          }),
        }),
      ),
  );

  server.registerTool(
    "list_workspace_members",
    {
      description: "List all members of a workspace.",
      inputSchema: z.object({
        workspaceId: nonEmptyString.describe("Workspace ID"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(
          `/api/workspace/${encodeURIComponent(args.workspaceId)}/members`,
        ),
      ),
  );

  server.registerTool(
    "invite_workspace_member",
    {
      description: "Invite a user to a workspace by email.",
      inputSchema: z.object({
        workspaceId: nonEmptyString.describe("Workspace ID"),
        email: nonEmptyString.describe("Email address to invite"),
        role: z
          .enum(["admin", "member"])
          .optional()
          .describe("Role (default: member)"),
      }),
    },
    async (args) =>
      run(() =>
        client.json("/api/auth/organization/invite-member", {
          method: "POST",
          body: JSON.stringify({
            email: args.email,
            role: args.role ?? "member",
            organizationId: args.workspaceId,
          }),
        }),
      ),
  );

  server.registerTool(
    "remove_workspace_member",
    {
      description: "Remove a member from a workspace.",
      inputSchema: z.object({
        workspaceId: nonEmptyString.describe("Workspace ID"),
        memberId: nonEmptyString.describe("Member ID to remove"),
      }),
    },
    async (args) =>
      run(() =>
        client.json("/api/auth/organization/remove-member", {
          method: "POST",
          body: JSON.stringify({
            memberId: args.memberId,
            organizationId: args.workspaceId,
          }),
        }),
      ),
  );

  server.registerTool(
    "cancel_invitation",
    {
      description: "Cancel a pending workspace invitation.",
      inputSchema: z.object({
        invitationId: nonEmptyString.describe("Invitation ID to cancel"),
      }),
    },
    async (args) =>
      run(() =>
        client.json("/api/auth/organization/cancel-invitation", {
          method: "POST",
          body: JSON.stringify({ invitationId: args.invitationId }),
        }),
      ),
  );

  // ── Time entry tools (U5) ────────────────────────────────────────

  server.registerTool(
    "list_time_entries",
    {
      description: "List time entries for a task.",
      inputSchema: z.object({
        taskId: nonEmptyString.describe("Task ID"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/time-entry/task/${encodeURIComponent(args.taskId)}`, {
          method: "GET",
        }),
      ),
  );

  server.registerTool(
    "create_time_entry",
    {
      description: "Log a time entry for a task.",
      inputSchema: z.object({
        taskId: nonEmptyString.describe("Task ID"),
        startTime: isoDateTimeSchema.describe("Start time (ISO 8601)"),
        endTime: optionalIsoDateTimeSchema.describe("End time (ISO 8601)"),
        description: z.string().optional().describe("Time entry description"),
      }),
    },
    async (args) => {
      const body: Record<string, unknown> = {
        taskId: args.taskId,
        startTime: args.startTime,
      };
      if (args.endTime !== undefined) body.endTime = args.endTime;
      if (args.description !== undefined) body.description = args.description;
      return run(() =>
        client.json("/api/time-entry", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
    },
  );

  server.registerTool(
    "update_time_entry",
    {
      description: "Update a time entry.",
      inputSchema: z.object({
        id: nonEmptyString.describe("Time entry ID"),
        startTime: optionalIsoDateTimeSchema.describe(
          "New start time (ISO 8601)",
        ),
        endTime: optionalIsoDateTimeSchema.describe("New end time (ISO 8601)"),
        description: z.string().optional().describe("New description"),
      }),
    },
    async (args) => {
      const { id, ...patch } = args;
      return run(() =>
        client.json(`/api/time-entry/${encodeURIComponent(id)}`, {
          method: "PUT",
          body: JSON.stringify(patch),
        }),
      );
    },
  );

  server.registerTool(
    "delete_time_entry",
    {
      description: "Delete a time entry by ID.",
      inputSchema: z.object({
        id: nonEmptyString.describe("Time entry ID to delete"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/time-entry/${encodeURIComponent(args.id)}`, {
          method: "DELETE",
        }),
      ),
  );

  // ── Notification tools (U5) ──────────────────────────────────────

  server.registerTool(
    "list_notifications",
    {
      description: "List notifications for a workspace.",
      inputSchema: z.object({
        workspaceId: nonEmptyString.describe("Workspace ID"),
      }),
    },
    async (args) => {
      const qs = new URLSearchParams({ workspaceId: args.workspaceId });
      return run(() =>
        client.json(`/api/notification?${qs.toString()}`, { method: "GET" }),
      );
    },
  );

  server.registerTool(
    "mark_notification_read",
    {
      description: "Mark a single notification as read.",
      inputSchema: z.object({
        id: nonEmptyString.describe("Notification ID"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/notification/${encodeURIComponent(args.id)}/read`, {
          method: "POST",
        }),
      ),
  );

  server.registerTool(
    "mark_all_notifications_read",
    {
      description: "Mark all notifications as read in a workspace.",
      inputSchema: z.object({
        workspaceId: nonEmptyString.describe("Workspace ID"),
      }),
    },
    async (args) =>
      run(() =>
        client.json("/api/notification/read-all", {
          method: "POST",
          body: JSON.stringify({ workspaceId: args.workspaceId }),
        }),
      ),
  );

  server.registerTool(
    "clear_notifications",
    {
      description: "Clear all notifications in a workspace.",
      inputSchema: z.object({
        workspaceId: nonEmptyString.describe("Workspace ID"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(
          `/api/notification?workspaceId=${encodeURIComponent(args.workspaceId)}`,
          {
            method: "DELETE",
          },
        ),
      ),
  );

  // ── Activity tools (U5) ──────────────────────────────────────────

  server.registerTool(
    "list_task_activities",
    {
      description: "List activity/audit log entries for a task.",
      inputSchema: z.object({
        taskId: nonEmptyString.describe("Task ID"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/activity/${encodeURIComponent(args.taskId)}`, {
          method: "GET",
        }),
      ),
  );

  // ── Label gap tools (U5) ─────────────────────────────────────────

  server.registerTool(
    "get_labels_by_task",
    {
      description: "Get all labels attached to a specific task.",
      inputSchema: z.object({
        taskId: nonEmptyString.describe("Task ID"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/label?taskId=${encodeURIComponent(args.taskId)}`, {
          method: "GET",
        }),
      ),
  );

  // ── Comment gap tools (U5) ───────────────────────────────────────

  server.registerTool(
    "update_comment",
    {
      description: "Update the content of an existing comment.",
      inputSchema: z.object({
        id: nonEmptyString.describe("Comment ID"),
        comment: nonEmptyString.describe("Updated comment content"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/comment/${encodeURIComponent(args.id)}`, {
          method: "PUT",
          body: JSON.stringify({ comment: args.comment }),
        }),
      ),
  );

  // ── Workflow rule tools (U5) ─────────────────────────────────────

  server.registerTool(
    "list_workflow_rules",
    {
      description: "List workflow rules for a project.",
      inputSchema: z.object({
        projectId: nonEmptyString.describe("Project ID"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(
          `/api/workflow-rule?projectId=${encodeURIComponent(args.projectId)}`,
          { method: "GET" },
        ),
      ),
  );

  server.registerTool(
    "upsert_workflow_rule",
    {
      description:
        "Create or update a workflow rule that triggers an action when a task transitions between statuses.",
      inputSchema: z.object({
        projectId: nonEmptyString.describe("Project ID"),
        fromStatus: nonEmptyString.describe("Source status name"),
        toStatus: nonEmptyString.describe("Target status name"),
        action: nonEmptyString.describe(
          "Action to trigger (e.g. assign, notify)",
        ),
        config: z
          .record(z.unknown())
          .optional()
          .describe("Action configuration (key-value pairs)"),
      }),
    },
    async (args) => {
      const body: Record<string, unknown> = {
        projectId: args.projectId,
        fromStatus: args.fromStatus,
        toStatus: args.toStatus,
        action: args.action,
      };
      if (args.config !== undefined) body.config = args.config;
      return run(() =>
        client.json("/api/workflow-rule", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
    },
  );

  server.registerTool(
    "delete_workflow_rule",
    {
      description: "Delete a workflow rule by ID.",
      inputSchema: z.object({
        id: nonEmptyString.describe("Workflow rule ID to delete"),
      }),
    },
    async (args) =>
      run(() =>
        client.json(`/api/workflow-rule/${encodeURIComponent(args.id)}`, {
          method: "DELETE",
        }),
      ),
  );

  // ── User profile tools (U5) ──────────────────────────────────────

  server.registerTool(
    "update_profile",
    {
      description: "Update the current user's profile (name and/or avatar).",
      inputSchema: z.object({
        name: optionalNonEmptyString.describe("New display name"),
        image: z.string().optional().describe("New avatar image URL"),
      }),
    },
    async (args) => {
      const body: Record<string, string> = {};
      if (args.name !== undefined) body.name = args.name;
      if (args.image !== undefined) body.image = args.image;
      return run(() =>
        client.json("/api/auth/update-user", {
          method: "POST",
          body: JSON.stringify(body),
        }),
      );
    },
  );

  // ── Bulk operation tools (U5) ────────────────────────────────────

  server.registerTool(
    "bulk_update_tasks",
    {
      description:
        "Apply the same updates to multiple tasks at once (e.g. change status, assignee, or priority for a batch of tasks).",
      inputSchema: z.object({
        projectId: nonEmptyString.describe("Project ID the tasks belong to"),
        taskIds: z
          .array(nonEmptyString)
          .min(1)
          .describe("Array of task IDs to update"),
        updates: z
          .record(z.unknown())
          .describe("Fields to update (e.g. { status, priority, userId })"),
      }),
    },
    async (args) =>
      run(() =>
        client.json("/api/task/bulk", {
          method: "POST",
          body: JSON.stringify({
            projectId: args.projectId,
            taskIds: args.taskIds,
            updates: args.updates,
          }),
        }),
      ),
  );

  // ── Context injection tools (U10) ──────────────────────────────────

  registerContextTools(server, client);
}
