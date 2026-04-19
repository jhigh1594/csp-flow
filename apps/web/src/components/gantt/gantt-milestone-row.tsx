import { format, parseISO } from "date-fns";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDeleteMilestone } from "@/hooks/mutations/milestone/use-delete-milestone";
import { useUpdateMilestone } from "@/hooks/mutations/milestone/use-update-milestone";
import type { GanttTimeline } from "@/lib/gantt-utils";
import { getColumnIndex } from "@/lib/gantt-utils";
import type Milestone from "@/types/milestone";

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

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={milestone.title}
        className="absolute top-1/2 size-3 -translate-y-1/2 rotate-45 cursor-pointer rounded-[2px] border border-primary/60 bg-primary transition-transform hover:scale-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{
          left: `calc(${colIndex} * ${timeline.columnWidthRem}rem + ${timeline.columnWidthRem / 2}rem - 0.375rem)`,
        }}
      />
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
