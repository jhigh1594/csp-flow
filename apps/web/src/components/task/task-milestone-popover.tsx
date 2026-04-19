import { Check, Diamond } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUpdateTaskMilestone } from "@/hooks/mutations/task/use-update-task-milestone";
import { useGetMilestones } from "@/hooks/queries/milestone/use-get-milestones";
import { toast } from "@/lib/toast";
import type Task from "@/types/task";

type TaskMilestonePopoverProps = {
  task: Task;
  children: React.ReactNode;
};

export default function TaskMilestonePopover({
  task,
  children,
}: TaskMilestonePopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { data: milestones = [] } = useGetMilestones(task.projectId);
  const { mutateAsync: updateTaskMilestone } = useUpdateTaskMilestone();

  const handleSelect = useCallback(
    async (milestoneId: string | null) => {
      try {
        await updateTaskMilestone({
          taskId: task.id,
          milestoneId,
          projectId: task.projectId,
        });
        setOpen(false);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t("tasks:popover.milestone.updateError"),
        );
      }
    },
    [t, task, updateTaskMilestone],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-56 p-0" align="start">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 h-8 px-2 rounded-none rounded-t-md text-muted-foreground"
            onClick={() => handleSelect(null)}
          >
            <Diamond className="h-3.5 w-3.5 opacity-30" />
            <span className="text-sm">
              {t("tasks:popover.milestone.noMilestone")}
            </span>
            {!task.milestoneId && <Check className="ml-auto h-4 w-4" />}
          </Button>
          {milestones.length > 0 && (
            <div className="border-t border-border">
              {milestones.map((milestone) => (
                <Button
                  key={milestone.id}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start gap-2 h-8 px-2 rounded-none last:rounded-b-md"
                  onClick={() => handleSelect(milestone.id)}
                >
                  <Diamond className="h-3.5 w-3.5 text-primary" />
                  <span className="truncate text-sm">{milestone.title}</span>
                  {task.milestoneId === milestone.id && (
                    <Check className="ml-auto h-4 w-4" />
                  )}
                </Button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
