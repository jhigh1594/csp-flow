import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type ApiClient, errorResult, run, textResult } from "./tools";

const nonEmptyString = z.string().trim().min(1);

export function registerContextTools(
  server: McpServer,
  client: ApiClient,
): void {
  // ── Workspace context ──────────────────────────────────────────────────────

  server.registerTool(
    "get_workspace_context",
    {
      description:
        "Get a high-level overview of a workspace: name, project count. Use this to quickly understand what a workspace contains before drilling into projects or tasks.",
      inputSchema: z.object({
        workspaceId: nonEmptyString.describe("Workspace ID"),
      }),
    },
    async (args) =>
      run(async () => {
        const [projects, orgs] = await Promise.all([
          client.json<unknown[]>(
            `/api/project?workspaceId=${encodeURIComponent(args.workspaceId)}`,
            { method: "GET" },
          ),
          client.json<{ id: string; name: string }[]>(
            "/api/auth/organization/list",
            { method: "GET" },
          ),
        ]);

        const org = Array.isArray(orgs)
          ? orgs.find((o) => o.id === args.workspaceId)
          : undefined;

        return textResult({
          workspaceId: args.workspaceId,
          workspaceName: org?.name ?? "Unknown",
          projectCount: Array.isArray(projects) ? projects.length : 0,
        });
      }),
  );

  // ── Project context ────────────────────────────────────────────────────────

  server.registerTool(
    "get_project_context",
    {
      description:
        "Get a project overview with task counts by status. Use this to quickly understand project health and progress.",
      inputSchema: z.object({
        projectId: nonEmptyString.describe("Project ID"),
      }),
    },
    async (args) =>
      run(async () => {
        const [project, taskData] = await Promise.all([
          client.json<{
            id: string;
            name: string;
            slug?: string;
            description?: string;
            icon?: string;
            isPublic?: boolean;
            workspaceId?: string;
          }>(`/api/project/${encodeURIComponent(args.projectId)}`, {
            method: "GET",
          }),
          client.json<Record<string, unknown>>(
            `/api/task/tasks/${encodeURIComponent(args.projectId)}`,
            { method: "GET" },
          ),
        ]);

        // Task data is typically { columns: [...], tasks: [...] } or similar shape
        // Count tasks by extracting them from the response
        const statusCounts: Record<string, number> = {};
        let totalTasks = 0;

        if (taskData && typeof taskData === "object") {
          // The task list response includes columns with task arrays
          const columns = (taskData as Record<string, unknown>).columns;
          if (Array.isArray(columns)) {
            for (const col of columns) {
              if (typeof col === "object" && col !== null) {
                const colData = col as Record<string, unknown>;
                const status =
                  typeof colData.name === "string" ? colData.name : "unknown";
                const tasks = Array.isArray(colData.tasks) ? colData.tasks : [];
                statusCounts[status] = tasks.length;
                totalTasks += tasks.length;
              }
            }
          }
        }

        return textResult({
          projectId: (project as Record<string, unknown>).id ?? args.projectId,
          projectName: (project as Record<string, unknown>).name ?? "Unknown",
          totalTasks,
          tasksByStatus: statusCounts,
        });
      }),
  );

  // ── Recent activity ────────────────────────────────────────────────────────

  server.registerTool(
    "get_recent_activity",
    {
      description:
        "Get recent activity across all projects in a workspace. Combines activity from all projects, sorted by date, returning the most recent entries. Use this to understand what has been happening recently.",
      inputSchema: z.object({
        workspaceId: nonEmptyString.describe("Workspace ID"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Max activity entries to return (default: 20)"),
      }),
    },
    async (args) =>
      run(async () => {
        const maxResults = args.limit ?? 20;

        const projects = (await client.json<{ id: string; name: string }[]>(
          `/api/project?workspaceId=${encodeURIComponent(args.workspaceId)}`,
          { method: "GET" },
        )) as unknown[];

        if (!Array.isArray(projects) || projects.length === 0) {
          return textResult({
            workspaceId: args.workspaceId,
            activity: [],
            message: "No projects found in this workspace.",
          });
        }

        // For each project, fetch tasks, then for each task fetch activities.
        // To avoid excessive API calls, fetch tasks for all projects in parallel,
        // then fetch activities for up to 50 recent tasks per project.
        const allActivities: {
          project: string;
          taskId: string;
          activity: Record<string, unknown>;
          createdAt: string;
        }[] = [];

        const projectList = projects as { id: string; name: string }[];

        // Fetch tasks for all projects in parallel
        const taskResults = await Promise.allSettled(
          projectList.map(async (project) => {
            const taskData = (await client.json<Record<string, unknown>>(
              `/api/task/tasks/${encodeURIComponent(project.id)}`,
              { method: "GET" },
            )) as Record<string, unknown>;

            const taskIds: string[] = [];
            const columns = taskData.columns;
            if (Array.isArray(columns)) {
              for (const col of columns) {
                const colData = col as Record<string, unknown>;
                const tasks = Array.isArray(colData.tasks) ? colData.tasks : [];
                for (const task of tasks) {
                  if (
                    typeof task === "object" &&
                    task !== null &&
                    typeof (task as Record<string, unknown>).id === "string"
                  ) {
                    taskIds.push(
                      (task as Record<string, unknown>).id as string,
                    );
                  }
                }
              }
            }
            return {
              projectId: project.id,
              projectName: project.name,
              taskIds,
            };
          }),
        );

        // Collect task IDs, limit to prevent excessive API calls
        const taskProjectMap = new Map<
          string,
          { projectName: string; taskId: string }
        >();
        let totalTaskCount = 0;
        for (const result of taskResults) {
          if (result.status !== "fulfilled") continue;
          const { projectName, taskIds } = result.value;
          for (const taskId of taskIds) {
            taskProjectMap.set(taskId, { projectName, taskId });
            totalTaskCount++;
          }
        }

        // Fetch activities in parallel batches (max 20 concurrent)
        const taskEntries = [...taskProjectMap.entries()].slice(0, 100);
        const batchSize = 20;
        for (let i = 0; i < taskEntries.length; i += batchSize) {
          const batch = taskEntries.slice(i, i + batchSize);
          const activityResults = await Promise.allSettled(
            batch.map(async ([taskId, meta]) => {
              const activities = (await client.json<Record<string, unknown>[]>(
                `/api/activity/${encodeURIComponent(taskId)}`,
                {
                  method: "GET",
                },
              )) as unknown[];
              return { taskId, meta, activities };
            }),
          );

          for (const result of activityResults) {
            if (result.status !== "fulfilled") continue;
            const { meta, activities } = result.value;
            if (!Array.isArray(activities)) continue;
            for (const act of activities) {
              if (typeof act === "object" && act !== null) {
                const createdAt = (act as Record<string, unknown>).createdAt;
                allActivities.push({
                  project: meta.projectName,
                  taskId: meta.taskId,
                  activity: act as Record<string, unknown>,
                  createdAt:
                    typeof createdAt === "string"
                      ? createdAt
                      : new Date().toISOString(),
                });
              }
            }
          }
        }

        // Sort by createdAt descending and take top N
        allActivities.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const recent = allActivities.slice(0, maxResults);

        return textResult({
          workspaceId: args.workspaceId,
          projectsSearched: projectList.length,
          totalTasksSearched: totalTaskCount,
          resultCount: recent.length,
          activity: recent.map((entry) => ({
            project: entry.project,
            taskId: entry.taskId,
            type: entry.activity.type,
            content: entry.activity.content,
            createdAt: entry.createdAt,
            eventData: entry.activity.eventData,
          })),
        });
      }),
  );
}
