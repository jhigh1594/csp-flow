import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import ColumnEditor from "@/components/project/column-editor";
import {
  DangerZoneSection,
  SettingsLayout,
} from "@/components/settings-layout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useDeleteTeam from "@/hooks/mutations/team/use-delete-team";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/team/$teamId/settings",
)({
  component: TeamSettingsPage,
});

function TeamSettingsPage() {
  const { workspaceId, teamId } = Route.useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const teamPath = `/dashboard/workspace/${workspaceId}/team/${teamId}/issues`;
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { mutateAsync: deleteTeam, isPending: isDeleting } =
    useDeleteTeam(workspaceId);

  async function handleDeleteTeam() {
    try {
      await deleteTeam({ teamId });
      setDeleteDialogOpen(false);
      navigate({
        to: "/dashboard/workspace/$workspaceId/issues",
        params: { workspaceId },
      });
    } catch {
      toast.error("Failed to delete team");
    }
  }

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

      <DangerZoneSection
        title="Danger Zone"
        description="Irreversible actions that affect this team and all its data."
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Delete this team</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently deletes the team, all its issues, projects, and
              columns.
            </p>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete team
          </Button>
        </div>
      </DangerZoneSection>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Delete team?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground px-6 pb-6">
            This will permanently delete the team and all associated issues,
            projects, and columns. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteTeam}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete team"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SettingsLayout>
  );
}
