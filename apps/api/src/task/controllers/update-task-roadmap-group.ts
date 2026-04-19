import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { taskTable } from "../../database/schema";

async function updateTaskRoadmapGroup({
  id,
  roadmapGroup,
}: {
  id: string;
  roadmapGroup: string | null;
}) {
  const existingTask = await db.query.taskTable.findFirst({
    where: eq(taskTable.id, id),
  });

  if (!existingTask) {
    throw new HTTPException(404, {
      message: "Task not found",
    });
  }

  const [updatedTask] = await db
    .update(taskTable)
    .set({ roadmapGroup })
    .where(eq(taskTable.id, id))
    .returning();

  if (!updatedTask) {
    throw new HTTPException(500, {
      message: "Failed to update task roadmap group",
    });
  }

  return updatedTask;
}

export default updateTaskRoadmapGroup;
