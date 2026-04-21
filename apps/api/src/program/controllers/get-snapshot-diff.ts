import { and, eq, inArray } from "drizzle-orm";
import db from "../../database";
import { weeklyStatusSnapshotTable } from "../../database/schema";
import {
  diffDemands,
  diffReleases,
  diffRisks,
  type SnapshotDemand,
  type SnapshotRelease,
  type SnapshotRisk,
} from "../utils/diff";

type SnapshotStatus = {
  health?: string;
  accomplishments?: string | null;
  nextWeekFocus?: string | null;
  leadershipAsks?: string | null;
};

type Snapshot = {
  status?: SnapshotStatus | null;
  demands?: SnapshotDemand[];
  risks?: SnapshotRisk[];
  releases?: SnapshotRelease[];
};

async function getSnapshotDiff({
  workspaceId,
  fromWeek,
  toWeek,
}: {
  workspaceId: string;
  fromWeek: string;
  toWeek: string;
}) {
  const snapshots = await db
    .select()
    .from(weeklyStatusSnapshotTable)
    .where(
      and(
        eq(weeklyStatusSnapshotTable.workspaceId, workspaceId),
        inArray(weeklyStatusSnapshotTable.weekStart, [fromWeek, toWeek]),
      ),
    );

  const fromSnaps = new Map<string, Snapshot>();
  const toSnaps = new Map<string, Snapshot>();
  const allTeamIds = new Set<string>();

  for (const snap of snapshots) {
    allTeamIds.add(snap.teamId);
    if (snap.weekStart === fromWeek) {
      fromSnaps.set(snap.teamId, snap.snapshot as Snapshot);
    } else if (snap.weekStart === toWeek) {
      toSnaps.set(snap.teamId, snap.snapshot as Snapshot);
    }
  }

  const results = [];

  for (const teamId of allTeamIds) {
    const toSnap = toSnaps.get(teamId);
    const fromSnap = fromSnaps.get(teamId);

    if (!toSnap) {
      results.push({ teamId, notUpdated: true });
      continue;
    }

    const toStatus = toSnap.status;
    const fromStatus = fromSnap?.status ?? null;

    const ragChange =
      toStatus?.health !== fromStatus?.health
        ? { from: fromStatus?.health ?? null, to: toStatus?.health ?? null }
        : null;

    const textUpdated =
      fromStatus?.accomplishments !== toStatus?.accomplishments ||
      fromStatus?.nextWeekFocus !== toStatus?.nextWeekFocus ||
      fromStatus?.leadershipAsks !== toStatus?.leadershipAsks;

    const demandDiffs = diffDemands(
      fromSnap?.demands ?? [],
      toSnap?.demands ?? [],
    );

    const riskDiffs = diffRisks(fromSnap?.risks ?? [], toSnap?.risks ?? []);

    const roadmapDiffs = diffReleases(
      fromSnap?.releases ?? [],
      toSnap?.releases ?? [],
    );

    results.push({
      teamId,
      notUpdated: false,
      ragChange,
      textUpdated,
      demandDiffs,
      riskDiffs,
      roadmapDiffs,
    });
  }

  return results;
}

export default getSnapshotDiff;
