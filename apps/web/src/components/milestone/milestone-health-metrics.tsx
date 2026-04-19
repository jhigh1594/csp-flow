import { cn } from "@/lib/cn";

type Metric = {
  label: string;
  value: string | number;
  className?: string;
};

function StatCard({ label, value, className }: Metric) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-lg border border-border bg-card p-3 text-center">
      <span className={cn("text-xl font-bold", className)}>{value}</span>
      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

type MilestoneHealthMetricsProps = {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
};

export default function MilestoneHealthMetrics({
  totalTasks,
  completedTasks,
  inProgressTasks,
  overdueTasks,
}: MilestoneHealthMetricsProps) {
  const pct =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-5 gap-2">
        <StatCard label="Complete" value={`${pct}%`} className="text-primary" />
        <StatCard label="Total" value={totalTasks} />
        <StatCard
          label="Done"
          value={completedTasks}
          className="text-green-400"
        />
        <StatCard
          label="In Progress"
          value={inProgressTasks}
          className="text-orange-400"
        />
        <StatCard
          label="Overdue"
          value={overdueTasks}
          className={overdueTasks > 0 ? "text-destructive" : undefined}
        />
      </div>

      <div className="flex flex-col gap-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-green-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>
            {completedTasks} of {totalTasks} tasks completed
          </span>
          <span>{pct}%</span>
        </div>
      </div>
    </div>
  );
}
