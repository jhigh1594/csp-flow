import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { Diamond, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import ProjectLayout from "@/components/common/project-layout";
import MilestoneFormDialog from "@/components/milestone/milestone-form-dialog";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import { useDeleteMilestone } from "@/hooks/mutations/milestone/use-delete-milestone";
import { useGetMilestones } from "@/hooks/queries/milestone/use-get-milestones";
import useGetProject from "@/hooks/queries/project/use-get-project";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/team/$teamId/project/$projectId/milestones",
)({
  component: MilestonesPage,
});

function MilestonesPage() {
  const { projectId, workspaceId, teamId } = Route.useParams();
  const { data: project } = useGetProject({ id: projectId, workspaceId });
  const { data: milestones = [] } = useGetMilestones(projectId);
  const { mutate: deleteMilestone } = useDeleteMilestone(projectId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<
    { id: string; title: string; targetDate: string } | undefined
  >(undefined);

  const handleAdd = () => {
    setEditing(undefined);
    setDialogOpen(true);
  };

  const handleEdit = (m: { id: string; title: string; targetDate: string }) => {
    setEditing(m);
    setDialogOpen(true);
  };

  return (
    <ProjectLayout
      projectId={projectId}
      workspaceId={workspaceId}
      teamId={teamId}
      activeView="milestones"
      headerActions={
        <Button size="xs" onClick={handleAdd} className="h-7 gap-1.5 px-2.5">
          <Plus className="size-3.5" />
          Add Milestone
        </Button>
      }
    >
      <PageTitle title={`${project?.name ?? ""} — Milestones`} />
      <div className="flex flex-col gap-3 p-4">
        {milestones.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
            <Diamond className="size-8 opacity-30" />
            <p className="text-sm">No milestones yet</p>
            <Button size="sm" variant="outline" onClick={handleAdd}>
              Add your first milestone
            </Button>
          </div>
        ) : (
          milestones.map((m) => {
            const progress =
              m.totalTasks > 0
                ? Math.round((m.completedTasks / m.totalTasks) * 100)
                : 0;
            return (
              <div
                key={m.id}
                className="flex items-center gap-4 rounded-lg border border-border bg-background px-4 py-3"
              >
                <Diamond className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{m.title}</p>
                  <p className="text-xs text-muted-foreground">
                    Due {format(new Date(m.targetDate), "MMM d, yyyy")} ·{" "}
                    {m.completedTasks}/{m.totalTasks} tasks · {progress}%
                  </p>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="size-7"
                    onClick={() =>
                      handleEdit({
                        id: m.id,
                        title: m.title,
                        targetDate: m.targetDate,
                      })
                    }
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className="size-7 text-destructive hover:text-destructive"
                    onClick={() => deleteMilestone(m.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
      <MilestoneFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={projectId}
        milestone={editing}
      />
    </ProjectLayout>
  );
}
