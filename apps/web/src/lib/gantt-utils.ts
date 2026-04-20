import {
  addMonths,
  differenceInCalendarDays,
  differenceInCalendarMonths,
  differenceInCalendarWeeks,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachWeekOfInterval,
  endOfMonth,
  endOfWeek,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from "date-fns";

export type ZoomLevel = "day" | "week" | "month";

export type GanttTimeline = {
  days: Date[];
  rangeStart: Date;
  granularity: ZoomLevel;
  gridTemplateColumns: string;
  timelineMinWidthRem: number;
  columnWidthRem: number;
};

type ScheduledTask = {
  scheduleStart: Date;
  scheduleEnd: Date;
};

const DEFAULT_COLUMN_WIDTHS: Record<ZoomLevel, number> = {
  day: 2.75,
  week: 5,
  month: 7,
};

export function buildTimeline(
  tasks: ScheduledTask[],
  zoom: ZoomLevel,
  columnWidthRemOverride?: number,
): GanttTimeline | null {
  if (tasks.length === 0) return null;

  const earliest = tasks.reduce(
    (cur, t) => (t.scheduleStart < cur ? t.scheduleStart : cur),
    tasks[0].scheduleStart,
  );

  const now = new Date();
  let rangeStart: Date;
  let days: Date[];

  if (zoom === "day") {
    rangeStart = subDays(startOfWeek(earliest, { weekStartsOn: 1 }), 7);
    const rangeEnd = endOfMonth(addMonths(now, 24));
    days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  } else if (zoom === "week") {
    rangeStart = startOfWeek(
      subWeeks(startOfWeek(earliest, { weekStartsOn: 1 }), 2),
      { weekStartsOn: 1 },
    );
    const rangeEnd = endOfWeek(addMonths(now, 36), { weekStartsOn: 1 });
    days = eachWeekOfInterval(
      { start: rangeStart, end: rangeEnd },
      { weekStartsOn: 1 },
    );
  } else {
    rangeStart = startOfMonth(subMonths(earliest, 1));
    const rangeEnd = endOfMonth(addMonths(now, 60));
    days = eachMonthOfInterval({ start: rangeStart, end: rangeEnd });
  }

  const columnWidthRem = columnWidthRemOverride ?? DEFAULT_COLUMN_WIDTHS[zoom];

  return {
    days,
    rangeStart,
    granularity: zoom,
    gridTemplateColumns: `repeat(${days.length}, minmax(${columnWidthRem}rem, ${columnWidthRem}rem))`,
    timelineMinWidthRem: days.length * columnWidthRem,
    columnWidthRem,
  };
}

export function getColumnIndex(
  date: Date,
  rangeStart: Date,
  granularity: ZoomLevel,
): number {
  if (granularity === "day") {
    return differenceInCalendarDays(date, rangeStart);
  }
  if (granularity === "week") {
    return differenceInCalendarWeeks(date, rangeStart, { weekStartsOn: 1 });
  }
  return differenceInCalendarMonths(date, rangeStart);
}
