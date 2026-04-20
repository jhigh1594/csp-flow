import {
  closestCorners,
  DndContext,
  type DragEndEvent,
  DragOverlay,
  type DragStartEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  format,
  isSameMonth,
  isSameWeek,
  isToday,
  isWeekend,
  parseISO,
} from "date-fns";
import {
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Layers,
  Search,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import ProjectLayout from "@/components/common/project-layout";
import {
  GanttMilestoneLines,
  GanttMilestoneRow,
} from "@/components/gantt/gantt-milestone-row";
import { GanttTaskBar } from "@/components/gantt/gantt-task-bar";
import MilestoneFormDialog from "@/components/milestone/milestone-form-dialog";
import PageTitle from "@/components/page-title";
import TaskDetailsSheet from "@/components/task/task-details-sheet";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { DEFAULT_COLUMNS } from "@/constants/columns";
import { useUpdateTask } from "@/hooks/mutations/task/use-update-task";
import { useUpdateTaskRoadmapGroup } from "@/hooks/mutations/task/use-update-task-roadmap-group";
import { useGetMilestones } from "@/hooks/queries/milestone/use-get-milestones";
import { useGetTasks } from "@/hooks/queries/task/use-get-tasks";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/cn";
import type { ZoomLevel } from "@/lib/gantt-utils";
import { buildTimeline, getColumnIndex } from "@/lib/gantt-utils";
import { getStatusLabel } from "@/lib/i18n/domain";

type GroupByMode = "status" | "roadmap" | "priority" | "assignee" | "none";

const ROADMAP_GROUPS = ["now", "next", "later"] as const;
const ROADMAP_LABELS: Record<string, string> = {
  now: "Now",
  next: "Next",
  later: "Later",
};

type GanttSearchParams = {
  taskId?: string;
};

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/project/$projectId/gantt",
)({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): GanttSearchParams => ({
    taskId: typeof search.taskId === "string" ? search.taskId : undefined,
  }),
});

function parseTaskDate(value: string | null) {
  if (!value) return null;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function DroppableGroup({
  groupId,
  children,
}: {
  groupId: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: groupId });
  return (
    <div
      ref={setNodeRef}
      className={cn(isOver && "ring-2 ring-primary/30 ring-inset")}
    >
      {children}
    </div>
  );
}

function DraggableTask({
  taskId,
  children,
}: {
  taskId: string;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: taskId,
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(isDragging && "opacity-50")}
    >
      {children}
    </div>
  );
}

