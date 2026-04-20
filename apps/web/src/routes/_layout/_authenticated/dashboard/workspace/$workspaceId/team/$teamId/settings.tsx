import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import ColumnEditor from "@/components/project/column-editor";
import { SettingsLayout } from "@/components/settings-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/team/$teamId/settings",
)({
  component: TeamSettingsPage,
});

function TeamSettingsPage() {
  const { workspaceId, teamId } = Route.useParams();
  const { t } = useTranslation();
  const teamPath = `/dashboard/workspace/${workspaceId}/team/${teamId}/issues`;

  return (
    <SettingsLayout
      title="Settings"
      parentLabel="Team"
      parentPath={teamPath}
      backPath={teamPath}
      backLabel="Back to Team"
    >
      <Tabs defaultValue="workflow" className="w-full">
        <TabsList className="bg-muted gap-2 mb-4">
          <TabsTrigger
            value="workflow"
            className="[&[data-state=active]]:border [&[data-state=active]]:border-border [&[data-state=active]]:rounded-md [&[data-state=active]]:bg-card"
          >
            Workflow
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="[&[data-state=active]]:border [&[data-state=active]]:border-border [&[data-state=active]]:rounded-md [&[data-state=active]]:bg-card"
          >
            Members
          </TabsTrigger>
        </TabsList>

        <TabsContent value="workflow">
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-md font-medium">
                {t("settings:projectWorkflow.columnsTitle")}
              </h2>
              <p className="text-xs text-muted-foreground">
                {t("settings:projectWorkflow.columnsDescription")}
              </p>
            </div>
            <ColumnEditor teamId={teamId} />
          </div>
        </TabsContent>

        <TabsContent value="members">
          <div className="text-sm text-muted-foreground">
            Team member management coming soon.
          </div>
        </TabsContent>
      </Tabs>
    </SettingsLayout>
  );
}
