import { useNavigate } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { Archive, ArchiveRestore, MoreHorizontal, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@/components/ui/menu";
import { useArchiveWikiPage } from "@/hooks/mutations/wiki/use-archive-wiki-page";
import { useDeleteWikiPage } from "@/hooks/mutations/wiki/use-delete-wiki-page";
import { useUnarchiveWikiPage } from "@/hooks/mutations/wiki/use-unarchive-wiki-page";

type WikiPage = {
  id: string;
  title: string;
  isLocked: boolean;
  archivedAt: string | null;
  updatedAt: string;
};

type WikiPageListItemProps = {
  page: WikiPage;
  projectId: string;
  workspaceId: string;
};

export default function WikiPageListItem({
  page,
  projectId,
  workspaceId,
}: WikiPageListItemProps) {
  const navigate = useNavigate();
  const { mutate: archivePage } = useArchiveWikiPage(projectId);
  const { mutate: unarchivePage } = useUnarchiveWikiPage(projectId);
  const { mutate: deletePage } = useDeleteWikiPage(projectId);

  const isArchived = !!page.archivedAt;

  const handleNavigate = () => {
    navigate({
      to: "/dashboard/workspace/$workspaceId/project/$projectId/wiki/$pageId",
      params: { workspaceId, projectId, pageId: page.id },
    });
  };

  return (
    <div className="group flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 transition-colors hover:bg-muted/40">
      <button
        type="button"
        onClick={handleNavigate}
        className="min-w-0 flex-1 text-left"
      >
        <span className="block truncate text-sm font-medium text-foreground">
          {page.title}
        </span>
        <span className="block text-xs text-muted-foreground">
          Updated{" "}
          {formatDistanceToNow(new Date(page.updatedAt), { addSuffix: true })}
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-1.5">
        {isArchived && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Archived
          </span>
        )}
        {page.isLocked && (
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            Locked
          </span>
        )}

        <Menu>
          <MenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon-xs"
                className="size-7 opacity-0 group-hover:opacity-100"
              />
            }
          >
            <MoreHorizontal className="size-4" />
          </MenuTrigger>
          <MenuPopup align="end">
            {isArchived ? (
              <MenuItem onClick={() => unarchivePage(page.id)}>
                <ArchiveRestore className="size-4" />
                Unarchive
              </MenuItem>
            ) : (
              <MenuItem onClick={() => archivePage(page.id)}>
                <Archive className="size-4" />
                Archive
              </MenuItem>
            )}
            <MenuItem onClick={() => deletePage(page.id)} variant="destructive">
              <Trash2 className="size-4" />
              Delete
            </MenuItem>
          </MenuPopup>
        </Menu>
      </div>
    </div>
  );
}
