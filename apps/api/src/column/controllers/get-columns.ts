import { asc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { columnTable, projectTable } from "../../database/schema";

async function getColumns(projectId: string) {
  const project = await db.query.projectTable.findFirst({
    where: eq(projectTable.id, projectId),
  });

  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  const columns = await db
    .select()
    .from(columnTable)
    .where(eq(columnTable.teamId, project.teamId))
    .orderBy(asc(columnTable.position));

  return columns;
}

export default getColumns;
