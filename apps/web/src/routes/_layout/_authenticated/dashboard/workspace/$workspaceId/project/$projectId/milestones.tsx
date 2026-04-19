import { createFileRoute, Outlet } from "@tanstack/react-router";
import ProjectLayout from "@/components/common/project-layout";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/milestones",
)({
  component: MilestonesLayoutRoute,
});

function MilestonesLayoutRoute() {
  const { projectId, workspaceId } = Route.useParams();

  return (
    <ProjectLayout
      projectId={projectId}
      workspaceId={workspaceId}
      activeView="milestones"
    >
      <Outlet />
    </ProjectLayout>
  );
}
