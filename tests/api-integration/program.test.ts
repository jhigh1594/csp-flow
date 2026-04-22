import { createId } from "@paralleldrive/cuid2";
import { beforeEach, describe, expect, it } from "vitest";
import db, { schema } from "../../apps/api/src/database";
import { createApp } from "../../apps/api/src/index";
import { mockAnonymousSession, mockAuthenticatedSession } from "./helpers/auth";
import { resetTestDatabase } from "./helpers/database";
import { createWorkspaceMember } from "./helpers/fixtures";

describe("API integration: program tracker", () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  describe("GET /:workspaceId/teams", () => {
    it("rejects unauthenticated requests", async () => {
      const member = await createWorkspaceMember();
      mockAnonymousSession();
      const { app } = createApp();

      const response = await app.request(
        `/api/program/${member.workspace.id}/teams`,
      );
      expect(response.status).toBe(401);
    });

    it("returns empty array when no teams have statuses", async () => {
      const member = await createWorkspaceMember();
      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const response = await app.request(
        `/api/program/${member.workspace.id}/teams`,
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBeGreaterThanOrEqual(1);
      const team = body.find((t: { id: string }) => t.id === member.team.id);
      expect(team).toBeDefined();
      expect(team.latestStatus).toBeNull();
      expect(team.openRiskCount).toBe(0);
      expect(team.nextMilestoneDemandDate).toBeNull();
    });

    it("reflects open risk count and next milestone date after seeding data", async () => {
      const member = await createWorkspaceMember();
      mockAuthenticatedSession(member.user);

      await db.insert(schema.riskTable).values({
        id: createId(),
        teamId: member.team.id,
        description: "Test risk",
        impact: "high",
        status: "open",
      });

      const today = new Date();
      const futureDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      await db.insert(schema.demandTable).values({
        id: createId(),
        teamId: member.team.id,
        name: "Test Demand",
        sortOrder: 0,
        goLiveDate: futureDate,
      });

      const { app } = createApp();
      const response = await app.request(
        `/api/program/${member.workspace.id}/teams`,
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      const team = body.find((t: { id: string }) => t.id === member.team.id);
      expect(team.openRiskCount).toBe(1);
      expect(team.nextMilestoneDemandDate).toBe(futureDate);
    });
  });

  describe("GET /:workspaceId/teams/:teamId/status", () => {
    it("returns null status before any save", async () => {
      const member = await createWorkspaceMember();
      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const response = await app.request(
        `/api/program/${member.workspace.id}/teams/${member.team.id}/status`,
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBeNull();
      expect(body.demands).toEqual([]);
      expect(body.risks).toEqual([]);
      expect(body.releases).toEqual([]);
    });
  });

  describe("PUT /:workspaceId/teams/:teamId/status", () => {
    it("creates a weekly status and snapshot on first save", async () => {
      const member = await createWorkspaceMember();
      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const response = await app.request(
        `/api/program/${member.workspace.id}/teams/${member.team.id}/status`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            health: "green",
            accomplishments: "Shipped auth",
            nextWeekFocus: "Payments",
            leadershipAsks: null,
          }),
        },
      );
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.health).toBe("green");
      expect(body.accomplishments).toBe("Shipped auth");
    });

    it("rejects invalid health values", async () => {
      const member = await createWorkspaceMember();
      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const response = await app.request(
        `/api/program/${member.workspace.id}/teams/${member.team.id}/status`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ health: "yellow" }),
        },
      );
      expect(response.status).toBe(400);
    });

    it("prevents IDOR — cannot update a team from another workspace", async () => {
      const owner = await createWorkspaceMember();
      const attacker = await createWorkspaceMember();
      mockAuthenticatedSession(attacker.user);
      const { app } = createApp();

      const response = await app.request(
        `/api/program/${attacker.workspace.id}/teams/${owner.team.id}/status`,
        {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ health: "red" }),
        },
      );
      expect(response.status).toBe(404);
    });
  });

  describe("POST /:workspaceId/teams/:teamId/demands", () => {
    it("creates a demand and returns 201", async () => {
      const member = await createWorkspaceMember();
      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const response = await app.request(
        `/api/program/${member.workspace.id}/teams/${member.team.id}/demands`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "Portal Login Flow" }),
        },
      );
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.name).toBe("Portal Login Flow");
      expect(body.teamId).toBe(member.team.id);
    });

    it("prevents IDOR — cannot create demand for a team from another workspace", async () => {
      const owner = await createWorkspaceMember();
      const attacker = await createWorkspaceMember();
      mockAuthenticatedSession(attacker.user);
      const { app } = createApp();

      const response = await app.request(
        `/api/program/${attacker.workspace.id}/teams/${owner.team.id}/demands`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name: "Stolen demand" }),
        },
      );
      expect(response.status).toBe(404);
    });
  });

  describe("POST /:workspaceId/teams/:teamId/risks", () => {
    it("creates a risk and returns 201", async () => {
      const member = await createWorkspaceMember();
      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const response = await app.request(
        `/api/program/${member.workspace.id}/teams/${member.team.id}/risks`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            description: "Data breach risk",
            impact: "high",
          }),
        },
      );
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.description).toBe("Data breach risk");
      expect(body.status).toBe("open");
    });
  });

  describe("DELETE /:workspaceId/teams/:teamId/risks/:riskId", () => {
    it("deletes a risk", async () => {
      const member = await createWorkspaceMember();
      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const [risk] = await db
        .insert(schema.riskTable)
        .values({
          id: createId(),
          teamId: member.team.id,
          description: "Risk to delete",
          impact: "low",
          status: "open",
        })
        .returning();

      const response = await app.request(
        `/api/program/${member.workspace.id}/teams/${member.team.id}/risks/${risk!.id}`,
        { method: "DELETE" },
      );
      expect(response.status).toBe(200);
    });

    it("returns 404 when risk does not exist", async () => {
      const member = await createWorkspaceMember();
      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const response = await app.request(
        `/api/program/${member.workspace.id}/teams/${member.team.id}/risks/nonexistent-id`,
        { method: "DELETE" },
      );
      expect(response.status).toBe(404);
    });

    it("prevents IDOR — cannot delete a risk from another team", async () => {
      const owner = await createWorkspaceMember();
      const attacker = await createWorkspaceMember();

      const [risk] = await db
        .insert(schema.riskTable)
        .values({
          id: createId(),
          teamId: owner.team.id,
          description: "Victim's risk",
          impact: "high",
          status: "open",
        })
        .returning();

      mockAuthenticatedSession(attacker.user);
      const { app } = createApp();

      const response = await app.request(
        `/api/program/${attacker.workspace.id}/teams/${attacker.team.id}/risks/${risk!.id}`,
        { method: "DELETE" },
      );
      expect(response.status).toBe(404);
    });
  });

  describe("POST /:workspaceId/teams/:teamId/releases", () => {
    it("creates a release and returns 201", async () => {
      const member = await createWorkspaceMember();
      mockAuthenticatedSession(member.user);
      const { app } = createApp();

      const response = await app.request(
        `/api/program/${member.workspace.id}/teams/${member.team.id}/releases`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            name: "v2.0",
            quarter: "q2",
            month: 5,
            fiscalYear: 2026,
          }),
        },
      );
      expect(response.status).toBe(201);
      const body = await response.json();
      expect(body.name).toBe("v2.0");
      expect(body.quarter).toBe("q2");
    });
  });
});
