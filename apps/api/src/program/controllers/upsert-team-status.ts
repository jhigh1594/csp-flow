import { and, eq, lt } from "drizzle-orm";
import db from "../../database";
import {
  demandTable,
  riskTable,
  roadmapReleaseTable,
  weeklyStatusSnapshotTable,
  weeklyStatusTable,
} from "../../database/schema";
import { getCurrentWeekStart, subtractWeeks } from "../utils/week";

async function upsertTeamStatus({
  teamId,
  workspaceId,
  health,
  accomplishments,
  nextWeekFocus,
  leadershipAsks,
}: {
  teamId: string;
  workspaceId: string;
  health: string;
  accomplishments?: string | null;
  nextWeekFocus?: string | null;
  leadershipAsks?: string | null;
}) {
  const weekStart = getCurrentWeekStart();

  const [status] = await db
    .insert(weeklyStatusTable)
    .values({
      teamId,
      workspaceId,
      weekStart,
      health,
      accomplishments: accomplishments ?? null,
      nextWeekFocus: nextWeekFocus ?? null,
      leadershipAsks: leadershipAsks ?? null,
    })
    .onConflictDoUpdate({
      target: [weeklyStatusTable.teamId, weeklyStatusTable.weekStart],
      set: {
        health,
        accomplishments: accomplishments ?? null,
        nextWeekFocus: nextWeekFocus ?? null,
        leadershipAsks: leadershipAsks ?? null,
        updatedAt: new Date(),
      },
    })
    .returning();

  // Snapshot logic: only create snapshot if one doesn't exist for this week
  const [existingSnapshot] = await db
    .select({ id: weeklyStatusSnapshotTable.id })
    .from(weeklyStatusSnapshotTable)
    .where(
      and(
        eq(weeklyStatusSnapshotTable.teamId, teamId),
        eq(weeklyStatusSnapshotTable.weekStart, weekStart),
      ),
    )
    .limit(1);

  if (!existingSnapshot) {
    // Fetch full state for snapshot
    const [fullStatus] = await db
      .select()
      .from(weeklyStatusTable)
      .where(
        and(
          eq(weeklyStatusTable.teamId, teamId),
          eq(weeklyStatusTable.weekStart, weekStart),
        ),
      )
      .limit(1);

    const demands = await db
      .select()
      .from(demandTable)
      .where(eq(demandTable.teamId, teamId));

    const risks = await db
      .select()
      .from(riskTable)
      .where(eq(riskTable.teamId, teamId));

    const releases = await db
      .select()
      .from(roadmapReleaseTable)
      .where(eq(roadmapReleaseTable.teamId, teamId));

    const snapshot = {
      status: fullStatus ?? null,
      demands,
      risks,
      releases,
    };

    await db.insert(weeklyStatusSnapshotTable).values({
      teamId,
      workspaceId,
      weekStart,
      snapshot,
    });
  }

  // Delete snapshots older than 4 weeks
  const cutoff = subtractWeeks(weekStart, 4);
  await db
    .delete(weeklyStatusSnapshotTable)
    .where(
      and(
        eq(weeklyStatusSnapshotTable.teamId, teamId),
        lt(weeklyStatusSnapshotTable.weekStart, cutoff),
      ),
    );

  return status;
}

export default upsertTeamStatus;
