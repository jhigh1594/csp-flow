import { eq, isNull } from "drizzle-orm";
import db from "../database";
import { taskEmbeddingTable, taskTable } from "../database/schema";
import { generateAndStoreEmbedding } from "./upsert-task-embedding";

const BATCH_SIZE = 50;

export async function backfillTaskEmbeddings(): Promise<void> {
  const tasks = await db
    .select({
      id: taskTable.id,
      title: taskTable.title,
      description: taskTable.description,
    })
    .from(taskTable)
    .leftJoin(taskEmbeddingTable, eq(taskTable.id, taskEmbeddingTable.taskId))
    .where(isNull(taskEmbeddingTable.taskId))
    .limit(BATCH_SIZE);

  if (tasks.length === 0) return;

  for (const task of tasks) {
    await generateAndStoreEmbedding(
      task.id,
      task.title,
      task.description,
    ).catch((err) =>
      console.error(`[backfill] failed to embed task ${task.id}:`, err),
    );
  }

  console.log(`[backfill] embedded ${tasks.length} task(s)`);
}
