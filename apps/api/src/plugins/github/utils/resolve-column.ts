import { and, asc, eq } from "drizzle-orm";
import db from "../../../database";
import {
  columnTable,
  projectTable,
  workflowRuleTable,
} from "../../../database/schema";

export async function resolveTargetStatus(
  projectId: string,
  eventType: string,
  fallbackStatus: string,
): Promise<string> {
  const project = await db.query.projectTable.findFirst({
    where: eq(projectTable.id, projectId),
  });

  if (!project) {
    return fallbackStatus;
  }

  const projectColumns = await db
    .select({
      id: columnTable.id,
      slug: columnTable.slug,
    })
    .from(columnTable)
    .where(eq(columnTable.teamId, project.teamId))
    .orderBy(asc(columnTable.position));

  if (projectColumns.length === 0) {
    return fallbackStatus;
  }

  const rule = await db.query.workflowRuleTable.findFirst({
    where: and(
      eq(workflowRuleTable.projectId, projectId),
      eq(workflowRuleTable.integrationType, "github"),
      eq(workflowRuleTable.eventType, eventType),
    ),
  });

  if (rule) {
    const mappedColumn = projectColumns.find(
      (column) => column.id === rule.columnId,
    );
    if (mappedColumn) {
      return mappedColumn.slug;
    }
  }

  const fallbackColumn = projectColumns.find(
    (column) => column.slug === fallbackStatus,
  );
  if (fallbackColumn) {
    return fallbackColumn.slug;
  }

  return projectColumns[0]?.slug ?? fallbackStatus;
}
