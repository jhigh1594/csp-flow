import { Link } from "@tanstack/react-router";
import { ChevronRight, FolderOpen, LayoutGrid, Users } from "lucide-react";
import { useState } from "react";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import useGetTeamProjects from "@/hooks/queries/team/use-get-team-projects";
import useGetTeams from "@/hooks/queries/team/use-get-teams";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";

type TeamProjectsProps = {
  teamId: string;
  workspaceId: string;
};

function TeamProjects({ teamId, workspaceId }: TeamProjectsProps) {
  const { data: projects } = useGetTeamProjects({ teamId });

  if (!projects?.length) return null;

  return (
    <>
      {projects.map((project) => (
        <SidebarMenuItem key={project.id}>
          <SidebarMenuButton
            size="default"
            className="h-7 ps-8 text-sm hover:bg-transparent hover:text-sidebar-accent-foreground active:bg-transparent"
            render={
              <Link
                to="/dashboard/workspace/$workspaceId/team/$teamId/project/$projectId/board"
                params={{ workspaceId, teamId, projectId: project.id }}
              />
            }
          >
            <span className="truncate">{project.name}</span>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </>
  );
}

type Team = {
  id: string;
  name: string;
  workspaceId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  [key: string]: unknown;
};

type TeamSectionProps = {
  team: Team;
  workspaceId: string;
};

function TeamSection({ team, workspaceId }: TeamSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showProjects, setShowProjects] = useState(false);
  const identifier =
    typeof team.identifier === "string"
      ? team.identifier
      : team.name.slice(0, 3).toUpperCase();

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={setIsOpen}
      className="group/team-collapsible"
    >
      <SidebarGroup className="gap-0.5 p-0">
        <CollapsibleTrigger
          className="data-panel-open:[&_svg.chevron]:rotate-90"
          render={
            <SidebarGroupLabel className="h-7 cursor-pointer justify-between px-2 text-sidebar-accent-foreground hover:bg-sidebar-accent rounded-md" />
          }
        >
          <span className="flex items-center gap-2 font-medium text-sm">
            <span className="inline-flex items-center justify-center rounded bg-sidebar-accent px-1.5 py-0.5 text-xs font-semibold text-sidebar-accent-foreground leading-none">
              {identifier}
            </span>
            <span className="truncate">{team.name}</span>
          </span>
          <ChevronRight className="chevron h-3.5 w-3.5 text-sidebar-foreground/60 transition-transform duration-200" />
        </CollapsibleTrigger>
        <CollapsiblePanel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0">
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="default"
                  className="h-7 ps-6 text-sm hover:bg-transparent hover:text-sidebar-accent-foreground active:bg-transparent"
                  render={
                    <Link
                      to="/dashboard/workspace/$workspaceId/team/$teamId/issues"
                      params={{ workspaceId, teamId: team.id }}
                    />
                  }
                >
                  <LayoutGrid className="h-3.5 w-3.5 text-sidebar-foreground/60" />
                  <span>Issues</span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <Collapsible
                open={showProjects}
                onOpenChange={setShowProjects}
                className="group/projects-collapsible"
              >
                <SidebarMenuItem>
                  <CollapsibleTrigger
                    className="data-panel-open:[&_svg.proj-chevron]:rotate-90 w-full"
                    render={
                      <SidebarMenuButton
                        size="default"
                        className="h-7 ps-6 text-sm hover:bg-transparent hover:text-sidebar-accent-foreground active:bg-transparent"
                      />
                    }
                  >
                    <FolderOpen className="h-3.5 w-3.5 text-sidebar-foreground/60" />
                    <span>Projects</span>
                    <ChevronRight className="proj-chevron ml-auto h-3 w-3 text-sidebar-foreground/60 transition-transform duration-200" />
                  </CollapsibleTrigger>
                </SidebarMenuItem>
                <CollapsiblePanel>
                  <SidebarMenu className="gap-0">
                    {showProjects && (
                      <TeamProjects
                        teamId={team.id}
                        workspaceId={workspaceId}
                      />
                    )}
                  </SidebarMenu>
                </CollapsiblePanel>
              </Collapsible>

              <SidebarMenuItem>
                <SidebarMenuButton
                  size="default"
                  className="h-7 ps-6 text-sm hover:bg-transparent hover:text-sidebar-accent-foreground active:bg-transparent"
                  render={
                    <Link
                      to="/dashboard/workspace/$workspaceId/team/$teamId/members"
                      params={{ workspaceId, teamId: team.id }}
                    />
                  }
                >
                  <Users className="h-3.5 w-3.5 text-sidebar-foreground/60" />
                  <span>Members</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </CollapsiblePanel>
      </SidebarGroup>
    </Collapsible>
  );
}

export function NavTeams() {
  const { data: workspace } = useActiveWorkspace();
  const { data: teams } = useGetTeams({ workspaceId: workspace?.id || "" });

  if (!workspace) return null;

  return (
    <SidebarGroup className="group-data-[collapsible=icon]:hidden gap-1 p-2 pt-1">
      <SidebarGroupLabel className="h-7 px-0 text-sidebar-accent-foreground">
        Teams
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="flex flex-col gap-1">
          {teams?.map((team) => (
            <TeamSection key={team.id} team={team} workspaceId={workspace.id} />
          ))}
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
