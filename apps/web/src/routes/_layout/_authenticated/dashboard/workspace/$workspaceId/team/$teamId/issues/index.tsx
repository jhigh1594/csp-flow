import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  Calendar,
  CalendarArrowUp,
  CalendarClock,
  CalendarX,
  ChevronRight,
  Circle,
  List,
  Plus,
  SquareKanban,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import WorkspaceCrumbSelect from "@/components/common/header/workspace-crumb-select";
import Layout from "@/components/common/layout";
import PageTitle from "@/components/page-title";
import CreateTaskModal from "@/components/shared/modals/create-task-modal";
import TaskDetailsSheet from "@/components/task/task-details-sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { KbdSequence } from "@/components/ui/kbd";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { shortcuts } from "@/constants/shortcuts";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import useGetTeamColumns from "@/hooks/queries/team/use-get-team-columns";
import useGetTeamIssues from "@/hooks/queries/team/use-get-team-issues";
import useGetTeams from "@/hooks/queries/team/use-get-teams";
import { useGetActiveWorkspaceUsers } from "@/hooks/queries/workspace-users/use-get-active-workspace-users";
import { cn } from "@/lib/cn";
import { getColumnIcon } from "@/lib/column";
import { dueDateStatusColors, getDueDateStatus } from "@/lib/due-date-status";
import { getPriorityIcon } from "@/lib/priority";

type IssuesSearchParams = {
  taskId?: string;
};

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/team/$teamId/issues/",
)({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): IssuesSearchParams => ({
    taskId: typeof search.taskId === "string" ? search.taskId : undefined,
  }),
});

// Raw task shape returned by the team issues API (projectId may be null)
type TeamIssue = {
  id: string;
  title: string;
  status: string;
  priority: string | null;
  columnId: string | null;
  projectId: string | null;
  userId: string | null;
  position: number | null;
  number: number | null;
  startDate: string | null;
  dueDate: string | null;
  createdAt: string;
};

type TeamColumn = {
  id: string;
  name: string;
  slug: string;
  position: number;
  icon: string | null;
  color: string | null;
  isFinal: boolean;
};

// ---- Board view ----

