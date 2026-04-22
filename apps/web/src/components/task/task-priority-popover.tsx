import { Check } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ShortcutNumber } from "@/components/ui/shortcut-number";
import { useUpdateTaskPriority } from "@/hooks/mutations/task/use-update-task-status-priority";
import { useNumberedShortcuts } from "@/hooks/use-numbered-shortcuts";
import { getPriorityLabel } from "@/lib/i18n/domain";
import { getPriorityIcon } from "@/lib/priority";
import type Task from "@/types/task";

type TaskPriorityPopoverProps = {
  task: Task;
  children: React.ReactNode;
};

const priorityOptions = [
  { value: "no-priority" },
  { value: "low" },
  { value: "medium" },
  { value: "high" },
  { value: "urgent" },
];

export default function TaskPriorityPopover({
  task,
  children,
}: TaskPriorityPopoverProps) {
  const [open, setOpen] = useState(false);
  const { mutate: updateTaskPriority, isPending } = useUpdateTaskPriority();

  const handlePriorityChange = useCallback(
    (newPriority: string) => {
      setOpen(false);
      updateTaskPriority({
        ...task,
        priority: newPriority,
      });
    },
    [task, updateTaskPriority],
  );

  const shortcutOptions = useMemo(
    () =>
      priorityOptions.map((priority) => ({
        onSelect: () => handlePriorityChange(priority.value),
      })),
    [handlePriorityChange],
  );

  useNumberedShortcuts(open, shortcutOptions);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        className={`transition-opacity duration-150${isPending ? " opacity-50 pointer-events-none" : ""}`}
      >
        <PopoverTrigger asChild>{children}</PopoverTrigger>
      </div>
      <PopoverContent className="w-48 p-0" align="start">
        <div>
          {priorityOptions.map((priority, index) => (
            <Button
              key={priority.value}
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 h-8 px-2 rounded-none first:rounded-t-md last:rounded-b-md"
              onClick={() => handlePriorityChange(priority.value)}
            >
              {getPriorityIcon(priority.value)}
              <span className="text-sm">
                {getPriorityLabel(priority.value)}
              </span>
              {task.priority === priority.value ? (
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
