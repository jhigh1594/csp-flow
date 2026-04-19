import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { milestoneTable } from "../../database/schema";

type UpdateMilestoneInput = {
  id: string;
  title?: string;
  targetDate?: Date;
};

async function updateMilestone({
  id,
  title,
  targetDate,
}: UpdateMilestoneInput) {
  const existing = await db.query.milestoneTable.findFirst({
    where: eq(milestoneTable.id, id),
  });

  if (!existing) {
    throw new HTTPException(404, { message: "Milestone not found" });
  }

  const [milestone] = await db
    .update(milestoneTable)
    .set({
      ...(title !== undefined ? { title } : {}),
      ...(targetDate !== undefined ? { targetDate } : {}),
    })
    .where(eq(milestoneTable.id, id))
    .returning();

  return milestone;
}

export default updateMilestone;
