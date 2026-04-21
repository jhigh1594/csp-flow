import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { teamTable } from "../../database/schema";

async function deleteTeam(teamId: string) {
  const [deletedTeam] = await db
    .delete(teamTable)
    .where(eq(teamTable.id, teamId))
    .returning();

  if (!deletedTeam) {
    throw new HTTPException(404, { message: "Team not found" });
  }

  return deletedTeam;
}

export default deleteTeam;
