import {
  addDays,
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  startOfDay,
} from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useUpdateTask } from "@/hooks/mutations/task/use-update-task";
import { cn } from "@/lib/cn";
import { getGanttStatusColors } from "@/lib/gantt-status-colors";
import {
  type GanttTimeline,
  getColumnIndex,
  type ZoomLevel,
} from "@/lib/gantt-utils";
import { toast } from "@/lib/toast";
import type Task from "@/types/task";

const CLICK_MOVE_THRESHOLD_PX = 4;
const MOBILE_MOVE_THRESHOLD_PX = 14;

type ScheduledTask = Task & {
  scheduleStart: Date;
  scheduleEnd: Date;
};

type GanttTaskBarProps = {
  task: ScheduledTask;
  timeline: GanttTimeline;
  pixelsPerColumn: number;
  isMobile?: boolean;
  onOpenTask: () => void;
};

function getBarGridColumns(
  scheduleStart: Date,
  scheduleEnd: Date,
  timeline: GanttTimeline,
): { barInView: boolean; lineStart: number; lineEnd: number } {
  const trackCount = timeline.days.length;
  const startIndex = getColumnIndex(
    scheduleStart,
    timeline.rangeStart,
    timeline.granularity,
  );
  const endIndex = getColumnIndex(
    scheduleEnd,
    timeline.rangeStart,
    timeline.granularity,
  );
  const barInView = endIndex >= 0 && startIndex < trackCount && trackCount > 0;
  if (!barInView) {
    return { barInView: false, lineStart: 1, lineEnd: 1 };
  }
  const lineStart = Math.max(1, Math.min(startIndex + 1, trackCount));
  const lineEnd = Math.max(
    lineStart + 1,
    Math.min(endIndex + 2, trackCount + 1),
  );
  return { barInView: true, lineStart, lineEnd };
}

function toIsoDay(d: Date) {
  return startOfDay(d).toISOString();
}

function shiftDateByColumns(
  date: Date,
  columns: number,
  granularity: ZoomLevel,
) {
  if (columns === 0) return date;
  if (granularity === "day") return addDays(date, columns);
  if (granularity === "week") return addWeeks(date, columns);
  return addMonths(date, columns);
}

function clampDelta(raw: number, min: number, max: number) {
  if (min > max) return 0;
  return Math.max(min, Math.min(raw, max));
}

