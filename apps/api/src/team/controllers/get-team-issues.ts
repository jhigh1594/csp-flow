import { and, asc, eq, gt } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { taskTable, teamTable } from "../../database/schema";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

async function getTeamIssues(teamId: string, cursor?: string, limit?: number) {
  const team = await db.query.teamTable.findFirst({
    where: eq(teamTable.id, teamId),
  });

  if (!team) {
    throw new HTTPException(404, { message: "Team not found" });
  }

  const resolvedLimit = Math.min(limit ?? DEFAULT_LIMIT, MAX_LIMIT);

  const conditions = cursor
    ? and(eq(taskTable.teamId, teamId), gt(taskTable.id, cursor))
    : eq(taskTable.teamId, teamId);

  const tasks = await db
    .select()
    .from(taskTable)
    .where(conditions)
    .orderBy(asc(taskTable.position), asc(taskTable.id))
    .limit(resolvedLimit);

  return tasks;
}

export default getTeamIssues;
