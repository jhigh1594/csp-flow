import { createFileRoute } from "@tanstack/react-router";
import WikiPageEditor from "@/components/wiki/wiki-page-editor";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/team/$teamId/project/$projectId/wiki/$pageId",
)({
  component: WikiPageEditorRoute,
});

function WikiPageEditorRoute() {
  const { projectId, workspaceId, teamId, pageId } = Route.useParams();

  return (
    <WikiPageEditor
      pageId={pageId}
      projectId={projectId}
      workspaceId={workspaceId}
      teamId={teamId}
    />
  );
}
