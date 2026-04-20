import { asc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { columnTable, teamTable } from "../../database/schema";

async function getTeamColumns(teamId: string) {
  const team = await db.query.teamTable.findFirst({
    where: eq(teamTable.id, teamId),
  });

  if (!team) {
    throw new HTTPException(404, { message: "Team not found" });
  }

  const columns = await db
    .select()
    .from(columnTable)
    .where(eq(columnTable.teamId, teamId))
    .orderBy(asc(columnTable.position));

  return columns;
}

export default getTeamColumns;
