import { differenceInDays, isAfter, isBefore, parseISO } from "date-fns";
import { Diamond } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

type MilestoneStatus = "Completed" | "Overdue" | "At Risk" | "On Track";

export function getMilestoneStatus(
  targetDate: string,
  totalTasks: number,
  completedTasks: number,
): MilestoneStatus {
  const target = parseISO(targetDate);
  const now = new Date();
  const allDone = totalTasks > 0 && completedTasks >= totalTasks;
  const noTasksPastDate = totalTasks === 0 && isBefore(target, now);

  if (allDone || noTasksPastDate) return "Completed";
  if (isBefore(target, now)) return "Overdue";
  const daysUntil = differenceInDays(target, now);
  const pct = totalTasks > 0 ? completedTasks / totalTasks : 0;
  if (daysUntil <= 14 && pct < 0.8) return "At Risk";
  return "On Track";
}

const statusStyles: Record<MilestoneStatus, string> = {
  Completed: "bg-primary/10 text-primary border-primary/20",
  Overdue: "bg-destructive/10 text-destructive border-destructive/20",
  "At Risk": "bg-orange-500/10 text-orange-400 border-orange-500/20",
  "On Track": "bg-green-500/10 text-green-400 border-green-500/20",
};

const progressColor: Record<MilestoneStatus, string> = {
  Completed: "bg-primary",
  Overdue: "bg-destructive",
  "At Risk": "bg-orange-400",
  "On Track": "bg-green-400",
};

type MilestoneCardProps = {
  id: string;
  title: string;
  targetDate: string;
  totalTasks: number;
  completedTasks: number;
  onClick: () => void;
};

export default function MilestoneCard({
  title,
  targetDate,
  totalTasks,
  completedTasks,
  onClick,
}: MilestoneCardProps) {
  const status = getMilestoneStatus(targetDate, totalTasks, completedTasks);
  const pct =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const target = parseISO(targetDate);
  const now = new Date();
  const daysLeft = differenceInDays(target, now);
  const overdue = isAfter(now, target) && status !== "Completed";

  const dateLabel = overdue
    ? `${Math.abs(daysLeft)}d overdue`
    : daysLeft === 0
      ? "Due today"
      : `${daysLeft}d left`;

  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full flex-col gap-3 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-card/80"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Diamond className="size-3.5 shrink-0 text-primary" />
          <span className="truncate text-sm font-semibold">{title}</span>
        </div>
        <Badge
          variant="outline"
          className={cn(
            "shrink-0 text-[10px] font-semibold",
            statusStyles[status],
          )}
        >
          {status}
        </Badge>
      </div>

      <div className="text-[11px] text-muted-foreground">
        {new Date(targetDate).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })}
        {" · "}
        <span className={cn(overdue && "text-destructive")}>{dateLabel}</span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
          <div
            className={cn(
              "h-full rounded-full transition-all",
              progressColor[status],
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>
            {completedTasks}/{totalTasks} tasks done
          </span>
          <span>{pct}%</span>
        </div>
      </div>
    </button>
  );
}
