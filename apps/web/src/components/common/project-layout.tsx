import { useLocation, useNavigate } from "@tanstack/react-router";
import {
  CalendarDays,
  Diamond,
  FileText,
  SquareKanban,
  SquircleDashed,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import MobileProjectNav from "@/components/common/header/mobile-project-nav";
import ProjectCrumbSelect from "@/components/common/header/project-crumb-select";
import WorkspaceCrumbSelect from "@/components/common/header/workspace-crumb-select";
import Layout from "@/components/common/layout";
import CreateProjectModal from "@/components/shared/modals/create-project-modal";
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
import useGetProject from "@/hooks/queries/project/use-get-project";

type ProjectLayoutProps = {
  projectId: string;
  workspaceId: string;
  headerActions?: ReactNode;
  children: ReactNode;
  showViewSwitcher?: boolean;
  activeView?: "backlog" | "board" | "gantt" | "wiki" | "milestones";
};

export default function ProjectLayout({
  projectId,
  workspaceId,
  headerActions,
  children,
  showViewSwitcher = true,
  activeView,
}: ProjectLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: project } = useGetProject({ id: projectId, workspaceId });
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] =
    useState(false);

  const resolvedView =
    activeView ??
    (location.pathname.includes("/backlog")
      ? "backlog"
      : location.pathname.includes("/gantt")
        ? "gantt"
        : location.pathname.includes("/wiki")
          ? "wiki"
          : location.pathname.includes("/milestones")
            ? "milestones"
            : "board");

  const handleNavigateToBacklog = () => {
    navigate({
      to: "/dashboard/workspace/$workspaceId/project/$projectId/backlog",
      params: { workspaceId, projectId },
    });
  };

  const handleNavigateToBoard = () => {
    navigate({
      to: "/dashboard/workspace/$workspaceId/project/$projectId/board",
      params: { workspaceId, projectId },
    });
  };

  const handleNavigateToGantt = () => {
    navigate({
      to: "/dashboard/workspace/$workspaceId/project/$projectId/gantt",
      params: { workspaceId, projectId },
    });
  };

  const handleNavigateToWiki = () => {
    navigate({
      to: "/dashboard/workspace/$workspaceId/project/$projectId/wiki",
      params: { workspaceId, projectId },
    });
  };

  const handleNavigateToMilestones = () => {
    navigate({
      to: "/dashboard/workspace/$workspaceId/project/$projectId/milestones",
      params: { workspaceId, projectId },
    });
  };

  const handleProjectSwitch = (nextProjectId: string) => {
    navigate({
      to:
        resolvedView === "backlog"
          ? "/dashboard/workspace/$workspaceId/project/$projectId/backlog"
          : resolvedView === "gantt"
            ? "/dashboard/workspace/$workspaceId/project/$projectId/gantt"
            : resolvedView === "wiki"
              ? "/dashboard/workspace/$workspaceId/project/$projectId/wiki"
              : resolvedView === "milestones"
                ? "/dashboard/workspace/$workspaceId/project/$projectId/milestones"
                : "/dashboard/workspace/$workspaceId/project/$projectId/board",
      params: {
        workspaceId,
        projectId: nextProjectId,
      },
    });
  };

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
              <ProjectCrumbSelect
                workspaceId={workspaceId}
                projectId={projectId}
                projectName={project?.name}
                onSelectProject={handleProjectSwitch}
                onAddProject={() => setIsCreateProjectModalOpen(true)}
              />
            </div>

            <div className="md:hidden">
              <MobileProjectNav
                workspaceId={workspaceId}
                projectId={projectId}
                activeView={resolvedView}
                onSelectBacklog={handleNavigateToBacklog}
                onSelectBoard={handleNavigateToBoard}
                onSelectGantt={handleNavigateToGantt}
                onSelectWiki={handleNavigateToWiki}
                onSelectMilestones={handleNavigateToMilestones}
                onSelectProject={handleProjectSwitch}
                onAddProject={() => setIsCreateProjectModalOpen(true)}
              />
            </div>

            {showViewSwitcher && (
              <div className="hidden h-8 items-center gap-0.5 rounded-lg border border-border/80 bg-background p-0.5 sm:inline-flex">
                <Button
                  variant={resolvedView === "backlog" ? "secondary" : "ghost"}
                  size="xs"
                  onClick={handleNavigateToBacklog}
                  className="h-6 gap-1.5 rounded-md px-2 text-xs text-foreground hover:text-foreground"
                >
                  <SquircleDashed className="size-3.5" />
                  Backlog
                </Button>
                <Button
                  variant={resolvedView === "board" ? "secondary" : "ghost"}
                  size="xs"
                  onClick={handleNavigateToBoard}
                  className="h-6 gap-1.5 rounded-md px-2 text-xs text-foreground hover:text-foreground"
                >
                  <SquareKanban className="size-3.5" />
                  Tasks
                </Button>
                <Button
                  variant={resolvedView === "gantt" ? "secondary" : "ghost"}
                  size="xs"
                  onClick={handleNavigateToGantt}
                  className="h-6 gap-1.5 rounded-md px-2 text-xs text-foreground hover:text-foreground"
                >
                  <CalendarDays className="size-3.5" />
                  Timeline
                </Button>
                <Button
                  variant={resolvedView === "wiki" ? "secondary" : "ghost"}
                  size="xs"
                  onClick={handleNavigateToWiki}
                  className="h-6 gap-1.5 rounded-md px-2 text-xs text-foreground hover:text-foreground"
                >
                  <FileText className="size-3.5" />
                  Wiki
                </Button>
                <Button
                  variant={
                    resolvedView === "milestones" ? "secondary" : "ghost"
                  }
                  size="xs"
                  onClick={handleNavigateToMilestones}
                  className="h-6 gap-1.5 rounded-md px-2 text-xs text-foreground hover:text-foreground"
                >
                  <Diamond className="size-3.5" />
                  Milestones
                </Button>
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            {headerActions}
          </div>
        </div>
      </Layout.Header>

      <Layout.Content>{children}</Layout.Content>

      <CreateProjectModal
        open={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
      />
    </Layout>
  );
}
