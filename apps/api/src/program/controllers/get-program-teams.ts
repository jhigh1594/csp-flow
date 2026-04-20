import { and, count, eq, sql } from "drizzle-orm";
import db from "../../database";
import {
  demandTable,
  riskTable,
  teamTable,
  weeklyStatusTable,
} from "../../database/schema";

const DEMAND_DATE_KEYS = [
  "businessPartnershipDate",
  "discoveryDate",
  "requirementsDate",
  "demandSubmissionDate",
  "developmentDate",
  "uatDate",
  "goLiveDate",
  "adoptionDate",
] as const;

type DemandRow = typeof demandTable.$inferSelect;

async function getProgramTeams(workspaceId: string) {
  const today = new Date().toISOString().split("T")[0] as string;

  // Current ISO week Monday
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  const weekStart = monday.toISOString().split("T")[0] as string;

  // Get all teams for workspace
  const teams = await db
    .select({
      id: teamTable.id,
      name: teamTable.name,
      identifier: teamTable.identifier,
    })
    .from(teamTable)
    .where(eq(teamTable.workspaceId, workspaceId));

  if (teams.length === 0) {
    return [];
  }

  const teamIds = teams.map((t) => t.id);

  // Get latest weekly status for current week
  const statuses = await db
    .select({
      teamId: weeklyStatusTable.teamId,
      health: weeklyStatusTable.health,
      weekStart: weeklyStatusTable.weekStart,
      updatedAt: weeklyStatusTable.updatedAt,
    })
    .from(weeklyStatusTable)
    .where(
      and(
        eq(weeklyStatusTable.workspaceId, workspaceId),
        eq(weeklyStatusTable.weekStart, weekStart),
      ),
    );

  const statusByTeam = new Map(statuses.map((s) => [s.teamId, s]));

  // Get open risk counts per team using sql array
  const riskCounts = await db
    .select({
      teamId: riskTable.teamId,
      openCount: count(),
    })
    .from(riskTable)
    .where(
      and(
        sql`${riskTable.teamId} = ANY(ARRAY[${sql.join(teamIds.map((id) => sql`${id}`), sql`, `)}]::text[])`,
        eq(riskTable.status, "open"),
      ),
    )
    .groupBy(riskTable.teamId);

  const riskCountByTeam = new Map(
    riskCounts.map((r) => [r.teamId, Number(r.openCount)]),
  );

  // Get all demands for these teams
  const demands = await db
    .select()
    .from(demandTable)
    .where(
      sql`${demandTable.teamId} = ANY(ARRAY[${sql.join(teamIds.map((id) => sql`${id}`), sql`, `)}]::text[])`,
    );

  // Compute next milestone demand date per team
  const nextMilestoneDateByTeam = new Map<string, string | null>();
  for (const demand of demands) {
    const futureDates: string[] = [];
    for (const key of DEMAND_DATE_KEYS) {
      const val = demand[key as keyof DemandRow] as string | null;
      if (val != null && val > today) {
        futureDates.push(val);
      }
    }
    if (futureDates.length === 0) {
      continue;
    }
    futureDates.sort();
    const earliest = futureDates[0] as string;
    const existing = nextMilestoneDateByTeam.get(demand.teamId);
    if (!existing || earliest < existing) {
      nextMilestoneDateByTeam.set(demand.teamId, earliest);
    }
  }

  return teams.map((team) => {
    const status = statusByTeam.get(team.id);
    return {
      id: team.id,
      name: team.name,
      identifier: team.identifier,
      latestStatus: status
        ? {
            health: status.health,
            weekStart: status.weekStart,
            updatedAt: status.updatedAt,
          }
        : null,
      openRiskCount: riskCountByTeam.get(team.id) ?? 0,
      nextMilestoneDemandDate: nextMilestoneDateByTeam.get(team.id) ?? null,
    };
  });
}

export default getProgramTeams;
