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

function diffDemands(
  fromDemands: SnapshotDemand[],
  toDemands: SnapshotDemand[],
) {
  const fromMap = new Map(fromDemands.map((d) => [d.name, d]));
  const toMap = new Map(toDemands.map((d) => [d.name, d]));

  const added: string[] = [];
  const removed: string[] = [];
  const changed: { name: string; dateShifts: Record<string, { from: string | null; to: string | null }> }[] = [];

  for (const [name, toDemand] of toMap) {
    if (!fromMap.has(name)) {
      added.push(name);
    } else {
      const fromDemand = fromMap.get(name)!;
      const dateShifts: Record<string, { from: string | null; to: string | null }> = {};
      for (const key of DEMAND_DATE_KEYS) {
        const fromVal = (fromDemand[key] as string | null | undefined) ?? null;
        const toVal = (toDemand[key] as string | null | undefined) ?? null;
        if (fromVal !== toVal) {
          dateShifts[key] = { from: fromVal, to: toVal };
        }
      }
      if (Object.keys(dateShifts).length > 0) {
        changed.push({ name, dateShifts });
      }
    }
  }

  for (const [name] of fromMap) {
    if (!toMap.has(name)) {
      removed.push(name);
    }
  }

  return { added, removed, changed };
}

function diffRisks(fromRisks: SnapshotRisk[], toRisks: SnapshotRisk[]) {
  const fromMap = new Map(fromRisks.map((r) => [r.id, r]));
  const toMap = new Map(toRisks.map((r) => [r.id, r]));

  const newRisks: string[] = [];
  const statusChanged: { description: string; from: string; to: string }[] = [];
  const closed: string[] = [];

  for (const [id, toRisk] of toMap) {
    if (!fromMap.has(id)) {
      newRisks.push(toRisk.description);
    } else {
      const fromRisk = fromMap.get(id)!;
      if (fromRisk.status !== toRisk.status) {
        statusChanged.push({
          description: toRisk.description,
          from: fromRisk.status,
          to: toRisk.status,
        });
        if (toRisk.status === "closed") {
          closed.push(toRisk.description);
        }
      }
    }
  }

  return { new: newRisks, statusChanged, closed };
}

function diffReleases(
  fromReleases: SnapshotRelease[],
  toReleases: SnapshotRelease[],
) {
  const fromMap = new Map(fromReleases.map((r) => [r.id, r]));
  const toMap = new Map(toReleases.map((r) => [r.id, r]));

  const added: string[] = [];
  const removed: string[] = [];
  const moved: { name: string; from: { quarter: string; month: number; fiscalYear: number }; to: { quarter: string; month: number; fiscalYear: number } }[] = [];

  for (const [id, toRelease] of toMap) {
    if (!fromMap.has(id)) {
      added.push(toRelease.name);
    } else {
      const fromRelease = fromMap.get(id)!;
      if (
        fromRelease.quarter !== toRelease.quarter ||
        fromRelease.month !== toRelease.month ||
        fromRelease.fiscalYear !== toRelease.fiscalYear
      ) {
        moved.push({
          name: toRelease.name,
          from: {
            quarter: fromRelease.quarter,
            month: fromRelease.month,
            fiscalYear: fromRelease.fiscalYear,
          },
          to: {
            quarter: toRelease.quarter,
            month: toRelease.month,
            fiscalYear: toRelease.fiscalYear,
          },
        });
      }
    }
  }

  for (const [id, fromRelease] of fromMap) {
    if (!toMap.has(id)) {
      removed.push(fromRelease.name);
    }
  }

  return { added, removed, moved };
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
