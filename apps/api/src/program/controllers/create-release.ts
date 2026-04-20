import db from "../../database";
import { roadmapReleaseTable } from "../../database/schema";
import { requireTeamInWorkspace } from "../utils/ownership";

async function createRelease({
  teamId,
  workspaceId,
  name,
  quarter,
  month,
  fiscalYear,
  personas,
  description,
}: {
  teamId: string;
  workspaceId: string;
  name: string;
  quarter: string;
  month: number;
  fiscalYear: number;
  personas?: string[] | null;
  description?: string | null;
}) {
  await requireTeamInWorkspace(teamId, workspaceId);

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
