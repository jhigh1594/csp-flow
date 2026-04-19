import { format, parseISO } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDeleteMilestone } from "@/hooks/mutations/milestone/use-delete-milestone";
import { useUpdateMilestone } from "@/hooks/mutations/milestone/use-update-milestone";
import type { GanttTimeline } from "@/lib/gantt-utils";
import { getColumnIndex } from "@/lib/gantt-utils";
import type Milestone from "@/types/milestone";

function ProgressRing({
  percentage,
  size = 28,
  strokeWidth = 3,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const color =
    percentage >= 80
      ? "text-green-500"
      : percentage >= 40
        ? "text-primary"
        : "text-amber-500";

  return (
    <svg
      className={color}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      role="img"
      aria-label={`${Math.round(percentage)}% progress`}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        style={{ opacity: 0.2 }}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        fill="none"
        r={radius}
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={strokeWidth}
        style={{
          strokeDasharray: circumference,
          strokeDashoffset: offset,
          transform: "rotate(-90deg)",
          transformOrigin: "50% 50%",
          transition: "stroke-dashoffset 0.3s ease",
        }}
      />
      <text
        className="fill-foreground"
        dominantBaseline="central"
        fontSize={size * 0.33}
        textAnchor="middle"
        x="50%"
        y="50%"
      >
        {Math.round(percentage)}%
      </text>
    </svg>
  );
}

type MilestoneDiamondProps = {
  milestone: Milestone;
  projectId: string;
  timeline: GanttTimeline;
};

function MilestoneDiamond({
  milestone,
  projectId,
  timeline,
}: MilestoneDiamondProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(milestone.title);
  const [dateValue, setDateValue] = useState(
    format(parseISO(milestone.targetDate), "yyyy-MM-dd"),
  );

  const { mutate: updateMilestone, isPending: isUpdating } =
    useUpdateMilestone(projectId);
  const { mutate: deleteMilestone, isPending: isDeleting } =
    useDeleteMilestone(projectId);

  const colIndex = getColumnIndex(
    parseISO(milestone.targetDate),
    timeline.rangeStart,
    timeline.granularity,
  );

  const handleSave = () => {
    updateMilestone(
      { id: milestone.id, title, targetDate: dateValue },
      { onSuccess: () => setOpen(false) },
    );
  };

  const handleDelete = () => {
    deleteMilestone(milestone.id, { onSuccess: () => setOpen(false) });
  };

  const totalTasks = milestone.totalTasks ?? 0;
  const completedTasks = milestone.completedTasks ?? 0;
  const percentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <TooltipProvider delay={300}>
      <Tooltip>
        <Popover open={open} onOpenChange={setOpen}>
          <TooltipTrigger asChild>
            <PopoverTrigger
              aria-label={milestone.title}
              className="absolute top-1/2 size-3 -translate-y-1/2 rotate-45 cursor-pointer rounded-[2px] border border-primary/60 bg-primary transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{
                left: `calc(${colIndex} * ${timeline.columnWidthRem}rem + ${timeline.columnWidthRem / 2}rem - 0.375rem)`,
              }}
            />
          </TooltipTrigger>
          <PopoverContent className="w-56 p-0" side="top">
            <div className="flex flex-col gap-3 p-3">
              <p className="truncate text-xs font-semibold text-foreground">
                {milestone.title}
              </p>
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[11px] text-muted-foreground"
                  htmlFor={`ms-title-${milestone.id}`}
                >
                  Title
                </label>
                <Input
                  id={`ms-title-${milestone.id}`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label
                  className="text-[11px] text-muted-foreground"
                  htmlFor={`ms-date-${milestone.id}`}
                >
                  Target date
                </label>
                <Input
                  id={`ms-date-${milestone.id}`}
                  type="date"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="h-7 text-xs"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={isUpdating}
                  onClick={handleSave}
                  size="xs"
                >
                  Save
                </Button>
                <Button
                  disabled={isDeleting}
                  onClick={handleDelete}
                  size="xs"
                  variant="destructive"
                >
                  Delete
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        <TooltipContent className="px-3 py-2" side="top" sideOffset={8}>
          <div className="flex flex-col gap-1.5">
            <p className="truncate text-xs font-semibold text-popover-foreground">
              {milestone.title}
            </p>
            <div className="flex items-center gap-2">
              <ProgressRing percentage={percentage} />
              <span className="text-[11px] text-muted-foreground">
                {completedTasks}/{totalTasks} tasks
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {format(parseISO(milestone.targetDate), "MMM d, yyyy")}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

type GanttMilestoneRowProps = {
  milestones: Milestone[];
  timeline: GanttTimeline;
  projectId: string;
  showTaskRail: boolean;
  taskColumnWidthRem: number;
  isMobile: boolean;
};

export function GanttMilestoneRow({
  milestones,
  timeline,
  projectId,
  showTaskRail,
  taskColumnWidthRem,
  isMobile,
}: GanttMilestoneRowProps) {
  const railWidth = isMobile ? `${taskColumnWidthRem}rem` : "20rem";
  const gridCols = showTaskRail ? `${railWidth} max-content` : "max-content";

  return (
    <div
      className="grid items-stretch border-b border-border/70"
      style={{ gridTemplateColumns: gridCols }}
    >
      {showTaskRail ? (
        <div
          className="sticky left-0 z-[11] flex h-7 items-center border-r border-border bg-background px-2 sm:px-3"
          style={{ width: isMobile ? railWidth : undefined }}
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Milestones
          </p>
        </div>
      ) : null}
      <div
        className="relative h-7 shrink-0"
        style={{ minWidth: `${timeline.timelineMinWidthRem}rem` }}
      >
        {milestones.map((milestone) => (
          <MilestoneDiamond
            key={milestone.id}
            milestone={milestone}
            projectId={projectId}
            timeline={timeline}
          />
        ))}
      </div>
    </div>
  );
}

type MilestoneLinesProps = {
  milestones: Milestone[];
  timeline: GanttTimeline;
  taskRailOffsetRem: number;
};

export function GanttMilestoneLines({
  milestones,
  timeline,
  taskRailOffsetRem,
}: MilestoneLinesProps) {
  return (
    <>
      {milestones.map((milestone) => {
        const colIndex = getColumnIndex(
          parseISO(milestone.targetDate),
          timeline.rangeStart,
          timeline.granularity,
        );

        return (
          <div
            key={milestone.id}
            className="absolute top-0 z-[5] h-full w-0 border-l-2 border-dashed border-primary/30"
            style={{
              left: `calc(${taskRailOffsetRem}rem + ${colIndex} * ${timeline.columnWidthRem}rem + ${timeline.columnWidthRem / 2}rem)`,
            }}
          />
        );
      })}
    </>
  );
}
