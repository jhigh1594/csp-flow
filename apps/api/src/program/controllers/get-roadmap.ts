import { asc, eq } from "drizzle-orm";
import db from "../../database";
import { roadmapReleaseTable, teamTable } from "../../database/schema";

async function getRoadmap(workspaceId: string) {
  const releases = await db
    .select({
      id: roadmapReleaseTable.id,
      teamId: roadmapReleaseTable.teamId,
      teamName: teamTable.name,
      name: roadmapReleaseTable.name,
      quarter: roadmapReleaseTable.quarter,
      month: roadmapReleaseTable.month,
      fiscalYear: roadmapReleaseTable.fiscalYear,
      personas: roadmapReleaseTable.personas,
      description: roadmapReleaseTable.description,
      createdAt: roadmapReleaseTable.createdAt,
      updatedAt: roadmapReleaseTable.updatedAt,
    })
    .from(roadmapReleaseTable)
    .innerJoin(teamTable, eq(roadmapReleaseTable.teamId, teamTable.id))
    .where(eq(teamTable.workspaceId, workspaceId))
    .orderBy(
      asc(roadmapReleaseTable.fiscalYear),
      asc(roadmapReleaseTable.quarter),
      asc(roadmapReleaseTable.month),
    );

  return releases;
}

export default getRoadmap;
