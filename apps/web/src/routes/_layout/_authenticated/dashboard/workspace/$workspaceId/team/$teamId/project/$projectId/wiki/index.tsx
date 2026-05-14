import { createFileRoute } from "@tanstack/react-router";
import WikiPageList from "@/components/wiki/wiki-page-list";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/team/$teamId/project/$projectId/wiki/",
)({
  component: WikiListRoute,
});

function WikiListRoute() {
  const { projectId, workspaceId, teamId } = Route.useParams();

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <WikiPageList
        projectId={projectId}
        workspaceId={workspaceId}
        teamId={teamId}
      />
    </div>
  );
}
