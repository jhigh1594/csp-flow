import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import WorkspaceCrumbSelect from "@/components/common/header/workspace-crumb-select";
import Layout from "@/components/common/layout";
import PageTitle from "@/components/page-title";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SidebarTrigger } from "@/components/ui/sidebar";
import icons from "@/constants/project-icons";
import useCreateTeamProject from "@/hooks/mutations/team/use-create-team-project";
import useGetTeamProjects from "@/hooks/queries/team/use-get-team-projects";
import useGetTeams from "@/hooks/queries/team/use-get-teams";
import { cn } from "@/lib/cn";
import generateProjectSlug from "@/lib/generate-project-id";
import { toast } from "@/lib/toast";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/team/$teamId/projects/",
)({
  component: RouteComponent,
});

function CreateProjectDialog({
  open,
  onClose,
  teamId,
  workspaceId,
}: {
  open: boolean;
  onClose: () => void;
  teamId: string;
  workspaceId: string;
}) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("Layout");
  const [iconPopoverOpen, setIconPopoverOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState("");

  const { mutateAsync } = useCreateTeamProject();

  const SelectedIcon =
    icons[selectedIcon as keyof typeof icons] || icons.Layout;
  const filteredIcons = Object.entries(icons).filter(([iconName]) =>
    iconName.toLowerCase().includes(iconSearch.trim().toLowerCase()),
  );

  const handleClose = () => {
    setName("");
    setSlug("");
    setSelectedIcon("Layout");
    setIconPopoverOpen(false);
    setIconSearch("");
    onClose();
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    setSlug(generateProjectSlug(newName));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    try {
      const project = await mutateAsync({
        teamId,
        name: name.trim(),
        slug: slug.trim(),
        icon: selectedIcon,
      });
      toast.success("Project created");
      void navigate({
        to: "/dashboard/workspace/$workspaceId/team/$teamId/project/$projectId/board",
        params: { workspaceId, teamId, projectId: project.id },
      });
      handleClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create project",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" showCloseButton={false}>
        <DialogHeader className="px-3 pt-4 pb-1 gap-1.5">
          <DialogTitle className="sr-only">New Project</DialogTitle>
          <DialogDescription className="sr-only">
            Create a new project for this team
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-6 px-3 pt-2">
            <Popover
              open={iconPopoverOpen}
              onOpenChange={(open) => {
                setIconPopoverOpen(open);
                if (!open) setIconSearch("");
              }}
              modal={true}
            >
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  className="h-8 w-8 p-0"
                >
                  <SelectedIcon className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <div className="space-y-2">
                  <Input
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    placeholder="Search icons..."
                    className="h-8 text-xs"
                  />
                  <div className="max-h-[280px] overflow-y-auto pr-1">
                    <div className="grid grid-cols-6 gap-1.5">
                      {filteredIcons.map(([iconName, Icon]) => (
                        <Button
                          key={iconName}
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedIcon(iconName);
                            setIconPopoverOpen(false);
                            setIconSearch("");
                          }}
                          className={cn(
                            "h-10 items-center justify-center rounded-md p-0",
                            selectedIcon === iconName &&
                              "bg-sidebar-accent text-sidebar-accent-foreground",
                          )}
                          title={iconName}
                        >
                          <Icon className="h-4 w-4" />
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Input
              unstyled
              value={name}
              onChange={handleNameChange}
              autoFocus
              placeholder="Project name"
              className="w-full [&_[data-slot=input]]:h-auto [&_[data-slot=input]]:px-0 [&_[data-slot=input]]:py-2 [&_[data-slot=input]]:text-2xl [&_[data-slot=input]]:leading-tight [&_[data-slot=input]]:font-semibold [&_[data-slot=input]]:tracking-tight [&_[data-slot=input]]:text-foreground [&_[data-slot=input]]:placeholder:text-muted-foreground [&_[data-slot=input]]:outline-none"
              required
            />
          </div>

          <div className="space-y-3 px-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Key
                </span>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="PRO"
                  maxLength={8}
                  className="w-20 h-8 text-center font-semibold text-sm bg-background border-border rounded-lg"
                  required
                />
              </div>
              <div className="flex-1 text-xs text-muted-foreground opacity-80">
                Used as a prefix for issues, e.g.{" "}
                <span className="font-medium">{slug || "ABC"}-1</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || !slug.trim()}
              size="sm"
            >
              Create project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RouteComponent() {
  const { workspaceId, teamId } = Route.useParams();
  const { data: teams } = useGetTeams({ workspaceId });
  const { data: projects, isLoading } = useGetTeamProjects({ teamId });
  const [createOpen, setCreateOpen] = useState(false);

  const team = teams?.find((t) => t.id === teamId);

  return (
    <Layout>
      <Layout.Header className="h-11 border-border/80 px-2">
        <SidebarTrigger />
        <WorkspaceCrumbSelect />
        <span className="text-muted-foreground/50">/</span>
        <span className="text-sm font-medium truncate">
          {team?.name ?? "Team"}
        </span>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-sm font-medium">Projects</span>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </div>
      </Layout.Header>

      <Layout.Content>
        <PageTitle title={`Projects — ${team?.name ?? "Team"}`} />

        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-sm text-muted-foreground">
            Loading...
          </div>
        ) : !projects || projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-60 gap-4">
            <p className="text-sm text-muted-foreground">No projects yet</p>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create first project
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {projects.map((project) => {
              const ProjectIcon =
                icons[project.icon as keyof typeof icons] || icons.Layout;
              return (
                <Link
                  key={project.id}
                  to="/dashboard/workspace/$workspaceId/team/$teamId/project/$projectId/board"
                  params={{ workspaceId, teamId, projectId: project.id }}
                  className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 hover:border-border/80 hover:bg-accent/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      <ProjectIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {project.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {project.slug}
                      </p>
                    </div>
                  </div>
                  {project.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {project.description}
                    </p>
                  )}
                  <div className="flex gap-2 mt-auto">
                    <Link
                      to="/dashboard/workspace/$workspaceId/team/$teamId/project/$projectId/board"
                      params={{ workspaceId, teamId, projectId: project.id }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Board
                    </Link>
                    <span className="text-muted-foreground/30">·</span>
                    <Link
                      to="/dashboard/workspace/$workspaceId/team/$teamId/project/$projectId/backlog"
                      params={{ workspaceId, teamId, projectId: project.id }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Backlog
                    </Link>
                    <span className="text-muted-foreground/30">·</span>
                    <Link
                      to="/dashboard/workspace/$workspaceId/team/$teamId/project/$projectId/gantt"
                      params={{ workspaceId, teamId, projectId: project.id }}
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Gantt
                    </Link>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Layout.Content>

      <CreateProjectDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        teamId={teamId}
        workspaceId={workspaceId}
      />
    </Layout>
  );
}
