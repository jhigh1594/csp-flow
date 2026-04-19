import { useNavigate } from "@tanstack/react-router";
import { Archive, ArrowLeft, Lock, Unlock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TiptapEditor from "@/components/wiki/tiptap-editor";
import { useArchiveWikiPage } from "@/hooks/mutations/wiki/use-archive-wiki-page";
import { useLockWikiPage } from "@/hooks/mutations/wiki/use-lock-wiki-page";
import { useUnlockWikiPage } from "@/hooks/mutations/wiki/use-unlock-wiki-page";
import { useUpdateWikiPage } from "@/hooks/mutations/wiki/use-update-wiki-page";
import { useGetWikiPage } from "@/hooks/queries/wiki/use-get-wiki-page";

type WikiPageEditorProps = {
  pageId: string;
  projectId: string;
  workspaceId: string;
};

export default function WikiPageEditor({
  pageId,
  projectId,
  workspaceId,
}: WikiPageEditorProps) {
  const navigate = useNavigate();
  const { data: page, isLoading } = useGetWikiPage(pageId);
  const updatePage = useUpdateWikiPage(projectId);
  const lockPage = useLockWikiPage(projectId);
  const unlockPage = useUnlockWikiPage(projectId);
  const archivePage = useArchiveWikiPage(projectId);

  const [title, setTitle] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (page) {
      setTitle(page.title);
    }
  }, [page]);

  const handleSaveContent = useCallback(
    (contentHtml: string, contentJson: Record<string, unknown>) => {
      updatePage.mutate({ id: pageId, contentHtml, contentJson });
    },
    [updatePage, pageId],
  );

  const handleContentUpdate = useCallback(
    (html: string, json: Record<string, unknown>) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        handleSaveContent(html, json);
      }, 300);
    },
    [handleSaveContent],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const handleTitleBlur = () => {
    if (page && title.trim() && title.trim() !== page.title) {
      updatePage.mutate({ id: pageId, title: title.trim() });
    }
  };

  const handleBack = () => {
    navigate({
      to: "/dashboard/workspace/$workspaceId/project/$projectId/wiki",
      params: { workspaceId, projectId },
    });
  };

  const handleToggleLock = () => {
    if (!page) return;
    if (page.isLocked) {
      unlockPage.mutate(pageId);
    } else {
      lockPage.mutate(pageId);
    }
  };

  const handleArchive = () => {
    archivePage.mutate(pageId, {
      onSuccess: () => handleBack(),
    });
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Loading page...</p>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Page not found.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="flex items-center justify-between border-b border-border/80 px-4 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon-xs" onClick={handleBack}>
            <ArrowLeft className="size-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-xs" onClick={handleToggleLock}>
            {page.isLocked ? (
              <Lock className="size-4" />
            ) : (
              <Unlock className="size-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={handleArchive}>
            <Archive className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 px-4 py-4">
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleTitleBlur}
          disabled={page.isLocked}
          className="mb-4 border-0 px-0 text-xl font-semibold shadow-none focus-visible:ring-0"
          placeholder="Page title"
        />
        <TiptapEditor
          contentJson={page.contentJson as Record<string, unknown> | null}
          editable={!page.isLocked}
          onUpdate={handleContentUpdate}
        />
      </div>
    </div>
  );
}
