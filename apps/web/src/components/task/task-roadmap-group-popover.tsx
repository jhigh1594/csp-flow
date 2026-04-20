import { Check } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ShortcutNumber } from "@/components/ui/shortcut-number";
import { useUpdateTaskRoadmapGroup } from "@/hooks/mutations/task/use-update-task-roadmap-group";
import { useNumberedShortcuts } from "@/hooks/use-numbered-shortcuts";
import { getRoadmapGroupLabel } from "@/lib/i18n/domain";
import { toast } from "@/lib/toast";
import type Task from "@/types/task";

type TaskRoadmapGroupPopoverProps = {
  task: Task;
  children: React.ReactNode;
};

const roadmapGroupOptions = [
  { value: "now" },
  { value: "next" },
  { value: "later" },
];

export default function TaskRoadmapGroupPopover({
  task,
  children,
}: TaskRoadmapGroupPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { mutateAsync: updateTaskRoadmapGroup } = useUpdateTaskRoadmapGroup();

  const handleGroupChange = useCallback(
    async (newGroup: string) => {
      try {
        await updateTaskRoadmapGroup({
          ...task,
          roadmapGroup: newGroup,
        });
        setOpen(false);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t("tasks:popover.roadmapGroup.updateError"),
        );
      }
    },
    [t, task, updateTaskRoadmapGroup],
  );

  const shortcutOptions = useMemo(
    () =>
      roadmapGroupOptions.map((group) => ({
        onSelect: () => handleGroupChange(group.value),
      })),
    [handleGroupChange],
  );

  useNumberedShortcuts(open, shortcutOptions);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-48 p-0" align="start">
        <div>
          {roadmapGroupOptions.map((group, index) => (
            <Button
              key={group.value}
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-8 px-2 rounded-none first:rounded-t-md last:rounded-b-md"
              onClick={() => handleGroupChange(group.value)}
            >
              <span className="text-sm">
                {getRoadmapGroupLabel(group.value)}
              </span>
              {task.roadmapGroup === group.value ? (
                <Check className="ml-auto h-4 w-4" />
              ) : (
                <ShortcutNumber number={index + 1} />
              )}
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
