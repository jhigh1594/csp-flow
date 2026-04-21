import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import WorkspaceLayout from "@/components/common/workspace-layout";
import PageTitle from "@/components/page-title";
import ProgramNav from "@/components/program/program-nav";
import { Skeleton } from "@/components/ui/skeleton";
import useGetSnapshotDiff from "@/hooks/queries/program/use-get-snapshot-diff";
import useGetSnapshotWeeks from "@/hooks/queries/program/use-get-snapshot-weeks";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/program/week-over-week/",
)({ component: RouteComponent });

type DemandDiff = {
  type: "added" | "removed" | "changed";
  name: string;
  dateChanges?: Record<string, { from: string | null; to: string | null }>;
};

type RiskDiff = {
  type: "new" | "statusChanged" | "closed";
  description: string;
  from?: string;
  to?: string;
};

type RoadmapDiff = {
  type: "added" | "removed" | "moved";
  name: string;
  from?: string;
  to?: string;
};

type TeamDiff = {
  teamId: string;
  teamName?: string;
  notUpdated?: boolean;
  ragChange?: { from: string; to: string } | null;
  textUpdated?: boolean;
  demandDiffs?: DemandDiff[];
  riskDiffs?: RiskDiff[];
  roadmapDiffs?: RoadmapDiff[];
};

function formatWeekLabel(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function RagChangeLabel({ from, to }: { from: string; to: string }) {
  const colorMap: Record<string, string> = {
    green: "text-green-700",
    amber: "text-amber-700",
    red: "text-red-700",
  };

  const emojiMap: Record<string, string> = {
    green: "🟢",
    amber: "🟡",
    red: "🔴",
  };

  return (
    <span className="text-sm font-medium">
      <span className={colorMap[from] ?? "text-muted-foreground"}>
        {emojiMap[from] ?? from}
      </span>
      <span className="mx-1 text-muted-foreground">→</span>
      <span className={colorMap[to] ?? "text-muted-foreground"}>
        {emojiMap[to] ?? to}
      </span>
    </span>
  );
}

function DemandDiffRow({ diff }: { diff: DemandDiff }) {
  const prefixMap = { added: "+", removed: "-", changed: "~" } as const;
  const colorMap = {
    added: "text-green-700",
    removed: "text-red-700",
    changed: "text-amber-700",
  } as const;

  return (
    <li className={`text-sm ${colorMap[diff.type]}`}>
      <span className="font-mono font-bold mr-1">{prefixMap[diff.type]}</span>
      {diff.name}
      {diff.dateChanges && diff.type === "changed" && (
        <span className="ml-1 text-xs text-muted-foreground">
          (dates changed)
        </span>
      )}
    </li>
  );
}

function RiskDiffRow({ diff }: { diff: RiskDiff }) {
  const colorMap = {
    new: "text-green-700",
    statusChanged: "text-amber-700",
    closed: "text-red-700",
  } as const;

  const prefixMap = { new: "+", statusChanged: "~", closed: "-" } as const;

  return (
    <li className={`text-sm ${colorMap[diff.type]}`}>
      <span className="font-mono font-bold mr-1">{prefixMap[diff.type]}</span>
      {diff.description}
      {diff.from && diff.to && (
        <span className="ml-1 text-xs opacity-75">
          ({diff.from} → {diff.to})
        </span>
      )}
    </li>
  );
}

function RoadmapDiffRow({ diff }: { diff: RoadmapDiff }) {
  const colorMap = {
    added: "text-green-700",
    removed: "text-red-700",
    moved: "text-amber-700",
  } as const;

  const prefixMap = { added: "+", removed: "-", moved: "~" } as const;

  return (
    <li className={`text-sm ${colorMap[diff.type]}`}>
      <span className="font-mono font-bold mr-1">{prefixMap[diff.type]}</span>
      {diff.name}
      {diff.from && diff.to && (
        <span className="ml-1 text-xs opacity-75">
          ({diff.from} → {diff.to})
        </span>
      )}
    </li>
  );
}

function TeamDiffSection({ team }: { team: TeamDiff }) {
  const hasContent =
    !!team.ragChange ||
    team.textUpdated ||
    (team.demandDiffs && team.demandDiffs.length > 0) ||
    (team.riskDiffs && team.riskDiffs.length > 0) ||
    (team.roadmapDiffs && team.roadmapDiffs.length > 0);

  return (
    <div className="rounded-xl border bg-card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <h3 className="text-base font-semibold">
          {team.teamName ?? team.teamId}
        </h3>
        {team.ragChange && (
          <RagChangeLabel from={team.ragChange.from} to={team.ragChange.to} />
        )}
      </div>

      {team.notUpdated ? (
        <p className="text-sm text-muted-foreground">Not updated this week</p>
      ) : (
        <div className="space-y-3">
          {team.textUpdated && (
            <p className="text-sm text-amber-700">📝 Text fields updated</p>
          )}

          {team.demandDiffs && team.demandDiffs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Demand
              </p>
              <ul className="space-y-0.5">
                {team.demandDiffs.map((d, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable list in read-only diff
                  <DemandDiffRow key={i} diff={d} />
                ))}
              </ul>
            </div>
          )}

          {team.riskDiffs && team.riskDiffs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Risks
              </p>
              <ul className="space-y-0.5">
                {team.riskDiffs.map((d, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable list in read-only diff
                  <RiskDiffRow key={i} diff={d} />
                ))}
              </ul>
            </div>
          )}

          {team.roadmapDiffs && team.roadmapDiffs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Roadmap
              </p>
              <ul className="space-y-0.5">
                {team.roadmapDiffs.map((d, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable list in read-only diff
                  <RoadmapDiffRow key={i} diff={d} />
                ))}
              </ul>
            </div>
          )}

          {!hasContent && (
            <p className="text-sm text-muted-foreground">No changes detected</p>
          )}
        </div>
      )}
    </div>
  );
}

