import { useLocation, useNavigate } from "@tanstack/react-router";
import { ArrowDownIcon, ArrowUpIcon, CornerDownLeftIcon } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import SearchCommandMenu from "@/components/search-command-menu";
import CreateTaskModal from "@/components/shared/modals/create-task-modal";
import CreateWorkspaceModal from "@/components/shared/modals/create-workspace-modal";
import {
  Command,
  CommandCollection,
  CommandDialog,
  CommandDialogPopup,
  CommandEmpty,
  CommandFooter,
  CommandGroup,
  CommandGroupLabel,
  CommandInput,
  CommandItem,
  CommandList,
  CommandPanel,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { shortcuts } from "@/constants/shortcuts";
import useActiveWorkspace from "@/hooks/queries/workspace/use-active-workspace";
import { useRegisterShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useUserPreferencesStore } from "@/store/user-preferences";
import CreateProjectModal from "../shared/modals/create-project-modal";

type PaletteActionItem = {
  value: string;
  label: string;
  shortcut?: string;
  onRun: () => void;
};

type PaletteGroup = {
  value: string;
  label: string;
  items: PaletteActionItem[];
};

function CommandPalette() {
  const { t } = useTranslation();
  const { setTheme, setViewMode } = useUserPreferencesStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: workspace } = useActiveWorkspace();
  const [open, setOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  const projectIdFromRoute =
    location.pathname.match(/\/project\/([^/]+)/)?.[1] ?? undefined;

  useRegisterShortcuts({
    shortcuts: {
      [shortcuts.create.key]: () => setIsCreateTaskOpen(true),
      [shortcuts.help.key]: () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "?" }));
      },
    },
    modifierShortcuts: {
      [shortcuts.palette.prefix]: {
        [shortcuts.palette.open]: () => {
          setOpen(true);
        },
      },
    },
    sequentialShortcuts: {
      [shortcuts.new.prefix]: {
        [shortcuts.new.project]: () => setIsCreateProjectOpen(true),
        [shortcuts.new.workspace]: () => {
          setIsCreateWorkspaceOpen(true);
        },
      },
      [shortcuts.go.prefix]: {
        [shortcuts.go.home]: () => {
          if (!workspace?.id) return;
          navigate({
            to: "/dashboard/workspace/$workspaceId",
            params: { workspaceId: workspace.id },
          });
        },
        [shortcuts.go.members]: () => {
          if (!workspace?.id) return;
          navigate({
            to: "/dashboard/workspace/$workspaceId/members",
            params: { workspaceId: workspace.id },
          });
        },
        [shortcuts.go.settings]: () => {
          navigate({ to: "/dashboard/settings" });
        },
      },
    },
  });

  const runCommand = useCallback((command: () => void) => {
    command();
    setOpen(false);
  }, []);

  const groupedItems = useMemo<PaletteGroup[]>(
    () => [
      {
        value: "suggestions",
        label: t("navigation:commandPalette.suggestions"),
        items: [
          {
            value: "projects",
            label: t("navigation:commandPalette.projects"),
            shortcut: `${shortcuts.go.prefix} ${shortcuts.go.home}`,
            onRun: () => {
              if (!workspace?.id) return;
              navigate({
                to: "/dashboard/workspace/$workspaceId",
                params: { workspaceId: workspace.id },
              });
            },
          },
          {
            value: "search",
            label: t("navigation:commandPalette.search"),
            shortcut: shortcuts.search.prefix,
            onRun: () => setIsSearchOpen(true),
          },
          {
            value: "members",
            label: t("navigation:commandPalette.members"),
            shortcut: `${shortcuts.go.prefix} ${shortcuts.go.members}`,
            onRun: () => {
              if (!workspace?.id) return;
              navigate({
                to: "/dashboard/workspace/$workspaceId/members",
                params: { workspaceId: workspace.id },
              });
            },
          },
          {
            value: "create-task",
            label: t("navigation:commandPalette.createTask"),
            shortcut: shortcuts.create.key,
            onRun: () => setIsCreateTaskOpen(true),
          },
          {
            value: "create-project",
            label: t("navigation:commandPalette.createProject"),
            shortcut: `${shortcuts.new.prefix} ${shortcuts.new.project}`,
            onRun: () => setIsCreateProjectOpen(true),
          },
        ],
      },
      {
        value: "commands",
        label: t("navigation:commandPalette.commands"),
        items: [
          {
            value: "create-workspace",
            label: t("navigation:commandPalette.createWorkspace"),
            shortcut: `${shortcuts.new.prefix} ${shortcuts.new.workspace}`,
            onRun: () => setIsCreateWorkspaceOpen(true),
          },
          {
            value: "theme-light",
            label: t("navigation:commandPalette.lightTheme"),
            onRun: () => setTheme("light"),
          },
          {
            value: "theme-dark",
            label: t("navigation:commandPalette.darkTheme"),
            onRun: () => setTheme("dark"),
          },
          {
            value: "theme-system",
            label: t("navigation:commandPalette.systemTheme"),
            onRun: () => setTheme("system"),
          },
          {
            value: "keyboard-shortcuts",
            label: t("navigation:commandPalette.keyboardShortcuts"),
            shortcut: "?",
            onRun: () => {
              setTimeout(() => {
                document.dispatchEvent(
                  new KeyboardEvent("keydown", { key: "?" }),
                );
              }, 100);
            },
          },
        ],
      },
      {
        value: "navigation",
        label: t("navigation:commandPalette.navigation"),
        items: [
          {
            value: "go-home",
            label: t("navigation:commandPalette.goHome"),
            shortcut: `${shortcuts.go.prefix} ${shortcuts.go.home}`,
            onRun: () => {
              if (!workspace?.id) return;
              navigate({
                to: "/dashboard/workspace/$workspaceId",
                params: { workspaceId: workspace.id },
              });
            },
          },
          {
            value: "go-settings",
            label: t("navigation:commandPalette.goSettings"),
            shortcut: `${shortcuts.go.prefix} ${shortcuts.go.settings}`,
            onRun: () => navigate({ to: "/dashboard/settings" }),
          },
          {
            value: "view-board",
            label: t("navigation:commandPalette.boardView"),
            shortcut: `${shortcuts.view.prefix} ${shortcuts.view.board}`,
            onRun: () => setViewMode("board"),
          },
          {
            value: "view-list",
            label: t("navigation:commandPalette.listView"),
            shortcut: `${shortcuts.view.prefix} ${shortcuts.view.list}`,
            onRun: () => setViewMode("list"),
          },
          {
            value: "view-gantt",
            label: t("navigation:commandPalette.ganttView"),
            shortcut: `${shortcuts.view.prefix} ${shortcuts.view.gantt}`,
            onRun: () => {
              const match = location.pathname.match(/\/project\/([^/]+)/);
              if (!match || !workspace?.id) return;
              navigate({
                to: "/dashboard/workspace/$workspaceId/team/$teamId/project/$projectId/gantt",
                params: {
                  workspaceId: workspace.id,
                  teamId: location.pathname.match(/\/team\/([^/]+)/)?.[1] ?? "",
                  projectId: match[1],
                },
              });
            },
          },
        ],
      },
    ],
    [navigate, setTheme, setViewMode, t, workspace?.id, location.pathname],
  );

  const shortcutHandlers = useMemo(() => {
    const handlers = new Map<string, () => void>();
    for (const group of groupedItems) {
      for (const item of group.items) {
        if (!item.shortcut) continue;
        handlers.set(
          item.shortcut.replace(/\s+/g, "").toLowerCase(),
          item.onRun,
        );
      }
    }
    return handlers;
  }, [groupedItems]);

  useEffect(() => {
    if (!open) return;

    let sequence = "";
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.contentEditable === "true"
      ) {
        return;
      }

      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        event.key === "Shift"
      ) {
        return;
      }

      if (event.key.length !== 1 && event.key !== "?") {
        return;
      }

      sequence = `${sequence}${event.key.toLowerCase()}`.slice(-3);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        sequence = "";
      }, 700);

      const handler = shortcutHandlers.get(sequence);
      if (!handler) return;

      event.preventDefault();
      runCommand(handler);
      sequence = "";
      clearTimeout(timeout);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timeout);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, shortcutHandlers, runCommand]);

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandDialogPopup>
          <Command items={groupedItems}>
            <CommandInput
              placeholder={t("navigation:commandPalette.inputPlaceholder")}
            />
            <CommandPanel>
              <CommandEmpty>
                {t("navigation:commandPalette.empty")}
              </CommandEmpty>
              <CommandList>
                {(group: PaletteGroup, groupIndex: number) => (
                  <Fragment key={group.value}>
                    <CommandGroup items={group.items}>
                      <CommandGroupLabel>{group.label}</CommandGroupLabel>
                      <CommandCollection>
                        {(item: PaletteActionItem) => {
                          return (
                            <CommandItem
                              key={item.value}
                              value={item.value}
                              onClick={() => runCommand(item.onRun)}
                              className="px-3"
                            >
                              <span className="flex-1">{item.label}</span>
                              {item.shortcut && (
                                <CommandShortcut>
                                  {item.shortcut}
                                </CommandShortcut>
                              )}
                            </CommandItem>
                          );
                        }}
                      </CommandCollection>
                    </CommandGroup>
                    {groupIndex < groupedItems.length - 1 && (
                      <CommandSeparator />
                    )}
                  </Fragment>
                )}
              </CommandList>
            </CommandPanel>
            <CommandFooter>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <KbdGroup>
                    <Kbd>
                      <ArrowUpIcon />
                    </Kbd>
                    <Kbd>
                      <ArrowDownIcon />
                    </Kbd>
                  </KbdGroup>
                  <span>{t("navigation:commandPalette.footer.navigate")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Kbd>
                    <CornerDownLeftIcon />
                  </Kbd>
                  <span>{t("navigation:commandPalette.footer.open")}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Kbd>Esc</Kbd>
                <span>{t("navigation:commandPalette.footer.close")}</span>
              </div>
            </CommandFooter>
          </Command>
        </CommandDialogPopup>
      </CommandDialog>

      <SearchCommandMenu open={isSearchOpen} setOpen={setIsSearchOpen} />
      <CreateTaskModal
        open={isCreateTaskOpen}
        projectId={projectIdFromRoute}
        onClose={() => setIsCreateTaskOpen(false)}
      />
      <CreateWorkspaceModal
        open={isCreateWorkspaceOpen}
        onClose={() => setIsCreateWorkspaceOpen(false)}
      />
      <CreateProjectModal
        open={isCreateProjectOpen}
        onClose={() => setIsCreateProjectOpen(false)}
      />
    </>
  );
}

export default CommandPalette;
