import { and, eq, sql } from "drizzle-orm";
import db from "../../database";
import {
  projectTable,
  taskEmbeddingTable,
  taskTable,
} from "../../database/schema";
import { generateEmbedding } from "../../embeddings/generate";

type SemanticSearchParams = {
  query: string;
  workspaceId?: string;
  projectId?: string;
  limit?: number;
};

type SemanticSearchResult = {
  taskId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  projectId: string | null;
  similarity: number;
};

export async function semanticSearch({
  query,
  workspaceId,
  projectId,
  limit = 10,
}: SemanticSearchParams): Promise<SemanticSearchResult[]> {
  const embedding = await generateEmbedding(query);
  if (!embedding) return [];

  const vectorLiteral = `[${embedding.join(",")}]`;

  const conditions = [];
  if (projectId) {
    conditions.push(eq(taskTable.projectId, projectId));
  } else if (workspaceId) {
    conditions.push(eq(projectTable.workspaceId, workspaceId));
  }

  const rows = await db
    .select({
      taskId: taskEmbeddingTable.taskId,
      title: taskTable.title,
      description: taskTable.description,
      status: taskTable.status,
      priority: taskTable.priority,
      projectId: taskTable.projectId,
      distance:
        sql<number>`${taskEmbeddingTable.embedding} <=> ${vectorLiteral}::vector`.as(
          "distance",
        ),
    })
    .from(taskEmbeddingTable)
    .innerJoin(taskTable, eq(taskTable.id, taskEmbeddingTable.taskId))
    .innerJoin(projectTable, eq(projectTable.id, taskTable.projectId))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(sql`${taskEmbeddingTable.embedding} <=> ${vectorLiteral}::vector`)
    .limit(limit);

  return rows.map((row) => ({
    taskId: row.taskId,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    projectId: row.projectId,
    similarity: 1 - row.distance,
  }));
}
