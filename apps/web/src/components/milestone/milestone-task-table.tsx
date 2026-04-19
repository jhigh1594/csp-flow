import { isAfter, parseISO } from "date-fns";
import { useState } from "react";
import TaskDetailsSheet from "@/components/task/task-details-sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUpdateTaskMilestone } from "@/hooks/mutations/task/use-update-task-milestone";
import { cn } from "@/lib/cn";
import { formatDateShort } from "@/lib/format";
import { getPriorityIcon } from "@/lib/priority";

type MilestoneTask = {
  id: string;
  title: string;
  number: number | null;
  status: string;
  priority: string | null;
  dueDate: string | null;
  userId: string | null;
  assigneeId: string | null;
  assigneeName: string | null;
  assigneeImage: string | null;
  projectId: string;
  milestoneId: string | null;
};

type FilterTab = "all" | "to-do" | "in-progress" | "done" | "overdue";

const STATUS_LABELS: Record<string, string> = {
  "to-do": "To Do",
  "in-progress": "In Progress",
  done: "Done",
};

const STATUS_STYLES: Record<string, string> = {
  "to-do": "bg-muted text-muted-foreground border-transparent",
  "in-progress": "bg-primary/10 text-primary border-primary/20",
  done: "bg-green-500/10 text-green-400 border-green-500/20",
};

function isTaskOverdue(task: MilestoneTask) {
  return (
    task.dueDate &&
    task.status !== "done" &&
    isAfter(new Date(), parseISO(task.dueDate))
  );
}

type MilestoneTaskTableProps = {
  tasks: MilestoneTask[];
  workspaceId: string;
  projectId: string;
};

export default function MilestoneTaskTable({
  tasks,
  workspaceId,
  projectId,
}: MilestoneTaskTableProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [openTaskId, setOpenTaskId] = useState<string | undefined>();
  const { mutate: updateMilestone } = useUpdateTaskMilestone();

  const overdueTasks = tasks.filter(isTaskOverdue);

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: "all", label: "All", count: tasks.length },
    {
      key: "to-do",
      label: "To Do",
      count: tasks.filter((t) => t.status === "to-do").length,
    },
    {
      key: "in-progress",
      label: "In Progress",
      count: tasks.filter((t) => t.status === "in-progress").length,
    },
    {
      key: "done",
      label: "Done",
      count: tasks.filter((t) => t.status === "done").length,
    },
    { key: "overdue", label: "Overdue", count: overdueTasks.length },
  ];

  const filtered = tasks.filter((t) => {
    if (activeTab === "all") return true;
    if (activeTab === "overdue") return isTaskOverdue(t);
    return t.status === activeTab;
  });

  const handleRemove = (task: MilestoneTask) => {
    updateMilestone({ taskId: task.id, milestoneId: null, projectId });
  };

  return (
    <>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors",
              activeTab === tab.key
                ? "border-primary/30 bg-primary/10 text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 opacity-60">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No tasks
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Task
                </th>
                <th className="px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Status
                </th>
                <th className="hidden px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground sm:table-cell">
                  Priority
                </th>
                <th className="hidden px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground md:table-cell">
                  Assignee
                </th>
                <th className="hidden px-3 py-2 text-left text-[10px] font-medium uppercase tracking-wide text-muted-foreground lg:table-cell">
                  Due Date
                </th>
                <th className="w-16 px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((task) => {
                const overdue = isTaskOverdue(task);
                return (
                  <tr
                    key={task.id}
                    className="group border-b border-border/50 last:border-0 hover:bg-muted/30"
                  >
                    <td className="px-3 py-2.5">
                      <button
                        type="button"
                        className="flex items-center gap-2 text-left hover:underline"
                        onClick={() => setOpenTaskId(task.id)}
                      >
                        {task.number && (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            #{task.number}
                          </span>
                        )}
                        <span className="text-xs font-medium">
                          {task.title}
                        </span>
                      </button>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[10px] font-semibold",
                          STATUS_STYLES[task.status] ?? STATUS_STYLES["to-do"],
                        )}
                      >
                        {STATUS_LABELS[task.status] ?? task.status}
                      </Badge>
                    </td>
                    <td className="hidden px-3 py-2.5 sm:table-cell">
                      {task.priority && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground capitalize">
                          {getPriorityIcon(task.priority)}
                          {task.priority}
                        </span>
                      )}
                    </td>
                    <td className="hidden px-3 py-2.5 md:table-cell">
                      {task.assigneeName ? (
                        <div className="flex items-center gap-1.5">
                          <Avatar className="size-5">
                            <AvatarImage
                              src={task.assigneeImage ?? undefined}
                            />
                            <AvatarFallback className="text-[9px]">
                              {task.assigneeName.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {task.assigneeName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="hidden px-3 py-2.5 lg:table-cell">
                      {task.dueDate ? (
                        <span
                          className={cn(
                            "text-xs",
                            overdue
                              ? "font-medium text-destructive"
                              : "text-muted-foreground",
                          )}
                        >
                          {formatDateShort(task.dueDate)}
                          {overdue && " ⚠"}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <Button
                        variant="ghost"
                        size="xs"
                        className="invisible text-[11px] text-muted-foreground hover:text-destructive group-hover:visible"
                        onClick={() => handleRemove(task)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <TaskDetailsSheet
        taskId={openTaskId}
        projectId={projectId}
        workspaceId={workspaceId}
        onClose={() => setOpenTaskId(undefined)}
      />
    </>
  );
}
