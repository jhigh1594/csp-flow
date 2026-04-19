import { asc, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { milestoneTable, taskTable, userTable } from "../../database/schema";

async function getMilestoneTasks(milestoneId: string) {
  const milestone = await db.query.milestoneTable.findFirst({
    where: eq(milestoneTable.id, milestoneId),
  });

  if (!milestone) {
    throw new HTTPException(404, { message: "Milestone not found" });
  }

  const tasks = await db
    .select({
      id: taskTable.id,
      title: taskTable.title,
      number: taskTable.number,
      status: taskTable.status,
      priority: taskTable.priority,
      dueDate: taskTable.dueDate,
      startDate: taskTable.startDate,
      projectId: taskTable.projectId,
      milestoneId: taskTable.milestoneId,
      userId: taskTable.userId,
      assigneeName: userTable.name,
      assigneeId: userTable.id,
      assigneeImage: userTable.image,
      createdAt: taskTable.createdAt,
    })
    .from(taskTable)
    .leftJoin(userTable, eq(taskTable.userId, userTable.id))
    .where(eq(taskTable.milestoneId, milestoneId))
    .orderBy(asc(taskTable.createdAt));

  return tasks;
}

export default getMilestoneTasks;
