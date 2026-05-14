import { eq } from "drizzle-orm";
import type { Context } from "hono";
import { streamSSE } from "hono/streaming";
import db, { schema } from "../database";
import { subscribeToAllEvents } from "./index";

const HEARTBEAT_INTERVAL_MS = 30_000;

const projectIdToWorkspaceCache = new Map<string, string>();
const userWorkspacesCache = new Map<string, Set<string>>();

async function resolveWorkspaceFromProject(
  projectId: string,
): Promise<string | null> {
  const cached = projectIdToWorkspaceCache.get(projectId);
  if (cached) return cached;

  const [project] = await db
    .select({ workspaceId: schema.projectTable.workspaceId })
    .from(schema.projectTable)
    .where(eq(schema.projectTable.id, projectId))
    .limit(1);

  if (!project) return null;

  projectIdToWorkspaceCache.set(projectId, project.workspaceId);
  return project.workspaceId;
}

async function getUserWorkspaceIds(userId: string): Promise<Set<string>> {
  const cached = userWorkspacesCache.get(userId);
  if (cached) return cached;

  const memberships = await db
    .select({ workspaceId: schema.workspaceUserTable.workspaceId })
    .from(schema.workspaceUserTable)
    .where(eq(schema.workspaceUserTable.userId, userId));

  const workspaceIds = new Set(memberships.map((m) => m.workspaceId));
  userWorkspacesCache.set(userId, workspaceIds);
  return workspaceIds;
}

function extractProjectId(eventData: unknown): string | null {
  if (!eventData || typeof eventData !== "object") return null;
  const data = eventData as Record<string, unknown>;
  return typeof data.projectId === "string" && data.projectId
    ? data.projectId
    : null;
}

const activeConnections = new Map<string, Set<AbortController>>();

export function getActiveConnectionCount(): number {
  let total = 0;
  for (const connections of activeConnections.values()) {
    total += connections.size;
  }
  return total;
}

export const sseHandler = async (c: Context) => {
  const userId = c.get("userId") as string | undefined;
  if (!userId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const abortController = new AbortController();
  const { signal } = abortController;

  const userConnections = activeConnections.get(userId);
  if (userConnections) {
    userConnections.add(abortController);
  } else {
    activeConnections.set(userId, new Set([abortController]));
  }

  return streamSSE(c, async (stream) => {
    const unsubscribe = subscribeToAllEvents((eventType, payload) => {
      if (signal.aborted) return;

      void (async () => {
        try {
          const projectId = extractProjectId(payload.data);

          if (projectId) {
            const workspaceId = await resolveWorkspaceFromProject(projectId);
            if (workspaceId) {
              const userWorkspaces = await getUserWorkspaceIds(userId);
              if (!userWorkspaces.has(workspaceId)) return;
            }
          }

          await stream.writeSSE({
            event: eventType,
            data: JSON.stringify(payload),
          });
        } catch (error) {
          console.error(`SSE: error writing event ${eventType}:`, error);
        }
      })();
    });

    const heartbeat = setInterval(() => {
      if (signal.aborted) return;
      stream.writeSSE({ data: "" }).catch(() => {});
    }, HEARTBEAT_INTERVAL_MS);

    stream.onAbort(() => {
      clearInterval(heartbeat);
      unsubscribe();
      const connections = activeConnections.get(userId);
      if (connections) {
        connections.delete(abortController);
        if (connections.size === 0) {
          activeConnections.delete(userId);
          userWorkspacesCache.delete(userId);
        }
      }
    });

    await stream.writeSSE({
      event: "connected",
      data: JSON.stringify({ timestamp: new Date().toISOString() }),
    });

    await new Promise<void>((resolve) => {
      signal.addEventListener("abort", () => resolve(), { once: true });
    });
  });
};
