import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import * as v from "valibot";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import createTeam from "./controllers/create-team";
import createTeamColumn from "./controllers/create-team-column";
import createTeamIssue from "./controllers/create-team-issue";
import createTeamProject from "./controllers/create-team-project";
import deleteTeam from "./controllers/delete-team";
import getTeamColumns from "./controllers/get-team-columns";
import getTeamIssues from "./controllers/get-team-issues";
import getTeamProjects from "./controllers/get-team-projects";
import reorderTeamColumns from "./controllers/reorder-team-columns";

const team = new Hono<{
  Variables: {
    userId: string;
    workspaceId: string;
  };
}>()
  .post(
    "/",
    describeRoute({
      operationId: "createTeam",
      tags: ["Teams"],
      description: "Create a new team in a workspace",
      responses: {
        200: {
          description: "Team created successfully",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator(
      "json",
      v.object({
        workspaceId: v.string(),
        name: v.string(),
        identifier: v.optional(v.string()),
      }),
    ),
    workspaceAccess.fromBody(),
    async (c) => {
      const { name, identifier } = c.req.valid("json");
      const workspaceId = c.get("workspaceId");
      const team = await createTeam({ workspaceId, name, identifier });
      return c.json(team);
    },
  )
  .get(
    "/:teamId/columns",
    describeRoute({
      operationId: "getTeamColumns",
      tags: ["Teams"],
      description: "Get all columns for a team ordered by position",
      responses: {
        200: {
          description: "List of columns ordered by position",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator("param", v.object({ teamId: v.string() })),
    workspaceAccess.fromTeam("teamId"),
    async (c) => {
      const { teamId } = c.req.valid("param");
      const columns = await getTeamColumns(teamId);
      return c.json(columns);
    },
  )
  .post(
    "/:teamId/columns",
    describeRoute({
      operationId: "createTeamColumn",
      tags: ["Teams"],
      description: "Create a new column for a team",
      responses: {
        200: {
          description: "Column created successfully",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator("param", v.object({ teamId: v.string() })),
    validator(
      "json",
      v.object({
        name: v.string(),
        icon: v.optional(v.string()),
        color: v.optional(v.string()),
        isFinal: v.optional(v.boolean()),
      }),
    ),
    workspaceAccess.fromTeam("teamId"),
    async (c) => {
      const { teamId } = c.req.valid("param");
      const { name, icon, color, isFinal } = c.req.valid("json");
      const result = await createTeamColumn({
        teamId,
        name,
        icon,
        color,
        isFinal,
      });
      return c.json(result);
    },
  )
  .put(
    "/:teamId/columns/reorder",
    describeRoute({
      operationId: "reorderTeamColumns",
      tags: ["Teams"],
      description: "Reorder columns for a team",
      responses: {
        200: {
          description: "Columns reordered successfully",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator("param", v.object({ teamId: v.string() })),
    validator(
      "json",
      v.object({
        columns: v.array(
          v.object({
            id: v.string(),
            position: v.number(),
          }),
        ),
      }),
    ),
    workspaceAccess.fromTeam("teamId"),
    async (c) => {
      const { teamId } = c.req.valid("param");
      const { columns } = c.req.valid("json");
      const result = await reorderTeamColumns(teamId, columns);
      return c.json(result);
    },
  )
  .get(
    "/:teamId/issues",
    describeRoute({
      operationId: "getTeamIssues",
      tags: ["Teams"],
      description: "Get all issues for a team with cursor-based pagination",
      responses: {
        200: {
          description: "List of issues ordered by position",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator("param", v.object({ teamId: v.string() })),
    validator(
      "query",
      v.object({
        cursor: v.optional(v.string()),
        limit: v.optional(v.string()),
      }),
    ),
    workspaceAccess.fromTeam("teamId"),
    async (c) => {
      const { teamId } = c.req.valid("param");
      const { cursor, limit } = c.req.valid("query");
      const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
      const issues = await getTeamIssues(
        teamId,
        cursor,
        Number.isNaN(parsedLimit) ? undefined : parsedLimit,
      );
      return c.json(issues);
    },
  )
  .post(
    "/:teamId/issues",
    describeRoute({
      operationId: "createTeamIssue",
      tags: ["Teams"],
      description:
        "Create a new issue for a team (projectId is null by default)",
      responses: {
        200: {
          description: "Issue created successfully",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator("param", v.object({ teamId: v.string() })),
    validator(
      "json",
      v.object({
        title: v.string(),
        description: v.optional(v.string()),
        columnId: v.optional(v.string()),
        status: v.optional(v.string()),
        priority: v.optional(v.string()),
        assigneeId: v.optional(v.string()),
      }),
    ),
    workspaceAccess.fromTeam("teamId"),
    async (c) => {
      const { teamId } = c.req.valid("param");
      const { title, description, columnId, status, priority, assigneeId } =
        c.req.valid("json");
      const userId = c.get("userId");
      const issue = await createTeamIssue({
        teamId,
        userId,
        title,
        description,
        columnId,
        status,
        priority,
        assigneeId,
      });
      return c.json(issue);
    },
  )
  .get(
    "/:teamId/projects",
    describeRoute({
      operationId: "getTeamProjects",
      tags: ["Teams"],
      description: "Get all projects for a team",
      responses: {
        200: {
          description: "List of projects for the team",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator("param", v.object({ teamId: v.string() })),
    workspaceAccess.fromTeam("teamId"),
    async (c) => {
      const { teamId } = c.req.valid("param");
      const projects = await getTeamProjects(teamId);
      return c.json(projects);
    },
  )
  .delete(
    "/:teamId",
    describeRoute({
      operationId: "deleteTeam",
      tags: ["Teams"],
      description: "Delete a team and all its associated data",
      responses: {
        200: {
          description: "Team deleted successfully",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator("param", v.object({ teamId: v.string() })),
    workspaceAccess.fromTeam("teamId"),
    async (c) => {
      const { teamId } = c.req.valid("param");
      const team = await deleteTeam(teamId);
      return c.json(team);
    },
  )
  .post(
    "/:teamId/projects",
    describeRoute({
      operationId: "createTeamProject",
      tags: ["Teams"],
      description: "Create a new project for a team",
      responses: {
        200: {
          description: "Project created successfully",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator("param", v.object({ teamId: v.string() })),
    validator(
      "json",
      v.object({
        name: v.string(),
        description: v.optional(v.string()),
        slug: v.optional(v.string()),
        icon: v.optional(v.string()),
      }),
    ),
    workspaceAccess.fromTeam("teamId"),
    async (c) => {
      const { teamId } = c.req.valid("param");
      const { name, description, slug, icon } = c.req.valid("json");
      const project = await createTeamProject({
        teamId,
        name,
        description,
        slug,
        icon,
      });
      return c.json(project);
    },
  );

export default team;
