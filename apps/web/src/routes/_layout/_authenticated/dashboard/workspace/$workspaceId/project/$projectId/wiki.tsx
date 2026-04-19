import { createFileRoute, Outlet } from "@tanstack/react-router";
import ProjectLayout from "@/components/common/project-layout";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/wiki",
)({
  component: WikiLayoutRoute,
});

function WikiLayoutRoute() {
  const { projectId, workspaceId } = Route.useParams();

  return (
    <ProjectLayout
      projectId={projectId}
      workspaceId={workspaceId}
      activeView="wiki"
    >
      <Outlet />
    </ProjectLayout>
  );
}
