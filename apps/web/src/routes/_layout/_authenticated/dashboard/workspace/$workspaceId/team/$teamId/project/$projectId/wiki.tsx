import { createFileRoute } from "@tanstack/react-router";
import { FileText } from "lucide-react";
import ProjectLayout from "@/components/common/project-layout";
import PageTitle from "@/components/page-title";
import useGetProject from "@/hooks/queries/project/use-get-project";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/team/$teamId/project/$projectId/wiki",
)({
  component: WikiPage,
});

function WikiPage() {
  const { projectId, workspaceId, teamId } = Route.useParams();
  const { data: project } = useGetProject({ id: projectId, workspaceId });

  return (
    <ProjectLayout
      projectId={projectId}
      workspaceId={workspaceId}
      teamId={teamId}
      activeView="wiki"
    >
      <PageTitle title={`${project?.name ?? ""} — Wiki`} />
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
        <FileText className="size-8 opacity-30" />
        <p className="text-sm">Wiki coming soon</p>
      </div>
    </ProjectLayout>
  );
}
