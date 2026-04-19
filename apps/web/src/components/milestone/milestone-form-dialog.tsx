import { format } from "date-fns";
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
import { useCreateMilestone } from "@/hooks/mutations/milestone/use-create-milestone";
import { useUpdateMilestone } from "@/hooks/mutations/milestone/use-update-milestone";

type MilestoneFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  milestone?: { id: string; title: string; targetDate: string };
};

export default function MilestoneFormDialog({
  open,
  onOpenChange,
  projectId,
  milestone,
}: MilestoneFormDialogProps) {
  const isEdit = !!milestone;
  const [title, setTitle] = useState(milestone?.title ?? "");
  const [dateValue, setDateValue] = useState(
    milestone?.targetDate
      ? format(new Date(milestone.targetDate), "yyyy-MM-dd")
      : format(new Date(), "yyyy-MM-dd"),
  );

  const { mutate: createMilestone, isPending: isCreating } =
    useCreateMilestone(projectId);
  const { mutate: updateMilestone, isPending: isUpdating } =
    useUpdateMilestone(projectId);

  const isPending = isCreating || isUpdating;

  const handleSubmit = () => {
    if (!title.trim() || !dateValue) return;
    if (isEdit) {
      updateMilestone(
        { id: milestone.id, title: title.trim(), targetDate: dateValue },
        { onSuccess: () => onOpenChange(false) },
      );
    } else {
      createMilestone(
        { projectId, title: title.trim(), targetDate: dateValue },
        {
          onSuccess: () => {
            onOpenChange(false);
            setTitle("");
            setDateValue(format(new Date(), "yyyy-MM-dd"));
          },
        },
      );
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (!next && !isEdit) {
      setTitle("");
      setDateValue(format(new Date(), "yyyy-MM-dd"));
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPopup>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit Milestone" : "Add Milestone"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 px-6 pb-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted-foreground" htmlFor="ms-title">
              Title
            </label>
            <Input
              id="ms-title"
              placeholder="Milestone name"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted-foreground" htmlFor="ms-date">
              Target date
            </label>
            <Input
              id="ms-date"
              type="date"
              value={dateValue}
              onChange={(e) => setDateValue(e.target.value)}
            />
          </div>
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
            disabled={isPending || !title.trim() || !dateValue}
          >
            {isEdit ? "Save" : "Add Milestone"}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
