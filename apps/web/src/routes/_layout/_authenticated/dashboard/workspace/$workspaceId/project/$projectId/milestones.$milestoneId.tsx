import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { isAfter, parseISO } from "date-fns";
import { ChevronLeft, Diamond, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import ProjectLayout from "@/components/common/project-layout";
import MilestoneAddTaskPopover from "@/components/milestone/milestone-add-task-popover";
import MilestoneFormDialog from "@/components/milestone/milestone-form-dialog";
import MilestoneHealthMetrics from "@/components/milestone/milestone-health-metrics";
import MilestoneTaskTable from "@/components/milestone/milestone-task-table";
import PageTitle from "@/components/page-title";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useDeleteMilestone } from "@/hooks/mutations/milestone/use-delete-milestone";
import { useGetMilestoneTasks } from "@/hooks/queries/milestone/use-get-milestone-tasks";
import { useGetMilestones } from "@/hooks/queries/milestone/use-get-milestones";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/milestones/$milestoneId",
)({
  component: MilestoneDetailRoute,
});

function MilestoneDetailRoute() {
  const { projectId, workspaceId, milestoneId } = Route.useParams();
  const navigate = useNavigate();
  const { data: milestones = [] } = useGetMilestones(projectId);
  const { data: tasks = [] } = useGetMilestoneTasks(milestoneId);
  const { mutate: deleteMilestone, isPending: isDeleting } =
    useDeleteMilestone(projectId);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const milestone = milestones.find((m) => m.id === milestoneId);

  const inProgressCount = tasks.filter(
    (t) => t.status === "in-progress",
  ).length;
  const overdueCount = tasks.filter(
    (t) =>
      t.dueDate &&
      t.status !== "done" &&
      isAfter(new Date(), parseISO(t.dueDate)),
  ).length;
  const completedCount = tasks.filter((t) => t.status === "done").length;

  const handleDelete = () => {
    deleteMilestone(milestoneId, {
      onSuccess: () => {
        navigate({
          to: "/dashboard/workspace/$workspaceId/project/$projectId/milestones",
          params: { workspaceId, projectId },
        });
      },
    });
  };

  if (!milestone) {
    return (
      <ProjectLayout
        projectId={projectId}
        workspaceId={workspaceId}
        activeView="milestones"
      >
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted-foreground">Milestone not found</p>
        </div>
      </ProjectLayout>
    );
  }

  return (
    <ProjectLayout
      projectId={projectId}
      workspaceId={workspaceId}
      activeView="milestones"
    >
      <PageTitle title={milestone.title} />

      <div className="flex flex-1 flex-col gap-6 overflow-auto p-6">
        <div className="flex flex-col gap-4">
          <Link
            to="/dashboard/workspace/$workspaceId/project/$projectId/milestones"
            params={{ workspaceId, projectId }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-fit"
          >
            <ChevronLeft className="size-3.5" />
            Milestones
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <Diamond className="size-4 shrink-0 text-primary" />
              <h1 className="text-xl font-semibold truncate">
                {milestone.title}
              </h1>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-3.5" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            Target:{" "}
            {new Date(milestone.targetDate).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        <MilestoneHealthMetrics
          totalTasks={tasks.length}
          completedTasks={completedCount}
          inProgressTasks={inProgressCount}
          overdueTasks={overdueCount}
        />

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Tasks</h2>
            <MilestoneAddTaskPopover
              milestoneId={milestoneId}
              projectId={projectId}
            />
          </div>

          <MilestoneTaskTable
            tasks={tasks}
            workspaceId={workspaceId}
            projectId={projectId}
          />
        </div>
      </div>

      <MilestoneFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        projectId={projectId}
        milestone={{
          id: milestone.id,
          title: milestone.title,
          targetDate: milestone.targetDate,
        }}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete milestone?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{milestone.title}&quot;. Tasks
              assigned to this milestone will be unassigned but not deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose>
              <Button variant="outline" size="sm">
                Cancel
              </Button>
            </AlertDialogClose>
            <AlertDialogClose onClick={handleDelete}>
              <Button variant="destructive" size="sm" disabled={isDeleting}>
                Delete
              </Button>
            </AlertDialogClose>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ProjectLayout>
  );
}
