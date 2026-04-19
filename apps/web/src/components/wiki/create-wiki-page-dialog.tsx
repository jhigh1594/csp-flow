import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useCreateWikiPage } from "@/hooks/mutations/wiki/use-create-wiki-page";

type CreateWikiPageDialogProps = {
  projectId: string;
  workspaceId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function CreateWikiPageDialog({
  projectId,
  workspaceId,
  open,
  onOpenChange,
}: CreateWikiPageDialogProps) {
  const [title, setTitle] = useState("");
  const navigate = useNavigate();
  const { mutate: createPage, isPending } = useCreateWikiPage(projectId);

  const handleSubmit = () => {
    if (!title.trim()) return;

    createPage(
      { projectId, title: title.trim() },
      {
        onSuccess: (newPage) => {
          onOpenChange(false);
          setTitle("");
          navigate({
            to: "/dashboard/workspace/$workspaceId/project/$projectId/wiki/$pageId",
            params: {
              workspaceId,
              projectId,
              pageId: (newPage as { id: string }).id,
            },
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>New Page</DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-2">
          <Input
            placeholder="Page title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            autoFocus
          />
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              Cancel
            </Button>
          </DialogClose>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isPending || !title.trim()}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
