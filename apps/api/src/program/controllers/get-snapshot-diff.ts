import { and, eq, inArray } from "drizzle-orm";
import db from "../../database";
import { weeklyStatusSnapshotTable } from "../../database/schema";

type SnapshotStatus = {
  health?: string;
  accomplishments?: string | null;
  nextWeekFocus?: string | null;
  leadershipAsks?: string | null;
};

type SnapshotDemand = {
  id: string;
  name: string;
  businessPartnershipDate?: string | null;
  discoveryDate?: string | null;
  requirementsDate?: string | null;
  demandSubmissionDate?: string | null;
  developmentDate?: string | null;
  uatDate?: string | null;
  goLiveDate?: string | null;
  adoptionDate?: string | null;
};

type SnapshotRisk = {
  id: string;
  description: string;
  status: string;
};

type SnapshotRelease = {
  id: string;
  name: string;
  quarter: string;
  month: number;
  fiscalYear: number;
};

type Snapshot = {
  status?: SnapshotStatus | null;
  demands?: SnapshotDemand[];
  risks?: SnapshotRisk[];
  releases?: SnapshotRelease[];
};

const DEMAND_DATE_KEYS: (keyof SnapshotDemand)[] = [
  "businessPartnershipDate",
  "discoveryDate",
  "requirementsDate",
  "demandSubmissionDate",
  "developmentDate",
  "uatDate",
  "goLiveDate",
  "adoptionDate",
];

type DemandDiffItem = {
  type: "added" | "removed" | "changed";
  name: string;
  dateChanges?: Record<string, { from: string | null; to: string | null }>;
};

type RiskDiffItem = {
  type: "new" | "statusChanged" | "closed";
  description: string;
  from?: string;
  to?: string;
};

type RoadmapDiffItem = {
  type: "added" | "removed" | "moved";
  name: string;
  from?: string;
  to?: string;
};

function diffDemands(
  fromDemands: SnapshotDemand[],
  toDemands: SnapshotDemand[],
): DemandDiffItem[] {
  const fromMap = new Map(fromDemands.map((d) => [d.id, d]));
  const toMap = new Map(toDemands.map((d) => [d.id, d]));

  const result: DemandDiffItem[] = [];

  for (const [id, toDemand] of toMap) {
    if (!fromMap.has(id)) {
      result.push({ type: "added", name: toDemand.name });
    } else {
      const fromDemand = fromMap.get(id)!;
      const dateChanges: Record<string, { from: string | null; to: string | null }> = {};
      for (const key of DEMAND_DATE_KEYS) {
        const fromVal = (fromDemand[key] as string | null | undefined) ?? null;
        const toVal = (toDemand[key] as string | null | undefined) ?? null;
        if (fromVal !== toVal) {
          dateChanges[key] = { from: fromVal, to: toVal };
        }
      }
      if (Object.keys(dateChanges).length > 0) {
        result.push({ type: "changed", name: toDemand.name, dateChanges });
      }
    }
  }

  for (const [id, fromDemand] of fromMap) {
    if (!toMap.has(id)) {
      result.push({ type: "removed", name: fromDemand.name });
    }
  }

  return result;
}

function diffRisks(fromRisks: SnapshotRisk[], toRisks: SnapshotRisk[]): RiskDiffItem[] {
  const fromMap = new Map(fromRisks.map((r) => [r.id, r]));
  const toMap = new Map(toRisks.map((r) => [r.id, r]));

  const result: RiskDiffItem[] = [];

  for (const [id, toRisk] of toMap) {
    if (!fromMap.has(id)) {
      result.push({ type: "new", description: toRisk.description });
    } else {
      const fromRisk = fromMap.get(id)!;
      if (fromRisk.status !== toRisk.status) {
        if (toRisk.status === "closed") {
          result.push({ type: "closed", description: toRisk.description, from: fromRisk.status, to: toRisk.status });
        } else {
          result.push({ type: "statusChanged", description: toRisk.description, from: fromRisk.status, to: toRisk.status });
        }
      }
    }
  }

  return result;
}

function diffReleases(
  fromReleases: SnapshotRelease[],
  toReleases: SnapshotRelease[],
): RoadmapDiffItem[] {
  const fromMap = new Map(fromReleases.map((r) => [r.id, r]));
  const toMap = new Map(toReleases.map((r) => [r.id, r]));

  const result: RoadmapDiffItem[] = [];

  for (const [id, toRelease] of toMap) {
    if (!fromMap.has(id)) {
      result.push({ type: "added", name: toRelease.name });
    } else {
      const fromRelease = fromMap.get(id)!;
      if (
        fromRelease.quarter !== toRelease.quarter ||
        fromRelease.month !== toRelease.month ||
        fromRelease.fiscalYear !== toRelease.fiscalYear
      ) {
        result.push({
          type: "moved",
          name: toRelease.name,
          from: `${fromRelease.quarter.toUpperCase()} ${fromRelease.fiscalYear}`,
          to: `${toRelease.quarter.toUpperCase()} ${toRelease.fiscalYear}`,
        });
      }
    }
  }

  for (const [id, fromRelease] of fromMap) {
    if (!toMap.has(id)) {
      result.push({ type: "removed", name: fromRelease.name });
    }
  }

  return result;
}

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

  // Build maps: teamId -> { fromSnap?, toSnap? }
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

    const riskDiffs = diffRisks(
      fromSnap?.risks ?? [],
      toSnap?.risks ?? [],
    );

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
