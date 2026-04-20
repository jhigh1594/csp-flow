import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { columnTable, teamTable } from "../../database/schema";

async function reorderTeamColumns(
  teamId: string,
  columns: Array<{ id: string; position: number }>,
) {
  const team = await db.query.teamTable.findFirst({
    where: eq(teamTable.id, teamId),
  });

  if (!team) {
    throw new HTTPException(404, { message: "Team not found" });
  }

  for (const col of columns) {
    const [updated] = await db
      .update(columnTable)
      .set({ position: col.position })
      .where(and(eq(columnTable.id, col.id), eq(columnTable.teamId, teamId)))
      .returning({ id: columnTable.id });

    if (!updated) {
      throw new HTTPException(400, {
        message: `Column ${col.id} does not belong to this team`,
      });
    }
  }

  return db.query.columnTable.findMany({
    where: eq(columnTable.teamId, teamId),
    orderBy: (cols, { asc }) => [asc(cols.position)],
  });
}

export default reorderTeamColumns;
