import { useNavigate } from "@tanstack/react-router";
import { Archive, ArrowLeft, Lock, Unlock } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { WikiEditorHandle } from "@/components/wiki/wiki-editor";
import WikiEditor from "@/components/wiki/wiki-editor";
import type { TocAnchor } from "@/components/wiki/wiki-toc";
import WikiToc from "@/components/wiki/wiki-toc";
import { useArchiveWikiPage } from "@/hooks/mutations/wiki/use-archive-wiki-page";
import { useLockWikiPage } from "@/hooks/mutations/wiki/use-lock-wiki-page";
import { useUnlockWikiPage } from "@/hooks/mutations/wiki/use-unlock-wiki-page";
import { useUpdateWikiPage } from "@/hooks/mutations/wiki/use-update-wiki-page";
import { useGetWikiPage } from "@/hooks/queries/wiki/use-get-wiki-page";

type WikiPageEditorProps = {
  pageId: string;
  projectId: string;
  workspaceId: string;
  teamId: string;
};

export default function WikiPageEditor({
  pageId,
  projectId,
  workspaceId,
  teamId,
}: WikiPageEditorProps) {
  const navigate = useNavigate();
  const { data: page, isLoading } = useGetWikiPage(pageId);
  const updatePage = useUpdateWikiPage(projectId);
  const lockPage = useLockWikiPage(projectId);
  const unlockPage = useUnlockWikiPage(projectId);
  const archivePage = useArchiveWikiPage(projectId);

  const [title, setTitle] = useState("");
  const [tocAnchors, setTocAnchors] = useState<TocAnchor[]>([]);
  const [tocVisible, setTocVisible] = useState(true);
  const editorRef = useRef<WikiEditorHandle>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // Stable initial content — prevents Tiptap from seeing new object references after each refetch,
  // which would trigger setOptions → view.updateState → onUpdate → save → refetch loop.
  const initialContentRef = useRef<Record<string, unknown> | null | undefined>(
    undefined,
  );

  useEffect(() => {
    if (page) {
      setTitle(page.title);
    }
  }, [page]);

  const handleSaveContent = useCallback(
    (contentHtml: string, contentJson: Record<string, unknown>) => {
      updatePage.mutate({ id: pageId, contentHtml, contentJson });
    },
    [updatePage.mutate, pageId],
  );

  const pendingContentRef = useRef<{
    html: string;
    json: Record<string, unknown>;
  } | null>(null);
  const handleSaveContentRef = useRef(handleSaveContent);
  handleSaveContentRef.current = handleSaveContent;

  const handleContentUpdate = useCallback(
    (html: string, json: Record<string, unknown>) => {
      pendingContentRef.current = { html, json };
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        handleSaveContent(html, json);
        pendingContentRef.current = null;
      }, 300);
    },
    [handleSaveContent],
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = undefined;
        if (pendingContentRef.current) {
          handleSaveContentRef.current(
            pendingContentRef.current.html,
            pendingContentRef.current.json,
          );
          pendingContentRef.current = null;
        }
      }
    };
  }, []);

  const handleTitleBlur = () => {
    if (page && title.trim() && title.trim() !== page.title) {
      updatePage.mutate({ id: pageId, title: title.trim() });
    }
  };

  const handleBack = () => {
    navigate({
      to: "/dashboard/workspace/$workspaceId/team/$teamId/project/$projectId/wiki",
      params: { workspaceId, teamId, projectId },
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

  const handleHeadingClick = useCallback((id: string) => {
    const wrapper = editorRef.current?.contentWrapperRef.current;
    if (!wrapper) return;
    const heading =
      wrapper.querySelector(`[data-toc-id="${id}"]`) ??
      wrapper.querySelector(`#${CSS.escape(id)}`);
    if (heading) {
      heading.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

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

  // Set once on first render with data — stable ref prevents refetch-triggered re-saves
  if (initialContentRef.current === undefined) {
    initialContentRef.current =
      (page.contentJson as Record<string, unknown> | null) ?? null;
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

      <div className="flex-1 flex">
        <div className="flex-1 min-w-0">
          <WikiEditor
            ref={editorRef}
            contentJson={initialContentRef.current ?? null}
            editable={!page.isLocked}
            onUpdate={handleContentUpdate}
            title={title}
            onTitleChange={setTitle}
            onTitleBlur={handleTitleBlur}
            onTocAnchorsChange={setTocAnchors}
          />
        </div>
        <WikiToc
          anchors={tocAnchors}
          onHeadingClick={handleHeadingClick}
          visible={tocVisible}
          onToggle={() => setTocVisible((v) => !v)}
        />
      </div>
    </div>
  );
}
