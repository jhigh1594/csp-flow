import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import * as v from "valibot";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import createMilestone from "./controllers/create-milestone";
import deleteMilestone from "./controllers/delete-milestone";
import getMilestoneTasks from "./controllers/get-milestone-tasks";
import getMilestones from "./controllers/get-milestones";
import updateMilestone from "./controllers/update-milestone";

const milestone = new Hono<{ Variables: { userId: string } }>()
  .get(
    "/:milestoneId/tasks",
    describeRoute({
      operationId: "getMilestoneTasks",
      tags: ["Milestones"],
      description: "Get all tasks assigned to a milestone",
      responses: {
        200: {
          description: "List of tasks",
          content: { "application/json": { schema: resolver(v.any()) } },
        },
      },
    }),
    validator("param", v.object({ milestoneId: v.string() })),
    workspaceAccess.fromMilestone("milestoneId"),
    async (c) => {
      const { milestoneId } = c.req.valid("param");
      const tasks = await getMilestoneTasks(milestoneId);
      return c.json(tasks);
    },
  )
  .get(
    "/project/:projectId",
    describeRoute({
      operationId: "listMilestones",
      tags: ["Milestones"],
      description: "Get all milestones for a project ordered by target date",
      responses: {
        200: {
          description: "List of milestones",
          content: { "application/json": { schema: resolver(v.any()) } },
        },
      },
    }),
    validator("param", v.object({ projectId: v.string() })),
    workspaceAccess.fromProject("projectId"),
    async (c) => {
      const { projectId } = c.req.valid("param");
      const milestones = await getMilestones(projectId);
      return c.json(milestones);
    },
  )
  .post(
    "/",
    describeRoute({
      operationId: "createMilestone",
      tags: ["Milestones"],
      description: "Create a new project milestone",
      responses: {
        200: {
          description: "Created milestone",
          content: { "application/json": { schema: resolver(v.any()) } },
        },
      },
    }),
    validator(
      "json",
      v.object({
        projectId: v.string(),
        title: v.pipe(v.string(), v.minLength(1)),
        targetDate: v.string(),
      }),
    ),
    workspaceAccess.fromProject("projectId"),
    async (c) => {
      const { projectId, title, targetDate } = c.req.valid("json");
      const result = await createMilestone({
        projectId,
        title,
        targetDate: new Date(targetDate),
      });
      return c.json(result);
    },
  )
  .put(
    "/:id",
    describeRoute({
      operationId: "updateMilestone",
      tags: ["Milestones"],
      description: "Update a milestone's title or target date",
      responses: {
        200: {
          description: "Updated milestone",
          content: { "application/json": { schema: resolver(v.any()) } },
        },
      },
    }),
    validator("param", v.object({ id: v.string() })),
    validator(
      "json",
      v.object({
        title: v.optional(v.string()),
        targetDate: v.optional(v.string()),
      }),
    ),
    workspaceAccess.fromMilestone(),
    async (c) => {
      const { id } = c.req.valid("param");
      const { title, targetDate } = c.req.valid("json");
      const result = await updateMilestone({
        id,
        title,
        targetDate: targetDate ? new Date(targetDate) : undefined,
      });
      return c.json(result);
    },
  )
  .delete(
    "/:id",
    describeRoute({
      operationId: "deleteMilestone",
      tags: ["Milestones"],
      description: "Delete a milestone",
      responses: {
        200: {
          description: "Deletion result",
          content: { "application/json": { schema: resolver(v.any()) } },
        },
      },
    }),
    validator("param", v.object({ id: v.string() })),
    workspaceAccess.fromMilestone(),
    async (c) => {
      const { id } = c.req.valid("param");
      const result = await deleteMilestone(id);
      return c.json(result);
    },
  );

export default milestone;
