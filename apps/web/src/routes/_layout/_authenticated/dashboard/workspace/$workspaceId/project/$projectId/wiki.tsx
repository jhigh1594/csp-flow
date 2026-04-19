import { createFileRoute } from "@tanstack/react-router";
import ProjectLayout from "@/components/common/project-layout";
import WikiPageList from "@/components/wiki/wiki-page-list";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/wiki",
)({
  component: WikiRouteComponent,
});

function WikiRouteComponent() {
  const { projectId, workspaceId } = Route.useParams();

  return (
    <ProjectLayout
      projectId={projectId}
      workspaceId={workspaceId}
      activeView="wiki"
    >
      <div className="flex h-full flex-col overflow-y-auto">
        <WikiPageList projectId={projectId} workspaceId={workspaceId} />
      </div>
    </ProjectLayout>
  );
}
