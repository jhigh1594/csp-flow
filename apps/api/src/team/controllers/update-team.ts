import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { teamTable } from "../../database/schema";

async function updateTeam(
  teamId: string,
  data: { name?: string; identifier?: string },
) {
  const [existing] = await db
    .select()
    .from(teamTable)
    .where(eq(teamTable.id, teamId));

  if (!existing) {
    throw new HTTPException(404, { message: "Team not found" });
  }

  const [updated] = await db
    .update(teamTable)
    .set({
      ...(data.name !== undefined && { name: data.name }),
      ...(data.identifier !== undefined && { identifier: data.identifier }),
    })
    .where(eq(teamTable.id, teamId))
    .returning();

  return updated;
}

export default updateTeam;
