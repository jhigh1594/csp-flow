import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { taskTable } from "../../database/schema";
import { generateAndStoreEmbedding } from "../../embeddings/upsert-task-embedding";

async function updateTaskTitle({ id, title }: { id: string; title: string }) {
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
    .set({ title })
    .where(eq(taskTable.id, id))
    .returning();

  if (!updatedTask) {
    throw new HTTPException(500, {
      message: "Failed to update task title",
    });
  }

  generateAndStoreEmbedding(
    updatedTask.id,
    updatedTask.title,
    updatedTask.description,
  ).catch((err) =>
    console.error(`[embedding] failed to embed task ${updatedTask.id}:`, err),
  );

  return updatedTask;
}

export default updateTaskTitle;
