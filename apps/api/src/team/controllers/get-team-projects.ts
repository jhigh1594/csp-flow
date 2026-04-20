import { eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable, teamTable } from "../../database/schema";

async function getTeamProjects(teamId: string) {
  const team = await db.query.teamTable.findFirst({
    where: eq(teamTable.id, teamId),
  });

  if (!team) {
    throw new HTTPException(404, { message: "Team not found" });
  }

  const projects = await db
    .select()
    .from(projectTable)
    .where(eq(projectTable.teamId, teamId));

  return projects;
}

export default getTeamProjects;
