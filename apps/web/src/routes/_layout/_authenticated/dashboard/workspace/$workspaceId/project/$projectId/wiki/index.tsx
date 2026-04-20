import { createFileRoute } from "@tanstack/react-router";
import WikiPageList from "@/components/wiki/wiki-page-list";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/wiki/",
)({
  component: WikiListRoute,
});

function WikiListRoute() {
  const { projectId, workspaceId } = Route.useParams();

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <WikiPageList projectId={projectId} workspaceId={workspaceId} />
    </div>
  );
}
