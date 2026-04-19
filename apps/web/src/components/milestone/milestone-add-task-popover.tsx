import { Check, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUpdateTaskMilestone } from "@/hooks/mutations/task/use-update-task-milestone";
import { useGetTasks } from "@/hooks/queries/task/use-get-tasks";

type MilestoneAddTaskPopoverProps = {
  milestoneId: string;
  projectId: string;
};

export default function MilestoneAddTaskPopover({
  milestoneId,
  projectId,
}: MilestoneAddTaskPopoverProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: tasksData } = useGetTasks(projectId);
  const { mutate: updateMilestone, isPending } = useUpdateTaskMilestone();

  const allTasks = useMemo(() => {
    if (!tasksData) return [];
    const fromColumns = tasksData.columns.flatMap((col) => col.tasks);
    return [
      ...fromColumns,
      ...(tasksData.archivedTasks ?? []),
      ...(tasksData.plannedTasks ?? []),
    ];
  }, [tasksData]);

  const unassigned = useMemo(
    () =>
      allTasks.filter(
        (t) =>
          t.milestoneId === null &&
          t.title.toLowerCase().includes(search.toLowerCase()),
      ),
    [allTasks, search],
  );

  const alreadyAdded = useMemo(
    () => allTasks.filter((t) => t.milestoneId === milestoneId),
    [allTasks, milestoneId],
  );

  const handleAdd = (taskId: string) => {
    updateMilestone({ taskId, milestoneId, projectId });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="size-3.5" />
          Add existing task
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <Search className="size-3.5 shrink-0 text-muted-foreground" />
            <Input
              className="h-7 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {unassigned.length === 0 && search === "" ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                All tasks are already in a milestone
              </p>
            ) : unassigned.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No tasks match &quot;{search}&quot;
              </p>
            ) : (
              <>
                <p className="px-3 pt-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Unassigned ({unassigned.length})
                </p>
                {unassigned.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 hover:bg-muted/40"
                  >
                    <div className="flex min-w-0 items-center gap-1.5">
                      {task.number && (
                        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                          #{task.number}
                        </span>
                      )}
                      <span className="truncate text-xs">{task.title}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="shrink-0 text-[10px] text-primary"
                      disabled={isPending}
                      onClick={() => handleAdd(task.id)}
                    >
                      + Add
                    </Button>
                  </div>
                ))}
              </>
            )}

            {alreadyAdded.length > 0 && (
              <>
                <div className="my-1 border-t border-border" />
                <p className="px-3 pt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                  Already in this milestone
                </p>
                {alreadyAdded.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 px-3 py-1.5 opacity-50"
                  >
                    <Check className="size-3 shrink-0 text-muted-foreground" />
                    {task.number && (
                      <span className="font-mono text-[10px] text-muted-foreground">
                        #{task.number}
                      </span>
                    )}
                    <span className="truncate text-xs text-muted-foreground">
                      {task.title}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
