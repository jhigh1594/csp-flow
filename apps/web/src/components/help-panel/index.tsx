import {
  BarChart3,
  BookOpen,
  Brain,
  FolderKanban,
  LayoutGrid,
  Users,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KbdSequence } from "@/components/ui/kbd";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetPanel,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { shortcuts } from "@/constants/shortcuts";

type ShortcutItem = {
  keys: string[];
  description: string;
};

type ShortcutCategory = {
  title: string;
  shortcuts: ShortcutItem[];
};

function useShortcutCategories(): ShortcutCategory[] {
  const { t } = useTranslation();

  return useMemo(
    () => [
      {
        title: t("navigation:keyboardShortcuts.categories.general"),
        shortcuts: [
          {
            keys: [shortcuts.palette.prefix, shortcuts.palette.open],
            description: t(
              "navigation:keyboardShortcuts.items.openCommandPalette",
            ),
          },
          {
            keys: [shortcuts.search.prefix],
            description: t("navigation:keyboardShortcuts.items.globalSearch"),
          },
          {
            keys: [shortcuts.sidebar.prefix, shortcuts.sidebar.toggle],
            description: t("navigation:keyboardShortcuts.items.toggleSidebar"),
          },
          {
            keys: ["?"],
            description: t("navigation:keyboardShortcuts.items.showShortcuts"),
          },
          {
            keys: ["Escape"],
            description: t("navigation:keyboardShortcuts.items.closeModal"),
          },
        ],
      },
      {
        title: t("navigation:keyboardShortcuts.categories.create"),
        shortcuts: [
          {
            keys: [shortcuts.create.key],
            description: t("navigation:keyboardShortcuts.items.createTask"),
          },
          {
            keys: [shortcuts.new.prefix, shortcuts.new.project],
            description: t("navigation:keyboardShortcuts.items.createProject"),
          },
        ],
      },
      {
        title: t("navigation:keyboardShortcuts.categories.navigation"),
        shortcuts: [
          {
            keys: ["j"],
            description: t("navigation:keyboardShortcuts.items.nextTask"),
          },
          {
            keys: ["k"],
            description: t("navigation:keyboardShortcuts.items.prevTask"),
          },
          {
            keys: [shortcuts.go.prefix, shortcuts.go.home],
            description: t("navigation:keyboardShortcuts.items.goHome"),
          },
          {
            keys: [shortcuts.go.prefix, shortcuts.go.settings],
            description: t("navigation:keyboardShortcuts.items.goSettings"),
          },
        ],
      },
    ],
    [t],
  );
}

type FeatureItem = {
  icon: React.ReactNode;
  title: string;
  description: string;
};

function useFeatureItems(): FeatureItem[] {
  return useMemo(
    () => [
      {
        icon: <LayoutGrid className="w-4 h-4" />,
        title: "Kanban Board",
        description:
          "Organize tasks visually with drag-and-drop columns. Customize workflows to match your process.",
      },
      {
        icon: <BarChart3 className="w-4 h-4" />,
        title: "Gantt Chart",
        description:
          "Plan timelines with a visual timeline view. Track start dates, due dates, and dependencies.",
      },
      {
        icon: <BookOpen className="w-4 h-4" />,
        title: "Wiki",
        description:
          "Document knowledge, processes, and decisions in a built-in wiki for your team.",
      },
      {
        icon: <Brain className="w-4 h-4" />,
        title: "MCP / AI Integration",
        description:
          "Connect AI agents via the Model Context Protocol for intelligent task management and automation.",
      },
      {
        icon: <Users className="w-4 h-4" />,
        title: "Teams",
        description:
          "Organize projects under teams, manage members, and control access across your workspace.",
      },
      {
        icon: <FolderKanban className="w-4 h-4" />,
        title: "Integrations",
        description:
          "Connect with GitHub, Gitea, Slack, Discord, Telegram, and custom webhooks.",
      },
    ],
    [],
  );
}

export function HelpPanel() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const shortcutCategories = useShortcutCategories();
  const featureItems = useFeatureItems();

  const filteredCategories = shortcutCategories
    .map((category) => ({
      ...category,
      shortcuts: category.shortcuts.filter(
        (shortcut) =>
          shortcut.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          shortcut.keys.some((key) =>
            key.toLowerCase().includes(searchQuery.toLowerCase()),
          ),
      ),
    }))
    .filter((category) => category.shortcuts.length > 0);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-sidebar-foreground/60 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
          />
        }
      >
        <span className="text-sm font-semibold">?</span>
      </SheetTrigger>
      <SheetContent side="right" showCloseButton>
        <SheetHeader>
          <SheetTitle>Help & Shortcuts</SheetTitle>
          <SheetDescription>
            Quick reference for keyboard shortcuts and features
          </SheetDescription>
        </SheetHeader>
        <SheetPanel>
          <div className="space-y-6">
            <div>
              <Input
                placeholder={t(
                  "navigation:keyboardShortcuts.searchPlaceholder",
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-4"
              />
              <div className="space-y-4">
                {filteredCategories.map((category) => (
                  <div key={category.title}>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {category.title}
                    </h3>
                    <div className="space-y-1">
                      {category.shortcuts.map((shortcut) => (
                        <div
                          key={`${category.title}-${shortcut.description}-${shortcut.keys.join("+")}`}
                          className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50"
                        >
                          <span className="text-xs">
                            {shortcut.description}
                          </span>
                          <KbdSequence keys={shortcut.keys} />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Features
              </h3>
              <div className="space-y-3">
                {featureItems.map((feature) => (
                  <div key={feature.title} className="flex gap-3">
                    <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
                      {feature.icon}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{feature.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Links
              </h3>
              <div className="space-y-2">
                <a
                  href="https://github.com/jonhigh/csp-flow"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Documentation
                </a>
                <a
                  href="https://github.com/jonhigh/csp-flow/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Report an Issue
                </a>
                <a
                  href="https://github.com/jonhigh/csp-flow"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  GitHub Repository
                </a>
              </div>
            </div>
          </div>
        </SheetPanel>
      </SheetContent>
    </Sheet>
  );
}
