import { createFileRoute, useNavigate } from "@tanstack/react-router";
import WorkspaceLayout from "@/components/common/workspace-layout";
import PageTitle from "@/components/page-title";
import ProgramNav from "@/components/program/program-nav";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardPanel, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useGetProgramTeams from "@/hooks/queries/program/use-get-program-teams";
import { formatDateMedium } from "@/lib/format";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/program/",
)({ component: RouteComponent });

function RagBadge({ health }: { health: string | null | undefined }) {
  if (!health) {
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
        No data
      </span>
    );
  }

  const colorMap: Record<string, string> = {
    green: "bg-green-100 text-green-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-800",
  };

  const labelMap: Record<string, string> = {
    green: "Green",
    amber: "Amber",
    red: "Red",
  };

  const colorClass = colorMap[health] ?? "bg-gray-100 text-gray-600";
  const label = labelMap[health] ?? health;

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}

function RouteComponent() {
  const { workspaceId } = Route.useParams();
  const navigate = useNavigate();
  const {
    data: teams,
    isLoading,
    isError,
  } = useGetProgramTeams({ workspaceId });

  const handleTeamClick = (teamId: string) => {
    navigate({
      to: "/dashboard/workspace/$workspaceId/program/team/$teamId",
      params: { workspaceId, teamId },
    });
  };

  const teamsWithRisks = teams?.filter((t) => t.openRiskCount > 0) ?? [];

  if (isLoading) {
    return (
      <>
        <PageTitle title="Program Tracker" />
        <WorkspaceLayout title="Program Tracker">
          <div className="p-6 space-y-6">
            <ProgramNav workspaceId={workspaceId} />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border bg-card p-5 space-y-3"
                >
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-28" />
                </div>
              ))}
            </div>
          </div>
        </WorkspaceLayout>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <PageTitle title="Program Tracker" />
        <WorkspaceLayout title="Program Tracker">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-3">
              <h3 className="text-xl font-semibold">Failed to load teams</h3>
              <p className="text-muted-foreground">
                There was an error loading program data. Check API logs or
                restart the server.
              </p>
            </div>
          </div>
        </WorkspaceLayout>
      </>
    );
  }

  if (!teams || teams.length === 0) {
    return (
      <>
        <PageTitle title="Program Tracker" />
        <WorkspaceLayout title="Program Tracker">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-3">
              <h3 className="text-xl font-semibold">No teams found</h3>
              <p className="text-muted-foreground">
                No workstreams have been configured for this workspace.
              </p>
            </div>
          </div>
        </WorkspaceLayout>
      </>
    );
  }

  return (
    <>
      <PageTitle title="Program Tracker" />
      <WorkspaceLayout title="Program Tracker">
        <div className="p-6 space-y-8">
          <ProgramNav workspaceId={workspaceId} />
          {/* Team cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <Card
                key={team.id}
                className="cursor-pointer hover:shadow-sm transition-shadow"
                onClick={() => handleTeamClick(team.id)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg font-bold leading-tight">
                      {team.name}
                    </CardTitle>
                    <Badge variant="outline" size="sm">
                      {team.identifier}
                    </Badge>
                  </div>
                </CardHeader>
                <CardPanel className="pt-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <RagBadge health={team.latestStatus?.health} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {team.latestStatus?.updatedAt
                      ? `Last updated: ${formatDateMedium(team.latestStatus.updatedAt)}`
                      : "Never updated"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {team.nextMilestoneDemandDate
                      ? `Next milestone: ${formatDateMedium(team.nextMilestoneDemandDate)}`
                      : "No upcoming milestones"}
                  </p>
                  <div>
                    {team.openRiskCount > 0 ? (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                        {team.openRiskCount} open{" "}
                        {team.openRiskCount === 1 ? "risk" : "risks"}
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
                        0 open risks
                      </span>
                    )}
                  </div>
                </CardPanel>
              </Card>
            ))}
          </div>

          {/* Open Risks table */}
          {teamsWithRisks.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">Open Risks</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-foreground font-medium">
                      Team
                    </TableHead>
                    <TableHead className="text-foreground font-medium">
                      Open Risks
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamsWithRisks.map((team) => (
                    <TableRow
                      key={team.id}
                      className="cursor-pointer"
                      onClick={() => handleTeamClick(team.id)}
                    >
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
                          {team.openRiskCount}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </WorkspaceLayout>
    </>
  );
}
