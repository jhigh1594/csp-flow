import { createId } from "@paralleldrive/cuid2";
import { asc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { columnTable, teamTable } from "../../database/schema";

const DEFAULT_COLUMNS = [
  { name: "To Do", slug: "to-do", position: 0, isFinal: false },
  { name: "In Progress", slug: "in-progress", position: 1, isFinal: false },
  { name: "In Review", slug: "in-review", position: 2, isFinal: false },
  { name: "Done", slug: "done", position: 3, isFinal: true },
];

async function getTeamColumns(teamId: string) {
  const team = await db.query.teamTable.findFirst({
    where: eq(teamTable.id, teamId),
  });

  if (!team) {
    throw new HTTPException(404, { message: "Team not found" });
  }

  let columns = await db
    .select()
    .from(columnTable)
    .where(eq(columnTable.teamId, teamId))
    .orderBy(asc(columnTable.position));

  if (columns.length === 0) {
    const now = new Date();
    await db.insert(columnTable).values(
      DEFAULT_COLUMNS.map((col) => ({
        id: createId(),
        teamId,
        name: col.name,
        slug: col.slug,
        position: col.position,
        isFinal: col.isFinal,
        createdAt: now,
        updatedAt: now,
      })),
    );

    columns = await db
      .select()
      .from(columnTable)
      .where(eq(columnTable.teamId, teamId))
      .orderBy(asc(columnTable.position));
  }

  return columns;
}

export default getTeamColumns;
