import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Diamond, Plus } from "lucide-react";
import { useState } from "react";
import MilestoneCard from "@/components/milestone/milestone-card";
import MilestoneFormDialog from "@/components/milestone/milestone-form-dialog";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { useGetMilestones } from "@/hooks/queries/milestone/use-get-milestones";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/milestones/",
)({
  component: MilestonesIndexRoute,
});

function MilestonesIndexRoute() {
  const { projectId, workspaceId } = Route.useParams();
  const navigate = useNavigate();
  const { data: milestones = [] } = useGetMilestones(projectId);
  const [dialogOpen, setDialogOpen] = useState(false);

  const completedCount = milestones.filter(
    (m) =>
      m.completedTasks > 0 &&
      m.completedTasks >= m.totalTasks &&
      m.totalTasks > 0,
  ).length;

  const handleCardClick = (milestoneId: string) => {
    navigate({
      to: "/dashboard/workspace/$workspaceId/project/$projectId/milestones/$milestoneId",
      params: { workspaceId, projectId, milestoneId },
    });
  };

  return (
    <>
      <PageTitle title="Milestones" />

      <div className="flex flex-1 flex-col gap-6 overflow-auto p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Milestones</h1>
            <p className="text-sm text-muted-foreground">
              {milestones.length} total · {completedCount} completed
            </p>
          </div>
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="size-3.5" />
            New Milestone
          </Button>
        </div>

        {milestones.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
            <Diamond className="size-8 text-muted-foreground/50" />
            <div>
              <p className="text-sm font-medium">No milestones yet</p>
              <p className="text-sm text-muted-foreground">
                Create your first milestone to start planning releases.
              </p>
            </div>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="size-3.5" />
              New Milestone
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {milestones.map((milestone) => (
              <MilestoneCard
                key={milestone.id}
                id={milestone.id}
                title={milestone.title}
                targetDate={milestone.targetDate}
                totalTasks={milestone.totalTasks ?? 0}
                completedTasks={milestone.completedTasks ?? 0}
                onClick={() => handleCardClick(milestone.id)}
              />
            ))}
          </div>
        )}
      </div>

      <MilestoneFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
      />
    </>
  );
}
