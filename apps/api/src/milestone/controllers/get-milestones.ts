import { asc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { milestoneTable, projectTable } from "../../database/schema";

async function getMilestones(projectId: string) {
  const project = await db.query.projectTable.findFirst({
    where: eq(projectTable.id, projectId),
  });

  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  return db
    .select()
    .from(milestoneTable)
    .where(eq(milestoneTable.projectId, projectId))
    .orderBy(asc(milestoneTable.targetDate));
}

export default getMilestones;
