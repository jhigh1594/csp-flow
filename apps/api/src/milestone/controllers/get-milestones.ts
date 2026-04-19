import { asc, count, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { milestoneTable, projectTable, taskTable } from "../../database/schema";

async function getMilestones(projectId: string) {
  const project = await db.query.projectTable.findFirst({
    where: eq(projectTable.id, projectId),
  });

  if (!project) {
    throw new HTTPException(404, { message: "Project not found" });
  }

  const milestones = await db
    .select()
    .from(milestoneTable)
    .where(eq(milestoneTable.projectId, projectId))
    .orderBy(asc(milestoneTable.targetDate));

  if (milestones.length === 0) return [];

  const milestoneIds = milestones.map((m) => m.id);

  const taskCounts = await db
    .select({
      milestoneId: taskTable.milestoneId,
      totalTasks: count(taskTable.id).as("total_tasks"),
      completedTasks:
        sql<number>`count(case when ${taskTable.status} = 'done' then 1 end)`.as(
          "completed_tasks",
        ),
    })
    .from(taskTable)
    .where(sql`${taskTable.milestoneId} = any(${milestoneIds})`)
    .groupBy(taskTable.milestoneId);

  const countMap = new Map(taskCounts.map((r) => [r.milestoneId, r]));

  return milestones.map((milestone) => {
    const counts = countMap.get(milestone.id);
    return {
      ...milestone,
      totalTasks: counts?.totalTasks ?? 0,
      completedTasks: counts?.completedTasks ?? 0,
    };
  });
}

export default getMilestones;
