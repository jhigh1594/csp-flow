import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { columnTable, taskTable } from "../../database/schema";
import { generateAndStoreEmbedding } from "../../embeddings/upsert-task-embedding";
import { assertValidTaskStatus } from "../validate-task-fields";

async function updateTask(
  id: string,
  title: string,
  status: string,
  startDate: Date | undefined,
  dueDate: Date | undefined,
  projectId: string | null,
  description: string,
  priority: string,
  position: number,
  userId?: string,
  roadmapGroup?: string | null,
) {
  const existingTask = await db.query.taskTable.findFirst({
    where: eq(taskTable.id, id),
  });

  if (!existingTask) {
    throw new HTTPException(404, {
      message: "Task not found",
    });
  }

  await assertValidTaskStatus(status, existingTask.teamId);

  const column = await db.query.columnTable.findFirst({
    where: and(
      eq(columnTable.teamId, existingTask.teamId),
      eq(columnTable.slug, status),
    ),
  });

  const [updatedTask] = await db
    .update(taskTable)
    .set({
      title,
      status,
      columnId: column?.id ?? null,
      startDate: startDate || null,
      dueDate: dueDate || null,
      projectId,
      description,
      priority,
      position,
      userId: userId || null,
      roadmapGroup:
        roadmapGroup !== undefined ? roadmapGroup : existingTask.roadmapGroup,
    })
    .where(eq(taskTable.id, id))
    .returning();

  if (!updatedTask) {
    throw new HTTPException(500, {
      message: "Failed to update task",
    });
  }

  if (
    title !== existingTask.title ||
    description !== existingTask.description
  ) {
    generateAndStoreEmbedding(
      updatedTask.id,
      updatedTask.title,
      updatedTask.description,
    ).catch((err) =>
      console.error(`[embedding] failed to embed task ${updatedTask.id}:`, err),
    );
  }

  return updatedTask;
}

export default updateTask;
