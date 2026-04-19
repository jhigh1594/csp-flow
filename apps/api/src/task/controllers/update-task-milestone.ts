import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { milestoneTable, taskTable } from "../../database/schema";

async function updateTaskMilestone({
  id,
  milestoneId,
}: {
  id: string;
  milestoneId: string | null;
}) {
  const existingTask = await db.query.taskTable.findFirst({
    where: eq(taskTable.id, id),
  });

  if (!existingTask) {
    throw new HTTPException(404, { message: "Task not found" });
  }

  if (milestoneId) {
    const milestone = await db.query.milestoneTable.findFirst({
      where: eq(milestoneTable.id, milestoneId),
    });

    if (!milestone) {
      throw new HTTPException(400, { message: "Milestone not found" });
    }

    if (milestone.projectId !== existingTask.projectId) {
      throw new HTTPException(400, {
        message: "Milestone does not belong to the same project",
      });
    }
  }

  const [updatedTask] = await db
    .update(taskTable)
    .set({ milestoneId: milestoneId ?? null })
    .where(eq(taskTable.id, id))
    .returning();

  if (!updatedTask) {
    throw new HTTPException(500, {
      message: "Failed to update task milestone",
    });
  }

  return updatedTask;
}

export default updateTaskMilestone;
