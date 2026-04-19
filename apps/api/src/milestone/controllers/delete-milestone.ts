import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { milestoneTable } from "../../database/schema";

async function deleteMilestone(id: string) {
  const existing = await db.query.milestoneTable.findFirst({
    where: eq(milestoneTable.id, id),
  });

  if (!existing) {
    throw new HTTPException(404, { message: "Milestone not found" });
  }

  await db.delete(milestoneTable).where(eq(milestoneTable.id, id));

  return { success: true };
}

export default deleteMilestone;
