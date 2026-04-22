import db from "../database";
import { taskEmbeddingTable } from "../database/schema";
import { generateEmbedding } from "./generate";

const EMBEDDING_MODEL_TAG = "text-embedding-3-small-512";

export async function generateAndStoreEmbedding(
  taskId: string,
  title: string,
  description: string | null | undefined,
): Promise<void> {
  const input = [title, description].filter(Boolean).join(" ").trim();
  const embedding = await generateEmbedding(input);
  if (!embedding) return;

  await db
    .insert(taskEmbeddingTable)
    .values({
      taskId,
      embedding,
      embeddingModel: EMBEDDING_MODEL_TAG,
    })
    .onConflictDoUpdate({
      target: taskEmbeddingTable.taskId,
      set: {
        embedding,
        embeddingModel: EMBEDDING_MODEL_TAG,
        updatedAt: new Date(),
      },
    });
}
