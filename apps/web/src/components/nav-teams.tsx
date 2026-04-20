import { Link } from "@tanstack/react-router";
import {
  ChevronRight,
  FolderOpen,
  LayoutGrid,
  Plus,
  Settings,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import CreateProjectModal from "@/components/shared/modals/create-project-modal";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import useCreateTeam from "@/hooks/mutations/team/use-create-team";
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
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
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
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCreateProjectOpen(true);
                      }}
                      className="ml-auto flex h-4 w-4 items-center justify-center rounded hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-accent-foreground"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
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

              <CreateProjectModal
                open={createProjectOpen}
                onClose={() => setCreateProjectOpen(false)}
                teamId={team.id}
              />

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

              <SidebarMenuItem>
                <SidebarMenuButton
                  size="default"
                  className="h-7 ps-6 text-sm hover:bg-transparent hover:text-sidebar-accent-foreground active:bg-transparent"
                  render={
                    <Link
                      to="/dashboard/workspace/$workspaceId/team/$teamId/settings"
                      params={{ workspaceId, teamId: team.id }}
                    />
                  }
                >
                  <Settings className="h-3.5 w-3.5 text-sidebar-foreground/60" />
                  <span>Settings</span>
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
  const { mutateAsync: createTeam, isPending } = useCreateTeam();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [teamName, setTeamName] = useState("");

  if (!workspace) return null;

  async function handleCreate() {
    if (!teamName.trim() || !workspace) return;
    try {
      await createTeam({ workspaceId: workspace.id, name: teamName.trim() });
      setTeamName("");
      setDialogOpen(false);
    } catch {
      toast.error("Failed to create team");
    }
  }

  return (
    <>
      <SidebarGroup className="group-data-[collapsible=icon]:hidden gap-1 p-2 pt-1">
        <div className="flex items-center justify-between">
          <SidebarGroupLabel className="h-7 px-0 text-sidebar-accent-foreground">
            Teams
          </SidebarGroupLabel>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="flex h-5 w-5 items-center justify-center rounded hover:bg-sidebar-accent text-sidebar-foreground/60 hover:text-sidebar-accent-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
        <SidebarGroupContent>
          <div className="flex flex-col gap-1">
            {teams?.map((team) => (
              <TeamSection
                key={team.id}
                team={team}
                workspaceId={workspace.id}
              />
            ))}
          </div>
        </SidebarGroupContent>
      </SidebarGroup>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md" showCloseButton={false}>
          <DialogHeader className="px-3 pt-4 pb-1 gap-1.5">
            <DialogTitle className="sr-only">New team</DialogTitle>
            <Breadcrumb>
              <BreadcrumbList className="gap-1 text-xs">
                <BreadcrumbItem className="text-muted-foreground font-medium tracking-wide">
                  {workspace.name?.toUpperCase()}
                </BreadcrumbItem>
                <BreadcrumbSeparator className="[&>svg]:size-3.5" />
                <BreadcrumbItem className="text-foreground font-medium">
                  New team
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
            className="space-y-4"
          >
            <div className="px-3 pt-2">
              <Input
                unstyled
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                autoFocus
                placeholder="e.g. Engineering"
                className="w-full [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:py-2 [&_[data-slot=input]]:text-2xl [&_[data-slot=input]]:leading-tight [&_[data-slot=input]]:font-semibold [&_[data-slot=input]]:tracking-tight [&_[data-slot=input]]:text-foreground [&_[data-slot=input]]:placeholder:text-muted-foreground [&_[data-slot=input]]:outline-none"
                required
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={() => setDialogOpen(false)}
                variant="outline"
                size="sm"
                className="border-border text-foreground hover:bg-accent"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!teamName.trim() || isPending}
                size="sm"
                className="disabled:opacity-50"
              >
                {isPending ? "Creating…" : "Create team"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
