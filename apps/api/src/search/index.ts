import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import * as v from "valibot";
import { activitySchema, projectSchema, taskSchema } from "../schemas";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import globalSearch from "./controllers/global-search";
import { semanticSearch } from "./controllers/semantic-search";

const workspaceSchema = v.object({
  id: v.string(),
  name: v.string(),
  slug: v.string(),
  logo: v.nullable(v.string()),
  metadata: v.nullable(v.string()),
  description: v.nullable(v.string()),
  createdAt: v.date(),
});

const searchResultSchema = v.object({
  tasks: v.optional(v.array(taskSchema)),
  projects: v.optional(v.array(projectSchema)),
  workspaces: v.optional(v.array(workspaceSchema)),
  comments: v.optional(v.array(activitySchema)),
  activities: v.optional(v.array(activitySchema)),
});

const search = new Hono<{
  Variables: {
    userId: string;
  };
}>().get(
  "/",
  describeRoute({
    operationId: "globalSearch",
    tags: ["Search"],
    description:
      "Search across tasks, projects, workspaces, comments, and activities",
    responses: {
      200: {
        description: "Search results",
        content: {
          "application/json": { schema: resolver(searchResultSchema) },
        },
      },
    },
  }),
  validator(
    "query",
    v.object({
      q: v.pipe(
        v.string(),
        v.minLength(1, "Query must be at least 1 character"),
      ),
      type: v.optional(
        v.picklist([
          "all",
          "tasks",
          "projects",
          "workspaces",
          "comments",
          "activities",
        ]),
        "all",
      ),
      workspaceId: v.optional(v.string()),
      projectId: v.optional(v.string()),
      limit: v.optional(
        v.pipe(
          v.string(),
          v.transform(Number),
          v.minValue(1, "Limit must be at least 1"),
          v.maxValue(50, "Limit must not exceed 50"),
        ),
        "20",
      ),
      userEmail: v.optional(v.pipe(v.string(), v.email())),
    }),
  ),
  workspaceAccess.fromQuery(),
  async (c) => {
    const { q, type, workspaceId, projectId, limit, userEmail } =
      c.req.valid("query");
    const userId = c.get("userId");

    const results = await globalSearch({
      query: q,
      userId,
      userEmail,
      type,
      workspaceId,
      projectId,
      limit: typeof limit === "string" ? Number(limit) : limit,
    });

    return c.json(results);
  },
);

const semanticResultSchema = v.object({
  taskId: v.string(),
  title: v.string(),
  description: v.nullable(v.string()),
  status: v.string(),
  priority: v.string(),
  projectId: v.nullable(v.string()),
  similarity: v.number(),
});

search.get(
  "/semantic",
  describeRoute({
    operationId: "semanticSearch",
    tags: ["Search"],
    description:
      "Search tasks by semantic similarity using pgvector embeddings",
    responses: {
      200: {
        description: "Semantically ranked task results",
        content: {
          "application/json": {
            schema: resolver(v.array(semanticResultSchema)),
          },
        },
      },
    },
  }),
  validator(
    "query",
    v.object({
      q: v.pipe(
        v.string(),
        v.minLength(1, "Query must be at least 1 character"),
      ),
      workspaceId: v.optional(v.string()),
      projectId: v.optional(v.string()),
      limit: v.optional(
        v.pipe(
          v.string(),
          v.transform(Number),
          v.minValue(1, "Limit must be at least 1"),
          v.maxValue(50, "Limit must not exceed 50"),
        ),
        "10",
      ),
    }),
  ),
  async (c) => {
    const { q, workspaceId, projectId, limit } = c.req.valid("query");

    const results = await semanticSearch({
      query: q,
      workspaceId,
      projectId,
      limit: typeof limit === "string" ? Number(limit) : limit,
    });

    return c.json(results);
  },
);

export default search;
