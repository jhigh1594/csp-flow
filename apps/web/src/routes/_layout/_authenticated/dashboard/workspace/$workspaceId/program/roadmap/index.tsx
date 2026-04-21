import { createFileRoute } from "@tanstack/react-router";
import WorkspaceLayout from "@/components/common/workspace-layout";
import PageTitle from "@/components/page-title";
import ProgramNav from "@/components/program/program-nav";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import useGetRoadmap from "@/hooks/queries/program/use-get-roadmap";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/program/roadmap/",
)({ component: RouteComponent });

type Quarter = "q1" | "q2" | "q3" | "q4";

const QUARTERS: Quarter[] = ["q1", "q2", "q3", "q4"];

const QUARTER_LABELS: Record<Quarter, string> = {
  q1: "Q1",
  q2: "Q2",
  q3: "Q3",
  q4: "Q4",
};

function getMonthName(month: number): string {
  return new Date(2000, month - 1, 1).toLocaleString("default", {
    month: "short",
  });
}

function RouteComponent() {
  const { workspaceId } = Route.useParams();
  const { data: releases, isLoading } = useGetRoadmap({ workspaceId });

  const currentYear = new Date().getFullYear();

  const releasesByQuarter = QUARTERS.reduce<Record<Quarter, typeof releases>>(
    (acc, quarter) => {
      acc[quarter] = releases?.filter((r) => r.quarter === quarter) ?? [];
      return acc;
    },
    {} as Record<Quarter, typeof releases>,
  );

  if (isLoading) {
    return (
      <>
        <PageTitle title="Roadmap" />
        <WorkspaceLayout title="Roadmap">
          <div className="p-6 space-y-4">
            <ProgramNav workspaceId={workspaceId} />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {QUARTERS.map((q) => (
                <div key={q} className="space-y-3">
                  <Skeleton className="h-5 w-24" />
                  <div className="space-y-2">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="rounded-md border bg-card p-3 space-y-2"
                      >
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-20" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </WorkspaceLayout>
      </>
    );
  }

  return (
    <>
      <PageTitle title="Roadmap" />
      <WorkspaceLayout title="Roadmap">
        <div className="p-6 space-y-4">
          <ProgramNav workspaceId={workspaceId} />
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {QUARTERS.map((quarter) => {
              const laneReleases = releasesByQuarter[quarter] ?? [];
              const firstRelease = laneReleases[0];
              const fiscalYear = firstRelease?.fiscalYear ?? currentYear;
              const heading = `${QUARTER_LABELS[quarter]} FY${fiscalYear}`;

              return (
                <div key={quarter} className="space-y-3">
                  <h2 className="text-sm font-semibold text-foreground">
                    {heading}
                  </h2>
                  <div className="space-y-2">
                    {laneReleases.length === 0 ? (
                      <p className="text-xs text-muted-foreground py-2">
                        No releases this quarter
                      </p>
                    ) : (
                      laneReleases.map((release) => (
                        <div
                          key={release.id}
                          className="rounded-md border bg-card p-3 space-y-1"
                        >
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" size="sm">
                              {getMonthName(release.month)}
                            </Badge>
                            <span className="text-sm font-semibold leading-tight">
                              {release.name}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {release.teamName}
                          </p>
                          {release.personas && release.personas.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {release.personas.join(", ")}
                            </p>
                          )}
                          {release.description && (
                            <p className="text-xs italic text-muted-foreground leading-snug">
                              {release.description}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </WorkspaceLayout>
    </>
  );
}