export function GanttTaskBar({
  task,
  timeline,
  pixelsPerColumn,
  isMobile = false,
  onOpenTask,
}: GanttTaskBarProps) {
  const { t } = useTranslation();
  const { mutateAsync: updateTask } = useUpdateTask();
  const [dragDisplay, setDragDisplay] = useState<{
    start: Date;
    end: Date;
  } | null>(null);

  // Drop the drag overlay once server data matches
  useEffect(() => {
    if (!dragDisplay) return;
    const startMatches =
      differenceInCalendarDays(task.scheduleStart, dragDisplay.start) === 0;
    const endMatches =
      differenceInCalendarDays(task.scheduleEnd, dragDisplay.end) === 0;
    if (startMatches && endMatches) {
      setDragDisplay(null);
    }
  }, [dragDisplay, task.scheduleEnd, task.scheduleStart]);

  const displayStart = dragDisplay?.start ?? task.scheduleStart;
  const displayEnd = dragDisplay?.end ?? task.scheduleEnd;

  const { barInView, lineStart, lineEnd } = getBarGridColumns(
    displayStart,
    displayEnd,
    timeline,
  );

  const persistDates = useCallback(
    async (nextStart: Date, nextEnd: Date): Promise<boolean> => {
      try {
        await updateTask({
          ...task,
          startDate: toIsoDay(nextStart),
          dueDate: toIsoDay(nextEnd),
        });
        return true;
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : t("tasks:gantt.updateDatesError"),
        );
        return false;
      }
    },
    [task, updateTask, t],
  );

  const pxPerColumn = Math.max(pixelsPerColumn, 1e-6);
  const moveThresholdPx = isMobile
    ? MOBILE_MOVE_THRESHOLD_PX
    : CLICK_MOVE_THRESHOLD_PX;

  const handleResizeLeftPointerDown = (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const originX = event.clientX;
    const initialStart = task.scheduleStart;
    const initialEnd = task.scheduleEnd;
    const startIdx = getColumnIndex(
      initialStart,
      timeline.rangeStart,
      timeline.granularity,
    );
    const endIdx = getColumnIndex(
      initialEnd,
      timeline.rangeStart,
      timeline.granularity,
    );

    const minDelta = -startIdx;
    const maxDelta = endIdx - startIdx;

    const onMove = (ev: PointerEvent) => {
      const rawDelta = Math.round((ev.clientX - originX) / pxPerColumn);
      const delta = clampDelta(rawDelta, minDelta, maxDelta);
      const nextStart = shiftDateByColumns(
        initialStart,
        delta,
        timeline.granularity,
      );
      setDragDisplay({ start: nextStart, end: initialEnd });
    };

    const onUp = async (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      if (ev.type === "pointercancel") {
        setDragDisplay(null);
        return;
      }
      const rawDelta = Math.round((ev.clientX - originX) / pxPerColumn);
      const delta = clampDelta(rawDelta, minDelta, maxDelta);
      const nextStart = shiftDateByColumns(
        initialStart,
        delta,
        timeline.granularity,
      );
      if (nextStart.getTime() === initialStart.getTime()) {
        setDragDisplay(null);
        return;
      }
      const ok = await persistDates(nextStart, initialEnd);
      if (!ok) {
        setDragDisplay(null);
      }
    };

    const onCancel = onUp;

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };

  const handleResizeRightPointerDown = (event: React.PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const originX = event.clientX;
    const initialStart = task.scheduleStart;
    const initialEnd = task.scheduleEnd;
    const trackCount = timeline.days.length;
    const startIdx = getColumnIndex(
      initialStart,
      timeline.rangeStart,
      timeline.granularity,
    );
    const endIdx = getColumnIndex(
      initialEnd,
      timeline.rangeStart,
      timeline.granularity,
    );

    const minDelta = startIdx - endIdx;
    const maxDelta = trackCount - 1 - endIdx;

    const onMove = (ev: PointerEvent) => {
      const rawDelta = Math.round((ev.clientX - originX) / pxPerColumn);
      const delta = clampDelta(rawDelta, minDelta, maxDelta);
      const nextEnd = shiftDateByColumns(
        initialEnd,
        delta,
        timeline.granularity,
      );
      setDragDisplay({ start: initialStart, end: nextEnd });
    };

    const onUp = async (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      if (ev.type === "pointercancel") {
        setDragDisplay(null);
        return;
      }
      const rawDelta = Math.round((ev.clientX - originX) / pxPerColumn);
      const delta = clampDelta(rawDelta, minDelta, maxDelta);
      const nextEnd = shiftDateByColumns(
        initialEnd,
        delta,
        timeline.granularity,
      );
      if (nextEnd.getTime() === initialEnd.getTime()) {
        setDragDisplay(null);
        return;
      }
      const ok = await persistDates(initialStart, nextEnd);
      if (!ok) {
        setDragDisplay(null);
      }
    };

    const onCancel = onUp;

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };

  const handleMovePointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const originX = event.clientX;
    const initialStart = task.scheduleStart;
    const initialEnd = task.scheduleEnd;
    const startColumn = getColumnIndex(
      initialStart,
      timeline.rangeStart,
      timeline.granularity,
    );
    const endColumn = getColumnIndex(
      initialEnd,
      timeline.rangeStart,
      timeline.granularity,
    );
    const spanColumns = Math.max(0, endColumn - startColumn);
    const minDelta = -startColumn;
    const maxDelta = timeline.days.length - 1 - startColumn - spanColumns;

    const onMove = (ev: PointerEvent) => {
      const rawDelta = Math.round((ev.clientX - originX) / pxPerColumn);
      const delta = clampDelta(rawDelta, minDelta, maxDelta);
      const nextStart = shiftDateByColumns(
        initialStart,
        delta,
        timeline.granularity,
      );
      const nextEnd = shiftDateByColumns(
        initialEnd,
        delta,
        timeline.granularity,
      );
      setDragDisplay({ start: nextStart, end: nextEnd });
    };

    const onUp = async (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      if (ev.type === "pointercancel") {
        setDragDisplay(null);
        return;
      }
      const moved = Math.abs(ev.clientX - originX);
      const rawDelta = Math.round((ev.clientX - originX) / pxPerColumn);
      const delta = clampDelta(rawDelta, minDelta, maxDelta);
      const nextStart = shiftDateByColumns(
        initialStart,
        delta,
        timeline.granularity,
      );
      const nextEnd = shiftDateByColumns(
        initialEnd,
        delta,
        timeline.granularity,
      );

      if (moved < moveThresholdPx) {
        setDragDisplay(null);
        onOpenTask();
        return;
      }
      if (
        nextStart.getTime() === initialStart.getTime() &&
        nextEnd.getTime() === initialEnd.getTime()
      ) {
        setDragDisplay(null);
        return;
      }
      const ok = await persistDates(nextStart, nextEnd);
      if (!ok) {
        setDragDisplay(null);
      }
    };

    const onCancel = onUp;

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
  };

  if (!barInView || lineEnd <= lineStart) {
    return null;
  }

  const colors = getGanttStatusColors(task.status);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[1] grid items-center"
      style={{
        gridTemplateColumns: timeline.gridTemplateColumns,
      }}
    >
      <div
        style={{ gridColumn: `${lineStart} / ${lineEnd}` }}
        className={cn(
          "group pointer-events-auto relative mx-1 flex min-h-[44px] min-w-0 items-stretch overflow-hidden rounded-md border bg-background text-left text-sm font-medium leading-none text-foreground shadow-sm transition-colors sm:h-11 sm:min-h-0",
          colors.border,
          colors.borderHover,
        )}
      >
        <button
          type="button"
          aria-label={t("tasks:gantt.resizeStart")}
          onPointerDown={handleResizeLeftPointerDown}
          className={cn(
            "relative z-20 shrink-0 cursor-ew-resize touch-none border-r",
            colors.handleBorder,
            colors.handleBg,
            colors.handleBgHover,
            "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:w-2",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          )}
        />
        <button
          type="button"
          aria-label={t("tasks:gantt.taskAriaLabel", { title: task.title })}
          className="relative z-10 min-h-[44px] min-w-0 flex-1 cursor-grab touch-manipulation overflow-hidden px-2 text-left active:cursor-grabbing sm:min-h-0 sm:px-2.5"
          onPointerDown={handleMovePointerDown}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onOpenTask();
            }
          }}
        >
          <div
            className={cn(
              "absolute inset-0 z-0 transition-colors",
              colors.fillBg,
              colors.fillBgHover,
            )}
          />
          <span className="relative z-10 block truncate">{task.title}</span>
        </button>
        <button
          type="button"
          aria-label={t("tasks:gantt.resizeDue")}
          onPointerDown={handleResizeRightPointerDown}
          className={cn(
            "relative z-20 shrink-0 cursor-ew-resize touch-none border-l",
            colors.handleBorder,
            colors.handleBg,
            colors.handleBgHover,
            "min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 sm:w-2",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
          )}
        />
      </div>
    </div>
  );
}
