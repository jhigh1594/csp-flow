import { createFileRoute } from "@tanstack/react-router";
import WikiPageList from "@/components/wiki/wiki-page-list";
import getWikiPages from "@/fetchers/wiki/get-wiki-pages";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/wiki/",
)({
  loader: ({ context: { queryClient }, params: { projectId } }) =>
    queryClient.ensureQueryData({
      queryKey: ["wiki-pages", projectId],
      queryFn: () => getWikiPages(projectId),
      staleTime: 30_000,
    }),
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
