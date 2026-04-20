export type SnapshotDemand = {
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

export type SnapshotRisk = {
  id: string;
  description: string;
  status: string;
};

export type SnapshotRelease = {
  id: string;
  name: string;
  quarter: string;
  month: number;
  fiscalYear: number;
};

export type DemandDiffItem = {
  type: "added" | "removed" | "changed";
  name: string;
  dateChanges?: Record<string, { from: string | null; to: string | null }>;
};

export type RiskDiffItem = {
  type: "new" | "statusChanged" | "closed";
  description: string;
  from?: string;
  to?: string;
};

export type RoadmapDiffItem = {
  type: "added" | "removed" | "moved";
  name: string;
  from?: string;
  to?: string;
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

export function diffDemands(
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

export function diffRisks(
  fromRisks: SnapshotRisk[],
  toRisks: SnapshotRisk[],
): RiskDiffItem[] {
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
          result.push({
            type: "closed",
            description: toRisk.description,
            from: fromRisk.status,
            to: toRisk.status,
          });
        } else {
          result.push({
            type: "statusChanged",
            description: toRisk.description,
            from: fromRisk.status,
            to: toRisk.status,
          });
        }
      }
    }
  }

  return result;
}

export function diffReleases(
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
