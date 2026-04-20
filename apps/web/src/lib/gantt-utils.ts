import {
  addDays,
  addMonths,
  addWeeks,
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
  extraDates?: Date[],
): GanttTimeline | null {
  if (tasks.length === 0) return null;

  const earliest = tasks.reduce(
    (cur, t) => (t.scheduleStart < cur ? t.scheduleStart : cur),
    tasks[0].scheduleStart,
  );
  let latest = tasks.reduce(
    (cur, t) => (t.scheduleEnd > cur ? t.scheduleEnd : cur),
    tasks[0].scheduleEnd,
  );

  // Always extend to today so the current date is visible
  const today = new Date();
  if (today > latest) latest = today;

  if (extraDates) {
    for (const d of extraDates) {
      if (d > latest) latest = d;
    }
  }

  let rangeStart: Date;
  let days: Date[];

  if (zoom === "day") {
    const weekStart = startOfWeek(earliest, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(latest, { weekStartsOn: 1 });
    rangeStart = subDays(weekStart, 7);
    const rangeEnd = addDays(weekEnd, 28);
    days = eachDayOfInterval({ start: rangeStart, end: rangeEnd });
  } else if (zoom === "week") {
    const ws = startOfWeek(earliest, { weekStartsOn: 1 });
    const we = endOfWeek(latest, { weekStartsOn: 1 });
    rangeStart = startOfWeek(subWeeks(ws, 2), { weekStartsOn: 1 });
    const rangeEnd = endOfWeek(addWeeks(we, 6), { weekStartsOn: 1 });
    days = eachWeekOfInterval(
      { start: rangeStart, end: rangeEnd },
      { weekStartsOn: 1 },
    );
  } else {
    rangeStart = startOfMonth(subMonths(earliest, 1));
    const rangeEnd = endOfMonth(addMonths(latest, 3));
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
