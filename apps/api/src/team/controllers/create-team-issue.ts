import { and, eq, max } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import {
  columnTable,
  taskTable,
  teamTable,
  userTable,
} from "../../database/schema";
import { publishEvent } from "../../events";
import getNextTaskNumber from "../../task/controllers/get-next-task-number";
import { assertValidTaskStatus } from "../../task/validate-task-fields";

async function createTeamIssue({
  teamId,
  userId,
  title,
  description,
  columnId,
  status,
  priority,
  assigneeId,
}: {
  teamId: string;
  userId?: string;
  title: string;
  description?: string;
  columnId?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
}) {
  const team = await db.query.teamTable.findFirst({
    where: eq(teamTable.id, teamId),
  });

  if (!team) {
    throw new HTTPException(404, { message: "Team not found" });
  }

  // Validate columnId belongs to this team
  if (columnId) {
    const column = await db.query.columnTable.findFirst({
      where: eq(columnTable.id, columnId),
    });

    if (!column) {
      throw new HTTPException(400, { message: "Column not found" });
    }

    if (column.teamId !== teamId) {
      throw new HTTPException(400, {
        message: "Column does not belong to this team",
      });
    }
  }

  const resolvedStatus = status || "to-do";
  const resolvedPriority = priority || "no-priority";

  await assertValidTaskStatus(resolvedStatus, teamId);

  const effectiveAssigneeId = assigneeId || userId;

  const [assignee] = await db
    .select({ name: userTable.name })
    .from(userTable)
    .where(eq(userTable.id, effectiveAssigneeId ?? ""));

  const nextTaskNumber = await getNextTaskNumber(teamId);

  // Resolve columnId from status if not explicitly provided
  let resolvedColumnId: string | null = columnId ?? null;
  if (!resolvedColumnId) {
    const column = await db.query.columnTable.findFirst({
      where: and(
        eq(columnTable.teamId, teamId),
        eq(columnTable.slug, resolvedStatus),
      ),
    });
    resolvedColumnId = column?.id ?? null;
  }

  const [maxPositionResult] = await db
    .select({ maxPosition: max(taskTable.position) })
    .from(taskTable)
    .where(
      and(
        eq(taskTable.teamId, teamId),
        resolvedColumnId
          ? eq(taskTable.columnId, resolvedColumnId)
          : eq(taskTable.status, resolvedStatus),
      ),
    );

  const nextPosition = (maxPositionResult?.maxPosition ?? 0) + 1;

  const [createdTask] = await db
    .insert(taskTable)
    .values({
      teamId,
      projectId: null,
      userId: effectiveAssigneeId || null,
      title: title || "",
      status: resolvedStatus,
      columnId: resolvedColumnId,
      description: description || "",
      priority: resolvedPriority,
      number: nextTaskNumber + 1,
      position: nextPosition,
    })
    .returning();

  if (!createdTask) {
    throw new HTTPException(500, { message: "Failed to create issue" });
  }

  await publishEvent("task.created", {
    ...createdTask,
    taskId: createdTask.id,
    userId: createdTask.userId ?? "",
    type: "task",
    content: null,
  });

  return {
    ...createdTask,
    assigneeName: assignee?.name,
  };
}

export default createTeamIssue;