function RouteComponent() {
  const { t } = useTranslation();
  const { projectId, workspaceId } = Route.useParams();
  const { taskId } = Route.useSearch();
  const navigate = useNavigate();
  const { data: project } = useGetTasks(projectId);
  const [searchQuery, setSearchQuery] = useState("");
  const isMobile = useIsMobile();
  const [isTaskRailOpen, setIsTaskRailOpen] = useState(false);
  const [zoom, setZoom] = useState<ZoomLevel>("day");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );
  const [groupBy, setGroupBy] = useState<GroupByMode>("status");

  const { data: milestones = [] } = useGetMilestones(projectId);
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const updateTaskRoadmapGroup = useUpdateTaskRoadmapGroup();
  const updateTaskMutation = useUpdateTask();

  const dndSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setDraggedTaskId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggedTaskId(null);
    if (!over) return;

    const taskId = active.id as string;
    const targetGroup = over.id as string;

    const task = parsedTasks.find((t) => t.id === taskId);
    if (!task) return;

    if (groupBy === "roadmap") {
      if (task.roadmapGroup === targetGroup) return;
      updateTaskRoadmapGroup.mutate({
        ...task,
        roadmapGroup: targetGroup,
      });
    } else if (groupBy === "priority") {
      if (task.priority === targetGroup) return;
      updateTaskMutation.mutate({
        ...task,
        priority: targetGroup,
      });
    } else if (groupBy === "assignee") {
      if (task.assigneeName === targetGroup) return;
    }
  };

  const taskColumnWidthRem = isMobile ? 12 : 14;
  const showTaskRail = !isMobile || isTaskRailOpen;
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const timelineTrackRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolled = useRef(false);
  const [pixelsPerColumn, setPixelsPerColumn] = useState(44);

  useEffect(() => {
    if (!isMobile) {
      setIsTaskRailOpen(true);
      return;
    }

    setIsTaskRailOpen(false);
  }, [isMobile]);

  const allTasks = useMemo(
    () => [
      ...(project?.columns.flatMap((column) => column.tasks) ?? []),
      ...(project?.plannedTasks ?? []),
    ],
    [project],
  );

  const parsedTasks = useMemo(() => {
    return allTasks
      .map((task) => {
        const parsedStart =
          parseTaskDate(task.startDate) ?? parseTaskDate(task.dueDate);
        const parsedEnd =
          parseTaskDate(task.dueDate) ?? parseTaskDate(task.startDate);

        if (!parsedStart || !parsedEnd) return null;

        const start = parsedStart <= parsedEnd ? parsedStart : parsedEnd;
        const end = parsedEnd >= parsedStart ? parsedEnd : parsedStart;

        return {
          ...task,
          scheduleStart: start,
          scheduleEnd: end,
        };
      })
      .filter((task): task is NonNullable<typeof task> => task !== null)
      .sort(
        (left, right) =>
          left.scheduleStart.getTime() - right.scheduleStart.getTime(),
      );
  }, [allTasks]);

  const taskGroups = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const matchesQuery = (task: (typeof parsedTasks)[number]) => {
      if (!normalizedQuery) return true;
      return (
        task.title.toLowerCase().includes(normalizedQuery) ||
        `${project?.slug ?? ""}-${task.number ?? ""}`
          .toLowerCase()
          .includes(normalizedQuery) ||
        task.status.toLowerCase().includes(normalizedQuery)
      );
    };

    const filteredTasks = parsedTasks.filter(matchesQuery);

    type Group = {
      columnId: string;
      columnName: string;
      icon: typeof Clock;
      tasks: typeof parsedTasks;
    };

    if (groupBy === "none") {
      return filteredTasks.length > 0
        ? [
            {
              columnId: "all",
              columnName: "Tasks",
              icon: Layers,
              tasks: filteredTasks,
            },
          ]
        : [];
    }

    if (groupBy === "roadmap") {
      const grouped = new Map<string, typeof parsedTasks>();
      for (const task of filteredTasks) {
        const key = task.roadmapGroup ?? "later";
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)?.push(task);
      }

      return ROADMAP_GROUPS.filter((g) => grouped.has(g)).map((g) => ({
        columnId: g,
        columnName: ROADMAP_LABELS[g],
        icon: Layers,
        tasks: grouped.get(g) ?? [],
      }));
    }

    if (groupBy === "priority") {
      const priorityOrder = ["urgent", "high", "medium", "low", "no-priority"];
      const grouped = new Map<string, typeof parsedTasks>();
      for (const task of filteredTasks) {
        const key = task.priority ?? "no-priority";
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)?.push(task);
      }

      return priorityOrder
        .filter((p) => grouped.has(p))
        .map((p) => ({
          columnId: p,
          columnName: p
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          icon: Flag,
          tasks: grouped.get(p) ?? [],
        }));
    }

    if (groupBy === "assignee") {
      const grouped = new Map<string, typeof parsedTasks>();
      for (const task of filteredTasks) {
        const key = task.assigneeName ?? "Unassigned";
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key)?.push(task);
      }

      return Array.from(grouped.entries()).map(([name, tasks]) => ({
        columnId: name,
        columnName: name,
        icon: Clock,
        tasks,
      }));
    }

    // Default: group by status (existing behavior)
    const parsedMap = new Map(parsedTasks.map((t) => [t.id, t]));

    const groups: Group[] = [];

    const plannedTasks = (project?.plannedTasks ?? [])
      .map((t) => parsedMap.get(t.id))
      .filter((t): t is NonNullable<typeof t> => !!t && matchesQuery(t));

    if (plannedTasks.length > 0) {
      groups.push({
        columnId: "planned",
        columnName: t("tasks:gantt.groupPlanned"),
        icon: Clock,
        tasks: plannedTasks,
      });
    }

    for (const column of project?.columns ?? []) {
      const tasks = column.tasks
        .map((task) => parsedMap.get(task.id))
        .filter(
          (task): task is NonNullable<typeof task> =>
            !!task && matchesQuery(task),
        );

      if (tasks.length === 0) continue;

      const defaultCol = DEFAULT_COLUMNS.find((c) => c.id === column.slug);
      groups.push({
        columnId: column.id,
        columnName: column.name,
        icon: (defaultCol?.icon ?? Clock) as typeof Clock,
        tasks,
      });
    }

    return groups;
  }, [
    parsedTasks,
    project?.columns,
    project?.plannedTasks,
    project?.slug,
    searchQuery,
    groupBy,
    t,
  ]);

  const toggleGroup = (columnId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(columnId)) {
        next.delete(columnId);
      } else {
        next.add(columnId);
      }
      return next;
    });
  };

  const effectiveZoom: ZoomLevel = isMobile ? "day" : zoom;
  const mobileColWidth = isMobile ? 3.125 : undefined;

  const timeline = useMemo(
    () => buildTimeline(parsedTasks, effectiveZoom, mobileColWidth),
    [parsedTasks, effectiveZoom, mobileColWidth],
  );

  useLayoutEffect(() => {
    const element = timelineTrackRef.current;
    if (!element || !timeline) return;

    const update = () => {
      const count = timeline.days.length;
      if (count <= 0) return;
      setPixelsPerColumn(element.clientWidth / count);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [timeline]);

  const handleScrollToToday = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      const container = scrollContainerRef.current;
      if (!container || !timeline) return;
      const rootFontSize = Number.parseFloat(
        getComputedStyle(document.documentElement).fontSize,
      );
      const columnWidthPx = timeline.columnWidthRem * rootFontSize;
      const todayColIdx = getColumnIndex(
        new Date(),
        timeline.rangeStart,
        timeline.granularity,
      );
      const railWidthPx = showTaskRail
        ? (isMobile ? taskColumnWidthRem : 20) * rootFontSize
        : 0;
      const offset =
        railWidthPx +
        todayColIdx * columnWidthPx -
        (container.clientWidth - railWidthPx) / 2 +
        columnWidthPx / 2;
      container.scrollTo({ left: Math.max(0, offset), behavior });
    },
    [timeline, showTaskRail, isMobile, taskColumnWidthRem],
  );

  useLayoutEffect(() => {
    if (hasAutoScrolled.current || !timeline) return;
    hasAutoScrolled.current = true;
    handleScrollToToday("instant");
  }, [timeline, handleScrollToToday]);

  return (
    <ProjectLayout
      projectId={projectId}
      workspaceId={workspaceId}
      activeView="gantt"
    >
      <PageTitle
        title={t("tasks:gantt.pageTitle", { name: project?.name })}
        hideAppName
      />
      <div className="flex h-full min-h-0 flex-col bg-background">
        <div className="border-b border-border/80 px-3 py-3 sm:px-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <h1 className="text-sm font-semibold text-foreground">
                {t("tasks:gantt.title")}
              </h1>
            </div>

            <div className="relative w-full max-w-sm">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={t("tasks:gantt.searchPlaceholder")}
                className="h-9 min-h-11 touch-manipulation sm:h-8 sm:min-h-0 [&_[data-slot=input]]:pl-8 [&_[data-slot=input]]:text-xs"
              />
            </div>

            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex overflow-hidden rounded-md border border-border">
                {(
                  [
                    "status",
                    "roadmap",
                    "priority",
                    "assignee",
                    "none",
                  ] as GroupByMode[]
                ).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setGroupBy(mode);
                      setCollapsedGroups(new Set());
                    }}
                    className={cn(
                      "px-2 py-1 text-xs font-medium capitalize transition-colors",
                      groupBy === mode
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {mode === "roadmap"
                      ? "N/N/L"
                      : mode === "none"
                        ? "Flat"
                        : mode}
                  </button>
                ))}
              </div>
              <div className="flex overflow-hidden rounded-md border border-border">
                {(["day", "week", "month"] as ZoomLevel[]).map((z) => (
                  <button
                    key={z}
                    type="button"
                    onClick={() => setZoom(z)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium capitalize transition-colors",
                      zoom === z
                        ? "bg-primary text-primary-foreground"
                        : "bg-background text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {z.charAt(0).toUpperCase() + z.slice(1)}
                  </button>
                ))}
              </div>
              <Button
                variant="outline"
                size="xs"
                disabled={!timeline}
                onClick={() => handleScrollToToday()}
              >
                <Calendar className="size-3.5" />
                {t("tasks:gantt.today")}
              </Button>

              <Button
                variant="outline"
                size="xs"
                onClick={() => setMilestoneDialogOpen(true)}
              >
                <Flag className="size-3.5" />
                Milestone
              </Button>
              <MilestoneFormDialog
                open={milestoneDialogOpen}
                onOpenChange={setMilestoneDialogOpen}
                projectId={projectId}
              />
            </div>

            <Button
              variant="outline"
              size="xs"
              className="min-h-11 touch-manipulation sm:hidden"
              onClick={() => setIsTaskRailOpen((current) => !current)}
            >
              {showTaskRail ? (
                <ChevronLeft className="size-3.5" />
              ) : (
                <ChevronRight className="size-3.5" />
              )}
              {showTaskRail
                ? t("tasks:gantt.hideTasks")
                : t("tasks:gantt.showTasks")}
            </Button>
          </div>
        </div>

        {!timeline || parsedTasks.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="max-w-sm text-center">
              <h2 className="text-sm font-semibold text-foreground">
                {t("tasks:gantt.noTasks")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("tasks:gantt.noTasksSubtitle")}
              </p>
            </div>
          </div>
        ) : taskGroups.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-6">
            <div className="max-w-sm text-center">
              <h2 className="text-sm font-semibold text-foreground">
                {t("tasks:gantt.noTasksFound")}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("tasks:gantt.noTasksMatch", { query: searchQuery })}
              </p>
            </div>
          </div>
        ) : (
          <div
            ref={scrollContainerRef}
            className="min-h-0 flex-1 overflow-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]"
          >
            <div className="relative min-w-max touch-pan-x touch-pan-y">
              <div className="sticky top-0 z-20 flex border-b border-border bg-background/95 backdrop-blur">
                {showTaskRail ? (
                  <div
                    className="sticky left-0 z-30 shrink-0 border-r border-border bg-background px-2 py-2.5 sm:w-80 sm:px-4 sm:py-3"
                    style={{
                      width: isMobile ? `${taskColumnWidthRem}rem` : undefined,
                    }}
                  >
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {t("tasks:gantt.taskHeader")}
                    </p>
                  </div>
                ) : null}
                <div
                  className="grid shrink-0"
                  style={{
                    gridTemplateColumns: timeline.gridTemplateColumns,
                    minWidth: `${timeline.timelineMinWidthRem}rem`,
                  }}
                >
                  {timeline.days.map((day, index) => {
                    const prev = timeline.days[index - 1];
                    const isCurrentCol =
                      timeline.granularity === "day"
                        ? isToday(day)
                        : timeline.granularity === "week"
                          ? isSameWeek(new Date(), day, { weekStartsOn: 1 })
                          : isSameMonth(new Date(), day);

                    let secondaryLabel = "";
                    let primaryLabel = "";
                    if (timeline.granularity === "day") {
                      const showMonthLabel =
                        index === 0 || !isSameMonth(day, prev ?? day);
                      secondaryLabel = showMonthLabel ? format(day, "MMM") : "";
                      primaryLabel = format(day, "d");
                    } else if (timeline.granularity === "week") {
                      const showMonthLabel =
                        index === 0 || !isSameMonth(day, prev ?? day);
                      secondaryLabel = showMonthLabel ? format(day, "MMM") : "";
                      primaryLabel = format(day, "d");
                    } else {
                      const showYearLabel =
                        index === 0 ||
                        day.getFullYear() !== (prev ?? day).getFullYear();
                      secondaryLabel = showYearLabel ? format(day, "yyyy") : "";
                      primaryLabel = format(day, "MMM");
                    }

                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "px-0.5 py-2 text-center sm:px-1",
                          timeline.granularity === "day" &&
                            isWeekend(day) &&
                            "bg-muted/25",
                        )}
                      >
                        <div className="h-4 text-[10px] font-medium text-muted-foreground">
                          {secondaryLabel}
                        </div>
                        <div
                          className={cn(
                            "mx-auto flex size-6 items-center justify-center rounded-full text-xs font-medium",
                            isCurrentCol &&
                              "bg-primary text-primary-foreground",
                          )}
                        >
                          {primaryLabel}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="relative">
                <div
                  ref={timelineTrackRef}
                  className="absolute inset-y-0 z-0 grid"
                  style={{
                    left: showTaskRail
                      ? isMobile
                        ? `${taskColumnWidthRem}rem`
                        : "20rem"
                      : "0rem",
                    gridTemplateColumns: timeline.gridTemplateColumns,
                    width: `${timeline.timelineMinWidthRem}rem`,
                  }}
                >
                  {timeline.days.map((day) => (
                    <div
                      key={`bg-line-${day.toISOString()}`}
                      className={cn(
                        "h-full min-h-0",
                        timeline.granularity === "day" &&
                          isWeekend(day) &&
                          "bg-muted/25",
                      )}
                    />
                  ))}
                </div>

                <div className="relative z-10 flex flex-col">
                  {!isMobile && milestones.length > 0 && (
                    <GanttMilestoneRow
                      isMobile={isMobile}
                      milestones={milestones}
                      projectId={projectId}
                      showTaskRail={showTaskRail}
                      taskColumnWidthRem={taskColumnWidthRem}
                      timeline={timeline}
                    />
                  )}
                  <div className="relative">
                    {!isMobile && milestones.length > 0 && (
                      <GanttMilestoneLines
                        milestones={milestones}
                        timeline={timeline}
                        taskRailOffsetRem={showTaskRail ? 20 : 0}
                      />
                    )}
                    <DndContext
                      sensors={dndSensors}
                      collisionDetection={closestCorners}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    >
                      <DragOverlay>
                        {draggedTaskId ? (
                          <div className="rounded border border-primary/50 bg-background px-3 py-1.5 text-xs font-medium shadow-lg">
                            {
                              parsedTasks.find((t) => t.id === draggedTaskId)
                                ?.title
                            }
                          </div>
                        ) : null}
                      </DragOverlay>
                      {taskGroups.map((group) => {
                        const GroupIcon = group.icon;
                        const isCollapsed = collapsedGroups.has(group.columnId);
                        const railWidth = isMobile
                          ? `${taskColumnWidthRem}rem`
                          : "20rem";
                        const gridCols = showTaskRail
                          ? `${railWidth} max-content`
                          : "max-content";

                        return (
                          <DroppableGroup
                            key={group.columnId}
                            groupId={group.columnId}
                          >
                            <div
                              className="grid items-stretch border-b border-border/70 bg-muted/30"
                              style={{ gridTemplateColumns: gridCols }}
                            >
                              {showTaskRail ? (
                                <div
                                  className="sticky left-0 z-[11] border-r border-border bg-muted/30"
                                  style={{
                                    width: isMobile ? railWidth : undefined,
                                  }}
                                >
                                  <button
                                    type="button"
                                    className="flex min-h-[36px] w-full items-center gap-2 px-2 py-2 text-left transition-colors hover:bg-muted sm:px-3 sm:py-1.5"
                                    onClick={() => toggleGroup(group.columnId)}
                                  >
                                    <GroupIcon className="size-3.5 shrink-0 text-muted-foreground" />
                                    <span className="flex-1 truncate text-xs font-semibold text-foreground">
                                      {group.columnName}
                                    </span>
                                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                                      {group.tasks.length}
                                    </span>
                                    <ChevronDown
                                      className={cn(
                                        "size-3.5 shrink-0 text-muted-foreground transition-transform",
                                        isCollapsed && "-rotate-90",
                                      )}
                                    />
                                  </button>
                                </div>
                              ) : null}
                              <div
                                style={{
                                  minWidth: `${timeline.timelineMinWidthRem}rem`,
                                }}
                              />
                            </div>

                            {!isCollapsed &&
                              group.tasks.map((task) => (
                                <DraggableTask key={task.id} taskId={task.id}>
                                  <div
                                    className="grid items-stretch border-b border-border/70"
                                    style={{ gridTemplateColumns: gridCols }}
                                  >
                                    {showTaskRail ? (
                                      <div className="sticky left-0 z-[11] h-full border-r border-border bg-background">
                                        <button
                                          type="button"
                                          className="flex min-h-[44px] w-full min-w-0 flex-col items-start justify-center gap-0.5 px-2 py-2 text-left transition-colors hover:bg-muted sm:min-h-0 sm:px-3 sm:py-1.5"
                                          onClick={() =>
                                            navigate({
                                              to: ".",
                                              search: { taskId: task.id },
                                              replace: true,
                                            })
                                          }
                                        >
                                          <div className="flex w-full items-center gap-1.5">
                                            <span className="max-w-[7rem] truncate rounded-full bg-secondary px-1.5 py-px text-[10px] font-medium uppercase tracking-wide text-secondary-foreground sm:max-w-none">
                                              {getStatusLabel(task.status)}
                                            </span>
                                            <span className="truncate text-[10px] text-muted-foreground">
                                              {project?.slug}-{task.number}
                                            </span>
                                          </div>
                                          <p className="w-full line-clamp-1 text-sm font-medium leading-tight text-foreground">
                                            {task.title}
                                          </p>
                                          <p className="w-full truncate text-[11px] leading-tight text-muted-foreground">
                                            {format(
                                              task.scheduleStart,
                                              "MMM d",
                                            )}{" "}
                                            -{" "}
                                            {format(task.scheduleEnd, "MMM d")}
                                            {task.assigneeName
                                              ? ` • ${task.assigneeName}`
                                              : ""}
                                          </p>
                                        </button>
                                      </div>
                                    ) : null}

                                    <div
                                      className="relative min-h-11 shrink-0 select-none"
                                      style={{
                                        minWidth: `${timeline.timelineMinWidthRem}rem`,
                                      }}
                                    >
                                      <GanttTaskBar
                                        task={task}
                                        timeline={timeline}
                                        pixelsPerColumn={pixelsPerColumn}
                                        isMobile={isMobile}
                                        onOpenTask={() =>
                                          navigate({
                                            to: ".",
                                            search: { taskId: task.id },
                                            replace: true,
                                          })
                                        }
                                      />
                                    </div>
                                  </div>
                                </DraggableTask>
                              ))}
                          </DroppableGroup>
                        );
                      })}
                    </DndContext>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        <TaskDetailsSheet
          taskId={taskId}
          projectId={projectId}
          workspaceId={workspaceId}
          onClose={() =>
            navigate({
              to: ".",
              search: {},
              replace: true,
            })
          }
        />
      </div>
    </ProjectLayout>
  );
}
