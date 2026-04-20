import { and, asc, eq } from "drizzle-orm";
import db from "../../database";
import {
  demandTable,
  riskTable,
  roadmapReleaseTable,
  weeklyStatusTable,
} from "../../database/schema";

function getCurrentWeekStart(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return (monday.toISOString().split("T")[0]) as string;
}

async function getTeamStatus(teamId: string) {
  const weekStart = getCurrentWeekStart();

  const [currentStatus = null] = await db
    .select()
    .from(weeklyStatusTable)
    .where(
      and(
        eq(weeklyStatusTable.teamId, teamId),
        eq(weeklyStatusTable.weekStart, weekStart),
      ),
    )
    .limit(1);

  const demands = await db
    .select()
    .from(demandTable)
    .where(eq(demandTable.teamId, teamId))
    .orderBy(asc(demandTable.sortOrder));

  const risks = await db
    .select()
    .from(riskTable)
    .where(eq(riskTable.teamId, teamId))
    .orderBy(asc(riskTable.createdAt));

  const releases = await db
    .select()
    .from(roadmapReleaseTable)
    .where(eq(roadmapReleaseTable.teamId, teamId))
    .orderBy(
      asc(roadmapReleaseTable.fiscalYear),
      asc(roadmapReleaseTable.month),
    );

  return {
    status: currentStatus,
    demands,
    risks,
    releases,
  };
}

export default getTeamStatus;
