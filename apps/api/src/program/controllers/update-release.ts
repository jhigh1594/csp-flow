import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { roadmapReleaseTable } from "../../database/schema";

async function updateRelease({
  releaseId,
  teamId,
  name,
  quarter,
  month,
  fiscalYear,
  personas,
  description,
}: {
  releaseId: string;
  teamId: string;
  name?: string;
  quarter?: string;
  month?: number;
  fiscalYear?: number;
  personas?: string[] | null;
  description?: string | null;
}) {
  const updateValues: Partial<typeof roadmapReleaseTable.$inferInsert> = {};

  if (name !== undefined) {
    updateValues.name = name;
  }
  if (quarter !== undefined) {
    updateValues.quarter = quarter;
  }
  if (month !== undefined) {
    updateValues.month = month;
  }
  if (fiscalYear !== undefined) {
    updateValues.fiscalYear = fiscalYear;
  }
  if (personas !== undefined) {
    updateValues.personas = personas;
  }
  if (description !== undefined) {
    updateValues.description = description;
  }

  const [release] = await db
    .update(roadmapReleaseTable)
    .set(updateValues)
    .where(and(eq(roadmapReleaseTable.id, releaseId), eq(roadmapReleaseTable.teamId, teamId)))
    .returning();

  if (!release) {
    throw new HTTPException(404, { message: "Release not found" });
  }

  return release;
}

export default updateRelease;
