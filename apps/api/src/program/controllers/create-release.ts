import db from "../../database";
import { roadmapReleaseTable } from "../../database/schema";

async function createRelease({
  teamId,
  name,
  quarter,
  month,
  fiscalYear,
  personas,
  description,
}: {
  teamId: string;
  name: string;
  quarter: string;
  month: number;
  fiscalYear: number;
  personas?: string[] | null;
  description?: string | null;
}) {
  const [release] = await db
    .insert(roadmapReleaseTable)
    .values({
      teamId,
      name,
      quarter,
      month,
      fiscalYear,
      personas: personas ?? null,
      description: description ?? null,
    })
    .returning();

  return release;
}

export default createRelease;
