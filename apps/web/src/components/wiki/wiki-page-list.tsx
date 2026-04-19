import { FileText, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import CreateWikiPageDialog from "@/components/wiki/create-wiki-page-dialog";
import WikiPageListItem from "@/components/wiki/wiki-page-list-item";
import { useGetWikiPages } from "@/hooks/queries/wiki/use-get-wiki-pages";

type WikiPageListProps = {
  projectId: string;
  workspaceId: string;
};

export default function WikiPageList({
  projectId,
  workspaceId,
}: WikiPageListProps) {
  const { data: pages = [], isLoading } = useGetWikiPages(projectId);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading pages...</p>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <>
        <div className="flex flex-1 items-center justify-center">
          <div className="max-w-sm text-center">
            <FileText className="mx-auto mb-3 size-10 text-muted-foreground/40" />
            <h2 className="text-sm font-semibold text-foreground">
              No wiki pages yet
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first page to start documenting.
            </p>
            <Button
              size="sm"
              className="mt-4"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="size-3.5" />
              New Page
            </Button>
          </div>
        </div>
        <CreateWikiPageDialog
          projectId={projectId}
          workspaceId={workspaceId}
          open={isCreateOpen}
          onOpenChange={setIsCreateOpen}
        />
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-3">
        <h1 className="text-sm font-semibold text-foreground">Wiki</h1>
        <Button size="xs" onClick={() => setIsCreateOpen(true)}>
          <Plus className="size-3.5" />
          New Page
        </Button>
      </div>
      <div className="space-y-1 p-4">
        {pages.map(
          (page: {
            id: string;
            title: string;
            isLocked: boolean;
            archivedAt: string | null;
            updatedAt: string;
          }) => (
            <WikiPageListItem
              key={page.id}
              page={page}
              projectId={projectId}
              workspaceId={workspaceId}
            />
          ),
        )}
      </div>
      <CreateWikiPageDialog
        projectId={projectId}
        workspaceId={workspaceId}
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </>
  );
}
