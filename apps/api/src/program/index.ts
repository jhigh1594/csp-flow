import { Hono } from "hono";
import { describeRoute, resolver, validator } from "hono-openapi";
import * as v from "valibot";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import createDemand from "./controllers/create-demand";
import createRelease from "./controllers/create-release";
import createRisk from "./controllers/create-risk";
import deleteDemand from "./controllers/delete-demand";
import deleteRelease from "./controllers/delete-release";
import deleteRisk from "./controllers/delete-risk";
import getProgramTeams from "./controllers/get-program-teams";
import getRoadmap from "./controllers/get-roadmap";
import getSnapshotDiff from "./controllers/get-snapshot-diff";
import getSnapshotWeeks from "./controllers/get-snapshot-weeks";
import getTeamStatus from "./controllers/get-team-status";
import updateDemand from "./controllers/update-demand";
import updateRelease from "./controllers/update-release";
import updateRisk from "./controllers/update-risk";
import upsertTeamStatus from "./controllers/upsert-team-status";

const program = new Hono<{
  Variables: {
    userId: string;
    workspaceId: string;
  };
}>()
  .get(
    "/:workspaceId/teams",
    describeRoute({
      operationId: "getProgramTeams",
      tags: ["Program"],
      description: "Get all teams for a workspace with latest status summary",
      responses: {
        200: {
          description:
            "List of teams with status, risk count, and next demand milestone",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator("param", v.object({ workspaceId: v.string() })),
    workspaceAccess.fromParam("workspaceId"),
    async (c) => {
      const { workspaceId } = c.req.valid("param");
      const teams = await getProgramTeams(workspaceId);
      return c.json(teams);
    },
  )
  .get(
    "/:workspaceId/teams/:teamId/status",
    describeRoute({
      operationId: "getTeamStatus",
      tags: ["Program"],
      description: "Get full workstream data for a team",
      responses: {
        200: {
          description: "Team status, demands, risks, and releases",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator(
      "param",
      v.object({ workspaceId: v.string(), teamId: v.string() }),
    ),
    workspaceAccess.fromParam("workspaceId"),
    async (c) => {
      const { teamId } = c.req.valid("param");
      const result = await getTeamStatus(teamId);
      return c.json(result);
    },
  )
  .put(
    "/:workspaceId/teams/:teamId/status",
    describeRoute({
      operationId: "upsertTeamStatus",
      tags: ["Program"],
      description: "Upsert weekly status for a team",
      responses: {
        200: {
          description: "Updated weekly status",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator(
      "param",
      v.object({ workspaceId: v.string(), teamId: v.string() }),
    ),
    validator(
      "json",
      v.object({
        health: v.picklist(["green", "amber", "red"]),
        accomplishments: v.optional(v.nullable(v.string())),
        nextWeekFocus: v.optional(v.nullable(v.string())),
        leadershipAsks: v.optional(v.nullable(v.string())),
      }),
    ),
    workspaceAccess.fromParam("workspaceId"),
    async (c) => {
      const { teamId } = c.req.valid("param");
      const workspaceId = c.get("workspaceId");
      const { health, accomplishments, nextWeekFocus, leadershipAsks } =
        c.req.valid("json");
      const status = await upsertTeamStatus({
        teamId,
        workspaceId,
        health,
        accomplishments,
        nextWeekFocus,
        leadershipAsks,
      });
      return c.json(status);
    },
  )
  .post(
    "/:workspaceId/teams/:teamId/demands",
    describeRoute({
      operationId: "createDemand",
      tags: ["Program"],
      description: "Create a new demand for a team",
      responses: {
        200: {
          description: "Created demand",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator(
      "param",
      v.object({ workspaceId: v.string(), teamId: v.string() }),
    ),
    validator(
      "json",
      v.object({
        name: v.string(),
        businessPartnershipDate: v.optional(v.nullable(v.string())),
        discoveryDate: v.optional(v.nullable(v.string())),
        requirementsDate: v.optional(v.nullable(v.string())),
        demandSubmissionDate: v.optional(v.nullable(v.string())),
        developmentDate: v.optional(v.nullable(v.string())),
        uatDate: v.optional(v.nullable(v.string())),
        goLiveDate: v.optional(v.nullable(v.string())),
        adoptionDate: v.optional(v.nullable(v.string())),
      }),
    ),
    workspaceAccess.fromParam("workspaceId"),
    async (c) => {
      const { teamId, workspaceId } = c.req.valid("param");
      const body = c.req.valid("json");
      const demand = await createDemand({ teamId, workspaceId, ...body });
      return c.json(demand, 201);
    },
  )
  .patch(
    "/:workspaceId/teams/:teamId/demands/:demandId",
    describeRoute({
      operationId: "updateDemand",
      tags: ["Program"],
      description: "Update a demand",
      responses: {
        200: {
          description: "Updated demand",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator(
      "param",
      v.object({
        workspaceId: v.string(),
        teamId: v.string(),
        demandId: v.string(),
      }),
    ),
    validator(
      "json",
      v.object({
        name: v.optional(v.string()),
        businessPartnershipDate: v.optional(v.nullable(v.string())),
        discoveryDate: v.optional(v.nullable(v.string())),
        requirementsDate: v.optional(v.nullable(v.string())),
        demandSubmissionDate: v.optional(v.nullable(v.string())),
        developmentDate: v.optional(v.nullable(v.string())),
        uatDate: v.optional(v.nullable(v.string())),
        goLiveDate: v.optional(v.nullable(v.string())),
        adoptionDate: v.optional(v.nullable(v.string())),
      }),
    ),
    workspaceAccess.fromParam("workspaceId"),
    async (c) => {
      const { demandId, teamId } = c.req.valid("param");
      const body = c.req.valid("json");
      const demand = await updateDemand({ demandId, teamId, ...body });
      return c.json(demand);
    },
  )
  .delete(
    "/:workspaceId/teams/:teamId/demands/:demandId",
    describeRoute({
      operationId: "deleteDemand",
      tags: ["Program"],
      description: "Delete a demand",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator(
      "param",
      v.object({
        workspaceId: v.string(),
        teamId: v.string(),
        demandId: v.string(),
      }),
    ),
    workspaceAccess.fromParam("workspaceId"),
    async (c) => {
      const { demandId, teamId } = c.req.valid("param");
      const result = await deleteDemand(demandId, teamId);
      return c.json(result);
    },
  )
  .post(
    "/:workspaceId/teams/:teamId/risks",
    describeRoute({
      operationId: "createRisk",
      tags: ["Program"],
      description: "Create a new risk for a team",
      responses: {
        200: {
          description: "Created risk",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator(
      "param",
      v.object({ workspaceId: v.string(), teamId: v.string() }),
    ),
    validator(
      "json",
      v.object({
        description: v.string(),
        impact: v.optional(v.picklist(["high", "medium", "low"])),
        status: v.optional(v.picklist(["open", "mitigated", "closed"])),
        owner: v.optional(v.nullable(v.string())),
        dueDate: v.optional(v.nullable(v.string())),
      }),
    ),
    workspaceAccess.fromParam("workspaceId"),
    async (c) => {
      const { teamId, workspaceId } = c.req.valid("param");
      const body = c.req.valid("json");
      const risk = await createRisk({ teamId, workspaceId, ...body });
      return c.json(risk, 201);
    },
  )
  .patch(
    "/:workspaceId/teams/:teamId/risks/:riskId",
    describeRoute({
      operationId: "updateRisk",
      tags: ["Program"],
      description: "Update a risk",
      responses: {
        200: {
          description: "Updated risk",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator(
      "param",
      v.object({
        workspaceId: v.string(),
        teamId: v.string(),
        riskId: v.string(),
      }),
    ),
    validator(
      "json",
      v.object({
        description: v.optional(v.string()),
        impact: v.optional(v.picklist(["high", "medium", "low"])),
        status: v.optional(v.picklist(["open", "mitigated", "closed"])),
        owner: v.optional(v.nullable(v.string())),
        dueDate: v.optional(v.nullable(v.string())),
      }),
    ),
    workspaceAccess.fromParam("workspaceId"),
    async (c) => {
      const { riskId, teamId } = c.req.valid("param");
      const body = c.req.valid("json");
      const risk = await updateRisk({ riskId, teamId, ...body });
      return c.json(risk);
    },
  )
  .delete(
    "/:workspaceId/teams/:teamId/risks/:riskId",
    describeRoute({
      operationId: "deleteRisk",
      tags: ["Program"],
      description: "Delete a risk",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator(
      "param",
      v.object({
        workspaceId: v.string(),
        teamId: v.string(),
        riskId: v.string(),
      }),
    ),
    workspaceAccess.fromParam("workspaceId"),
    async (c) => {
      const { riskId, teamId } = c.req.valid("param");
      const result = await deleteRisk(riskId, teamId);
      return c.json(result);
    },
  )
  .get(
    "/:workspaceId/roadmap",
    describeRoute({
      operationId: "getRoadmap",
      tags: ["Program"],
      description: "Get all roadmap releases across all teams in a workspace",
      responses: {
        200: {
          description: "List of releases with team names",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator("param", v.object({ workspaceId: v.string() })),
    workspaceAccess.fromParam("workspaceId"),
    async (c) => {
      const { workspaceId } = c.req.valid("param");
      const releases = await getRoadmap(workspaceId);
      return c.json(releases);
    },
  )
  .post(
    "/:workspaceId/teams/:teamId/releases",
    describeRoute({
      operationId: "createRelease",
      tags: ["Program"],
      description: "Create a new roadmap release for a team",
      responses: {
        200: {
          description: "Created release",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator(
      "param",
      v.object({ workspaceId: v.string(), teamId: v.string() }),
    ),
    validator(
      "json",
      v.object({
        name: v.string(),
        quarter: v.picklist(["q1", "q2", "q3", "q4"]),
        month: v.number(),
        fiscalYear: v.number(),
        personas: v.optional(v.nullable(v.array(v.string()))),
        description: v.optional(v.nullable(v.string())),
      }),
    ),
    workspaceAccess.fromParam("workspaceId"),
    async (c) => {
      const { teamId, workspaceId } = c.req.valid("param");
      const body = c.req.valid("json");
      const release = await createRelease({ teamId, workspaceId, ...body });
      return c.json(release, 201);
    },
  )
  .patch(
    "/:workspaceId/teams/:teamId/releases/:releaseId",
    describeRoute({
      operationId: "updateRelease",
      tags: ["Program"],
      description: "Update a roadmap release",
      responses: {
        200: {
          description: "Updated release",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator(
      "param",
      v.object({
        workspaceId: v.string(),
        teamId: v.string(),
        releaseId: v.string(),
      }),
    ),
    validator(
      "json",
      v.object({
        name: v.optional(v.string()),
        quarter: v.optional(v.picklist(["q1", "q2", "q3", "q4"])),
        month: v.optional(v.number()),
        fiscalYear: v.optional(v.number()),
        personas: v.optional(v.nullable(v.array(v.string()))),
        description: v.optional(v.nullable(v.string())),
      }),
    ),
    workspaceAccess.fromParam("workspaceId"),
    async (c) => {
      const { releaseId, teamId } = c.req.valid("param");
      const body = c.req.valid("json");
      const release = await updateRelease({ releaseId, teamId, ...body });
      return c.json(release);
    },
  )
  .delete(
    "/:workspaceId/teams/:teamId/releases/:releaseId",
    describeRoute({
      operationId: "deleteRelease",
      tags: ["Program"],
      description: "Delete a roadmap release",
      responses: {
        200: {
          description: "Success",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator(
      "param",
      v.object({
        workspaceId: v.string(),
        teamId: v.string(),
        releaseId: v.string(),
      }),
    ),
    workspaceAccess.fromParam("workspaceId"),
    async (c) => {
      const { releaseId, teamId } = c.req.valid("param");
      const result = await deleteRelease(releaseId, teamId);
      return c.json(result);
    },
  )
  .get(
    "/:workspaceId/snapshots",
    describeRoute({
      operationId: "getSnapshotWeeks",
      tags: ["Program"],
      description: "Get distinct snapshot week dates for a workspace",
      responses: {
        200: {
          description: "List of ISO week start dates (sorted desc)",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator("param", v.object({ workspaceId: v.string() })),
    workspaceAccess.fromParam("workspaceId"),
    async (c) => {
      const { workspaceId } = c.req.valid("param");
      const weeks = await getSnapshotWeeks(workspaceId);
      return c.json(weeks);
    },
  )
  .get(
    "/:workspaceId/snapshots/diff",
    describeRoute({
      operationId: "getSnapshotDiff",
      tags: ["Program"],
      description: "Get diff between two snapshot weeks for a workspace",
      responses: {
        200: {
          description: "Per-team diffs between two weeks",
          content: {
            "application/json": { schema: resolver(v.any()) },
          },
        },
      },
    }),
    validator("param", v.object({ workspaceId: v.string() })),
    validator(
      "query",
      v.object({
        from: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/)),
        to: v.pipe(v.string(), v.regex(/^\d{4}-\d{2}-\d{2}$/)),
      }),
    ),
    workspaceAccess.fromParam("workspaceId"),
    async (c) => {
      const { workspaceId } = c.req.valid("param");
      const { from, to } = c.req.valid("query");
      const diffs = await getSnapshotDiff({
        workspaceId,
        fromWeek: from,
        toWeek: to,
      });
      return c.json(diffs);
    },
  );

export default program;