function BoardColumnCard({
  issue,
  workspaceId,
}: {
  issue: TeamIssue;
  workspaceId: string;
}) {
  const navigate = useNavigate();
  const { data: workspaceUsers } = useGetActiveWorkspaceUsers(workspaceId);

  const assignee = useMemo(() => {
    if (!issue.userId || !workspaceUsers?.members) return null;
    return workspaceUsers.members.find((m) => m.userId === issue.userId);
  }, [workspaceUsers, issue.userId]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: click handler for task card
    <div
      onClick={() => navigate({ to: ".", search: { taskId: issue.id } })}
      onKeyDown={(e) => {
        if (e.key === "Enter")
          navigate({ to: ".", search: { taskId: issue.id } });
      }}
      className="relative cursor-pointer rounded-lg border border-border/70 bg-card p-3 shadow-sm hover:border-border hover:shadow-md transition-all duration-200 ease-out"
    >
      {issue.userId && (
        <div className="absolute top-3 right-3">
          <Avatar className="h-5 w-5">
            <AvatarImage
              src={assignee?.user?.image ?? ""}
              alt={assignee?.user?.name || ""}
            />
            <AvatarFallback className="text-xs font-medium border border-border/30">
              {assignee?.user?.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      <div className="mb-2.5 pr-6 text-sm font-medium leading-5 text-foreground/95 break-words">
        {issue.title}
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {issue.priority && issue.priority !== "no-priority" && (
          <span className="inline-flex items-center gap-1 rounded border border-border/70 bg-muted/55 px-2 py-1 text-[10px] font-medium text-muted-foreground">
            {getPriorityIcon(issue.priority)}
          </span>
        )}

        {issue.startDate && (
          <div className="flex items-center gap-1 text-[10px] px-2 py-1 rounded border border-border/70 bg-muted/55 text-muted-foreground">
            <CalendarArrowUp className="w-3 h-3" />
            <span>{format(new Date(issue.startDate), "MMM d")}</span>
          </div>
        )}

        {issue.dueDate && (
          <div
            className={`flex items-center gap-1 text-[10px] px-2 py-1 rounded ${dueDateStatusColors[getDueDateStatus(issue.dueDate)]}`}
          >
            {getDueDateStatus(issue.dueDate) === "overdue" && (
              <CalendarX className="w-3 h-3" />
            )}
            {getDueDateStatus(issue.dueDate) === "due-soon" && (
              <CalendarClock className="w-3 h-3" />
            )}
            {(getDueDateStatus(issue.dueDate) === "far-future" ||
              getDueDateStatus(issue.dueDate) === "no-due-date") && (
              <Calendar className="w-3 h-3" />
            )}
            <span>{format(new Date(issue.dueDate), "MMM d")}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function BoardView({
  columns,
  issues,
  teamId,
  workspaceId,
}: {
  columns: TeamColumn[];
  issues: TeamIssue[];
  teamId: string;
  workspaceId: string;
}) {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [activeColumnId, setActiveColumnId] = useState<string | null>(null);

  const issuesByColumn = useMemo(() => {
    const map = new Map<string, TeamIssue[]>();
    for (const col of columns) {
      map.set(col.id, []);
    }
    for (const issue of issues) {
      const colId = issue.columnId;
      if (colId && map.has(colId)) {
        map.get(colId)?.push(issue);
      } else {
        // Put unassigned-column tasks in first column if available
        if (columns.length > 0) {
          map.get(columns[0].id)?.push(issue);
        }
      }
    }
    return map;
  }, [columns, issues]);

  return (
    <>
      <div className="flex h-full w-full flex-col bg-linear-to-b from-muted/20 to-background">
        <div className="min-h-0 flex-1 overflow-x-auto [-webkit-overflow-scrolling:touch]">
          <div className="flex h-full min-w-max gap-4 px-4 py-4 md:px-5">
            {columns.map((column) => {
              const columnIssues = issuesByColumn.get(column.id) ?? [];
              return (
                <div
                  key={column.id}
                  className="h-full max-w-96 min-w-80 shrink-0 flex-1 flex flex-col rounded-xl border border-border/70 bg-muted/40 shadow-xs/5"
                >
                  <div className="shrink-0 border-b border-border/60 px-3 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getColumnIcon(column.id, column.isFinal)}
                      <span className="text-sm font-medium">{column.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {columnIssues.length}
                      </span>
                    </div>
                  </div>

                  <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-2 py-2 flex flex-col gap-2">
                    {columnIssues.map((issue) => (
                      <BoardColumnCard
                        key={issue.id}
                        issue={issue}
                        workspaceId={workspaceId}
                      />
                    ))}
                    {columnIssues.length === 0 && (
                      <div className="flex h-full items-center justify-center py-8">
                        <p className="text-xs text-muted-foreground">
                          No tasks
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border/60 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveColumnId(column.id);
                        setIsTaskModalOpen(true);
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm text-muted-foreground hover:bg-accent/50 hover:text-foreground transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add task</span>
                    </button>
                  </div>
                </div>
              );
            })}

            {columns.length === 0 && (
              <div className="flex h-full w-full items-center justify-center">
                <p className="text-sm text-muted-foreground">
                  No columns configured for this team.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateTaskModal
        open={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setActiveColumnId(null);
        }}
        status={activeColumnId ?? undefined}
        teamId={teamId}
      />
    </>
  );
}

// ---- List view ----

type ProjectGroup = {
  projectId: string | null;
  projectName: string;
  issues: TeamIssue[];
};

function ListIssueRow({
  issue,
  workspaceId,
}: {
  issue: TeamIssue;
  workspaceId: string;
}) {
  const navigate = useNavigate();
  const { data: workspaceUsers } = useGetActiveWorkspaceUsers(workspaceId);

  const assignee = useMemo(() => {
    if (!issue.userId || !workspaceUsers?.members) return null;
    return workspaceUsers.members.find((m) => m.userId === issue.userId);
  }, [workspaceUsers, issue.userId]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: click handler for task row
    <div
      onClick={() => navigate({ to: ".", search: { taskId: issue.id } })}
      onKeyDown={(e) => {
        if (e.key === "Enter")
          navigate({ to: ".", search: { taskId: issue.id } });
      }}
      className="group flex items-center gap-3 px-4 py-2 border-b border-border/50 hover:bg-accent/60 cursor-pointer transition-colors"
    >
      <div className="flex-shrink-0">
        <Circle className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
      {issue.priority && (
        <div className="flex-shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5">
          {getPriorityIcon(issue.priority)}
        </div>
      )}
      <span className="flex-1 min-w-0 text-sm text-foreground truncate">
        {issue.title}
      </span>
      <div className="flex items-center gap-2 flex-shrink-0">
        {issue.dueDate && (
          <div
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded ${dueDateStatusColors[getDueDateStatus(issue.dueDate)]}`}
          >
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(issue.dueDate), "MMM d")}</span>
          </div>
        )}
        {issue.userId && (
          <Avatar className="h-5 w-5">
            <AvatarImage
              src={assignee?.user?.image ?? ""}
              alt={assignee?.user?.name || ""}
            />
            <AvatarFallback className="text-[10px] font-medium border border-border/30">
              {assignee?.user?.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}

function ListView({
  issues,
  workspaceId,
  teamId,
  projectNameMap,
}: {
  issues: TeamIssue[];
  workspaceId: string;
  teamId: string;
  projectNameMap: Map<string, string>;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

  // Group by projectId; null projectId => "No Project"
  const groups = useMemo<ProjectGroup[]>(() => {
    const map = new Map<string | null, TeamIssue[]>();

    for (const issue of issues) {
      const key = issue.projectId ?? null;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)?.push(issue);
    }

    const result: ProjectGroup[] = [];

    // Put "No Project" first
    if (map.has(null)) {
      result.push({
        projectId: null,
        projectName: "No Project",
        issues: map.get(null) ?? [],
      });
    }

    for (const [projectId, groupIssues] of map.entries()) {
      if (projectId !== null) {
        result.push({
          projectId,
          projectName: projectNameMap.get(projectId) ?? projectId,
          issues: groupIssues,
        });
      }
    }

    return result;
  }, [issues, projectNameMap]);

  const isExpanded = (key: string | null) => {
    const k = key ?? "__no_project__";
    return expandedGroups[k] !== false; // default expanded
  };

  const toggleGroup = (key: string | null) => {
    const k = key ?? "__no_project__";
    setExpandedGroups((prev) => ({ ...prev, [k]: !isExpanded(key) }));
  };

  return (
    <>
      <div className="w-full h-full overflow-auto bg-muted/20">
        <div className="divide-y divide-border/50">
          {groups.map((group) => (
            <div key={group.projectId ?? "__no_project__"}>
              <div className="flex items-center justify-between py-2 px-4 bg-muted/60 border-b border-border/50">
                <button
                  type="button"
                  onClick={() => toggleGroup(group.projectId)}
                  className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-foreground transition-colors"
                >
                  <ChevronRight
                    className={cn(
                      "w-3 h-3 transition-transform",
                      isExpanded(group.projectId) && "rotate-90",
                    )}
                  />
                  <span className="mt-0.5">{group.projectName}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    {group.issues.length}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(true)}
                  className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="Add task"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              {isExpanded(group.projectId) && (
                <div className="bg-card">
                  {group.issues.map((issue) => (
                    <ListIssueRow
                      key={issue.id}
                      issue={issue}
                      workspaceId={workspaceId}
                    />
                  ))}
                  {group.issues.length === 0 && (
                    <div className="py-6 px-4 text-center text-xs text-muted-foreground">
                      No tasks
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {groups.length === 0 && (
            <div className="flex h-64 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No issues for this team yet.
              </p>
            </div>
          )}
        </div>
      </div>

      <CreateTaskModal
        open={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        teamId={teamId}
      />
    </>
  );
}

// ---- Route component ----

function RouteComponent() {
  const { teamId, workspaceId } = Route.useParams();
  const { taskId } = Route.useSearch();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  const { data: issues = [], isLoading: issuesLoading } = useGetTeamIssues({
    teamId,
  });
  const { data: columns = [], isLoading: columnsLoading } = useGetTeamColumns({
    teamId,
  });
  const { data: teams } = useGetTeams({ workspaceId });
  const { data: projects = [] } = useGetProjects({ workspaceId });

  const teamName = useMemo(() => {
    if (!teams) return "Team Issues";
    const team = teams.find((t) => t.id === teamId);
    return team?.name ? `${team.name} Issues` : "Team Issues";
  }, [teams, teamId]);

  const projectNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects as Array<{ id: string; name: string }>) {
      map.set(p.id, p.name);
    }
    return map;
  }, [projects]);

  const selectedIssue = useMemo(
    () =>
      taskId ? (issues as TeamIssue[]).find((i) => i.id === taskId) : undefined,
    [taskId, issues],
  );

  const handleCloseTaskSheet = useCallback(() => {
    navigate({ to: ".", search: {}, replace: true });
  }, [navigate]);

  const isLoading = issuesLoading || columnsLoading;

  // Cast to our local type - the API returns the raw DB shape
  const typedIssues = issues as TeamIssue[];
  const typedColumns = (columns as TeamColumn[]).sort(
    (a, b) => a.position - b.position,
  );

  return (
    <Layout>
      <Layout.Header className="h-11 border-border/80 px-2">
        <div className="flex w-full items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarTrigger className="-ml-1 h-7 w-7 cursor-pointer text-foreground/85 hover:text-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="flex items-center gap-2 text-[10px]">
                    Toggle sidebar
                    <KbdSequence
                      keys={[
                        shortcuts.sidebar.prefix,
                        shortcuts.sidebar.toggle,
                      ]}
                    />
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="h-4 w-px shrink-0 bg-border/80" />

            <div className="hidden min-w-0 items-center gap-1 md:flex">
              <WorkspaceCrumbSelect />
              <span className="text-foreground/30 text-xs">/</span>
              <span className="text-xs text-foreground px-2">{teamName}</span>
            </div>

            {/* View toggle */}
            <div className="hidden h-8 items-center gap-0.5 rounded-lg border border-border/80 bg-background p-0.5 sm:inline-flex">
              <Button
                variant={viewMode === "board" ? "secondary" : "ghost"}
                size="xs"
                onClick={() => setViewMode("board")}
                className="h-6 gap-1.5 rounded-md px-2 text-xs text-foreground hover:text-foreground"
              >
                <SquareKanban className="size-3.5" />
                Board
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="xs"
                onClick={() => setViewMode("list")}
                className="h-6 gap-1.5 rounded-md px-2 text-xs text-foreground hover:text-foreground"
              >
                <List className="size-3.5" />
                List
              </Button>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              variant="outline"
              size="xs"
              onClick={() => setIsCreateTaskOpen(true)}
              className="h-7 gap-1.5 px-2 text-xs"
            >
              <Plus className="size-3.5" />
              New Issue
            </Button>
          </div>
        </div>
      </Layout.Header>

      <Layout.Content>
        <PageTitle title={teamName} hideAppName />

        <div className="relative flex flex-col h-full min-h-0 overflow-hidden">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <div className="space-y-2 text-center">
                <div className="w-48 h-4 bg-muted rounded animate-pulse mx-auto" />
                <div className="w-32 h-3 bg-muted rounded animate-pulse mx-auto" />
              </div>
            </div>
          ) : viewMode === "board" ? (
            <BoardView
              columns={typedColumns}
              issues={typedIssues}
              teamId={teamId}
              workspaceId={workspaceId}
            />
          ) : (
            <ListView
              issues={typedIssues}
              workspaceId={workspaceId}
              teamId={teamId}
              projectNameMap={projectNameMap}
            />
          )}
        </div>
      </Layout.Content>

      <CreateTaskModal
        open={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        teamId={teamId}
      />

      <TaskDetailsSheet
        taskId={taskId}
        projectId={selectedIssue?.projectId ?? ""}
        workspaceId={workspaceId}
        onClose={handleCloseTaskSheet}
      />
    </Layout>
  );
}