function RouteComponent() {
  const { workspaceId } = Route.useParams();
  const [selectedWeek, setSelectedWeek] = useState<string | null>(null);

  const { data: weeks, isLoading: weeksLoading } = useGetSnapshotWeeks({
    workspaceId,
  });

  // Default to the most recent week once weeks load
  useEffect(() => {
    if (weeks && weeks.length > 0 && selectedWeek === null) {
      setSelectedWeek(weeks[0]);
    }
  }, [weeks, selectedWeek]);

  const displayWeeks = weeks ? weeks.slice(0, 4) : [];

  const toWeek = selectedWeek ?? "";
  const fromWeek =
    selectedWeek && weeks ? (weeks[weeks.indexOf(selectedWeek) + 1] ?? "") : "";

  const { data: diff, isLoading: diffLoading } = useGetSnapshotDiff({
    workspaceId,
    fromWeek,
    toWeek,
  });

  if (weeksLoading) {
    return (
      <>
        <PageTitle title="Week-over-Week" />
        <WorkspaceLayout title="Week-over-Week">
          <div className="p-6 space-y-4">
            <ProgramNav workspaceId={workspaceId} />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-8 w-20 rounded-full" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          </div>
        </WorkspaceLayout>
      </>
    );
  }

  if (!weeks || weeks.length === 0) {
    return (
      <>
        <PageTitle title="Week-over-Week" />
        <WorkspaceLayout title="Week-over-Week">
          <div className="p-6 space-y-4">
            <ProgramNav workspaceId={workspaceId} />
            <div className="flex items-center justify-center min-h-[60vh]">
              <div className="text-center space-y-3">
                <p className="text-muted-foreground">
                  No snapshots yet — save a status update to start tracking
                  week-over-week changes.
                </p>
              </div>
            </div>
          </div>
        </WorkspaceLayout>
      </>
    );
  }

  return (
    <>
      <PageTitle title="Week-over-Week" />
      <WorkspaceLayout title="Week-over-Week">
        <div className="p-6 space-y-6">
          {/* Week selector pills */}
          <ProgramNav workspaceId={workspaceId} />
          <div className="flex flex-wrap gap-2">
            {displayWeeks.map((week) => {
              const isSelected = week === selectedWeek;
              return (
                <button
                  key={week}
                  type="button"
                  onClick={() => setSelectedWeek(week)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {formatWeekLabel(week)}
                </button>
              );
            })}
          </div>

          {/* Diff content */}
          {selectedWeek && !fromWeek ? (
            <p className="text-sm text-muted-foreground">
              No prior snapshot to compare against for this week.
            </p>
          ) : diffLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 rounded-xl" />
              ))}
            </div>
          ) : diff && diff.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(diff as TeamDiff[]).map((team) => (
                <TeamDiffSection key={team.teamId} team={team} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No changes detected between these two weeks.
            </p>
          )}
        </div>
      </WorkspaceLayout>
    </>
  );
}
