import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, Circle, LayoutGrid, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import WorkspaceLayout from "@/components/common/workspace-layout";
import PageTitle from "@/components/page-title";
import CreateProjectModal from "@/components/shared/modals/create-project-modal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import icons from "@/constants/project-icons";
import { shortcuts } from "@/constants/shortcuts";
import useGetProjects from "@/hooks/queries/project/use-get-projects";
import useGetTeams from "@/hooks/queries/team/use-get-teams";
import useGetWorkspaceUsers from "@/hooks/queries/workspace-users/use-get-workspace-users";
import { useRegisterShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { formatDateMedium } from "@/lib/format";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/",
)({
  component: RouteComponent,
});

const STORAGE_KEY_PREFIX = "csp-flow-getting-started";

type GettingStartedChecklistProps = {
  workspaceId: string;
  projectCount: number;
  hasTeams: boolean;
  memberCount: number;
  onCreateProject: () => void;
};

function GettingStartedChecklist({
  workspaceId,
  projectCount,
  hasTeams,
  memberCount,
  onCreateProject,
}: GettingStartedChecklistProps) {
  const storageKey = `${STORAGE_KEY_PREFIX}-${workspaceId}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === "dismissed";
    } catch {
      return false;
    }
  });

  const items = [
    {
      id: "project",
      label: "Create your first project",
      complete: projectCount >= 1,
      action: onCreateProject,
    },
    {
      id: "team",
      label: "Create a team",
      complete: hasTeams,
    },
    {
      id: "invite",
      label: "Invite team members",
      complete: memberCount >= 2,
    },
  ];

  const allComplete = items.every((item) => item.complete);

  useEffect(() => {
    if (allComplete && !dismissed) {
      try {
        localStorage.setItem(storageKey, "dismissed");
        setDismissed(true);
      } catch {
        // localStorage unavailable
      }
    }
  }, [allComplete, dismissed, storageKey]);

  // Hide when: dismissed, 5+ projects, or all complete
  if (dismissed || projectCount >= 5 || allComplete) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card p-4 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Getting Started</h3>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(storageKey, "dismissed");
            } catch {
              // localStorage unavailable
            }
            setDismissed(true);
          }}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Dismiss
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2.5 py-1">
            {item.complete ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            ) : (
              <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            {item.complete ? (
              <span className="text-sm text-muted-foreground line-through">
                {item.label}
              </span>
            ) : item.action ? (
              <button
                type="button"
                onClick={item.action}
                className="text-sm text-foreground hover:text-primary transition-colors text-left"
              >
                {item.label}
              </button>
            ) : (
              <span className="text-sm">{item.label}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RouteComponent() {
  const { t } = useTranslation();
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const { workspaceId } = Route.useParams();
  const navigate = useNavigate();
  const { data: projects, isLoading } = useGetProjects({
    workspaceId,
  });
  const { data: teams } = useGetTeams({ workspaceId });
  const { data: members } = useGetWorkspaceUsers({ workspaceId });

  const handleCreateProject = () => {
    setIsCreateProjectOpen(true);
  };

  useRegisterShortcuts({
    sequentialShortcuts: {
      [shortcuts.new.prefix]: {
        [shortcuts.new.project]: handleCreateProject,
      },
    },
  });

  const handleProjectClick = (projectId: string, teamId: string) => {
    navigate({
      to: "/dashboard/workspace/$workspaceId/team/$teamId/project/$projectId/board",
      params: { workspaceId, teamId, projectId },
    });
  };

  if (isLoading) {
    return (
      <>
        <PageTitle title={t("workspace:projects.pageTitle")} />
        <WorkspaceLayout
          title={t("workspace:projects.pageTitle")}
          headerActions={
            <Button
              variant="outline"
              size="xs"
              onClick={handleCreateProject}
              className="gap-1"
            >
              <Plus className="w-3 h-3" />
              {t("workspace:projects.createProject")}
            </Button>
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-foreground font-medium">
                  {t("workspace:projects.title")}
                </TableHead>
                <TableHead className="text-foreground font-medium">
                  {t("workspace:projects.progress")}
                </TableHead>
                <TableHead className="text-foreground font-medium">
                  {t("workspace:projects.targetDate")}
                </TableHead>
                <TableHead className="text-foreground font-medium">
                  {t("workspace:projects.status")}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3].map((i) => (
                <TableRow key={i}>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-5 w-5" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-2 w-20" />
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-4 w-20" />
                  </TableCell>
                  <TableCell className="py-3">
                    <Skeleton className="h-5 w-16" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </WorkspaceLayout>
      </>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <>
        <PageTitle title={t("workspace:projects.pageTitle")} />
        <WorkspaceLayout
          title={t("workspace:projects.pageTitle")}
          headerActions={
            <Button
              variant="outline"
              size="xs"
              onClick={handleCreateProject}
              className="gap-1"
            >
              <Plus className="w-3 h-3" />
              {t("workspace:projects.createProject")}
            </Button>
          }
        >
          <GettingStartedChecklist
            workspaceId={workspaceId}
            projectCount={0}
            hasTeams={!!teams?.length}
            memberCount={members?.length ?? 0}
            onCreateProject={handleCreateProject}
          />
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-xl bg-muted flex items-center justify-center">
                <LayoutGrid className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">
                  {t("workspace:projects.emptyTitle")}
                </h3>
                <p className="text-muted-foreground">
                  {t("workspace:projects.emptyDescription")}
                </p>
              </div>
              <Button onClick={handleCreateProject} className="gap-2 ">
                <Plus className="w-4 h-4" />
                {t("workspace:projects.createProject")}
              </Button>
            </div>
          </div>
        </WorkspaceLayout>

        <CreateProjectModal
          open={isCreateProjectOpen}
          onClose={() => setIsCreateProjectOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <PageTitle title={t("workspace:projects.pageTitle")} />
      <WorkspaceLayout
        title={t("workspace:projects.pageTitle")}
        headerActions={
          <Button
            variant="outline"
            size="xs"
            onClick={handleCreateProject}
            className="gap-1"
          >
            <Plus className="w-3 h-3" />
            {t("workspace:projects.createProject")}
          </Button>
        }
      >
        <GettingStartedChecklist
          workspaceId={workspaceId}
          projectCount={projects?.length ?? 0}
          hasTeams={!!teams?.length}
          memberCount={members?.length ?? 0}
          onCreateProject={handleCreateProject}
        />
        <Table>
          <TableHeader className="p-4">
            <TableRow>
              <TableHead className="text-foreground font-medium">
                {t("workspace:projects.title")}
              </TableHead>
              <TableHead className="text-foreground font-medium">
                {t("workspace:projects.progress")}
              </TableHead>
              <TableHead className="text-foreground font-medium">
                {t("workspace:projects.dueDate")}
              </TableHead>
              <TableHead className="text-foreground font-medium">
                {t("workspace:projects.status")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects?.map((project) => {
              if (!project || !project.id || !project.statistics) return null;

              const IconComponent =
                icons[project.icon as keyof typeof icons] || icons.Layout;

              const getStatusText = () => {
                if (project.statistics.totalTasks === 0)
                  return t("workspace:projects.projectStatus.notStarted");
                if (project.statistics.completionPercentage === 100)
                  return t("workspace:projects.projectStatus.complete");
                return t("workspace:projects.projectStatus.inProgress");
              };

              const getStatusVariant = () => {
                if (project.statistics.totalTasks === 0) return "secondary";
                if (project.statistics.completionPercentage === 100)
                  return "default";
                return "outline";
              };

              return (
                <TableRow
                  key={project.id}
                  className="cursor-pointer"
                  onClick={() => handleProjectClick(project.id, project.teamId)}
                >
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <IconComponent className="w-5 h-5 text-muted-foreground" />
                      <span className="font-medium">{project.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="flex items-center gap-2">
                      <Progress
                        value={project.statistics.completionPercentage}
                        className="w-16 h-2"
                      />
                      <span className="text-sm text-muted-foreground">
                        {project.statistics.completionPercentage}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-3">
                    <span className="text-sm text-muted-foreground">
                      {project.statistics.dueDate
                        ? formatDateMedium(project.statistics.dueDate)
                        : t("workspace:projects.noDueDate")}
                    </span>
                  </TableCell>
                  <TableCell className="py-3">
                    <Badge variant={getStatusVariant()}>
                      {getStatusText()}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </WorkspaceLayout>

      <CreateProjectModal
        open={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
      />
    </>
  );
}
