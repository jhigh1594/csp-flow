import { createFileRoute } from "@tanstack/react-router";
import ProjectLayout from "@/components/common/project-layout";
import WikiPageEditor from "@/components/wiki/wiki-page-editor";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/wiki/$pageId",
)({
  component: WikiPageEditorRoute,
});

function WikiPageEditorRoute() {
  const { projectId, workspaceId, pageId } = Route.useParams();

  return (
    <ProjectLayout
      projectId={projectId}
      workspaceId={workspaceId}
      activeView="wiki"
    >
      <WikiPageEditor
        pageId={pageId}
        projectId={projectId}
        workspaceId={workspaceId}
      />
    </ProjectLayout>
  );
}
