import { desc, eq } from "drizzle-orm";
import db from "../../database";
import { weeklyStatusSnapshotTable } from "../../database/schema";

async function getSnapshotWeeks(workspaceId: string) {
  const rows = await db
    .selectDistinct({ weekStart: weeklyStatusSnapshotTable.weekStart })
    .from(weeklyStatusSnapshotTable)
    .where(eq(weeklyStatusSnapshotTable.workspaceId, workspaceId))
    .orderBy(desc(weeklyStatusSnapshotTable.weekStart));

  return rows.map((r) => r.weekStart);
}

export default getSnapshotWeeks;
