import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useCreateTeamColumn from "@/hooks/mutations/team/use-create-team-column";
import useDeleteTeamColumn from "@/hooks/mutations/team/use-delete-team-column";
import useReorderTeamColumns from "@/hooks/mutations/team/use-reorder-team-columns";
import useUpdateTeamColumn from "@/hooks/mutations/team/use-update-team-column";
import useGetTeamColumns from "@/hooks/queries/team/use-get-team-columns";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/workspace/$workspaceId/team/$teamId/settings",
)({
  component: TeamSettingsPage,
});

type Column = {
  id: string;
  name: string;
  position: number;
  isFinal: boolean;
  slug: string;
};

function WorkflowTab({ teamId }: { teamId: string }) {
  const { data: columns = [], isLoading } = useGetTeamColumns({ teamId });
  const { mutateAsync: createColumn, isPending: isCreating } =
    useCreateTeamColumn(teamId);
  const { mutateAsync: updateColumn } = useUpdateTeamColumn(teamId);
  const { mutateAsync: deleteColumn } = useDeleteTeamColumn(teamId);
  const { mutateAsync: reorderColumns } = useReorderTeamColumns(teamId);

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const editRef = useRef<HTMLInputElement>(null);

  const sorted = [...columns].sort((a, b) => a.position - b.position);

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    try {
      await createColumn({ name });
      setNewName("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add status");
    }
  }

  async function handleRename(col: Column) {
    const name = editingName.trim();
    if (!name || name === col.name) {
      setEditingId(null);
      return;
    }
    try {
      await updateColumn({ id: col.id, data: { name } });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to rename status",
      );
    } finally {
      setEditingId(null);
    }
  }

  async function handleToggleFinal(col: Column) {
    try {
      await updateColumn({ id: col.id, data: { isFinal: !col.isFinal } });
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update status",
      );
    }
  }

  async function handleDelete(col: Column) {
    if (sorted.length <= 1) {
      toast.error("A team must have at least one status.");
      return;
    }
    try {
      await deleteColumn(col.id);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete status",
      );
    }
  }

  async function handleMove(col: Column, direction: "up" | "down") {
    const idx = sorted.findIndex((c) => c.id === col.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;

    const updated = sorted.map((c, i) => {
      if (i === idx) return { id: c.id, position: sorted[swapIdx].position };
      if (i === swapIdx) return { id: c.id, position: sorted[idx].position };
      return { id: c.id, position: c.position };
    });

    try {
      await reorderColumns(updated);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reorder");
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-10 rounded-md bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          Statuses define the workflow steps for issues in this team. Changes
          apply immediately to all issues.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        {sorted.map((col, idx) => (
          <div
            key={col.id}
            className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
          >
            <button
              type="button"
              onClick={() => handleToggleFinal(col)}
              title={col.isFinal ? "Mark as non-final" : "Mark as final"}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              {col.isFinal ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <Circle className="h-4 w-4" />
              )}
            </button>

            {editingId === col.id ? (
              <input
                ref={(el) => {
                  editRef.current = el;
                  el?.focus();
                }}
                className="flex-1 bg-transparent text-sm outline-none border-b border-primary"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={() => handleRename(col)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRename(col);
                  if (e.key === "Escape") setEditingId(null);
                }}
              />
            ) : (
              <button
                type="button"
                className="flex-1 text-left text-sm hover:text-foreground text-foreground"
                onClick={() => {
                  setEditingId(col.id);
                  setEditingName(col.name);
                }}
              >
                {col.name}
              </button>
            )}

            {col.isFinal && (
              <span className="text-xs text-green-600 bg-green-50 dark:bg-green-950 dark:text-green-400 px-1.5 py-0.5 rounded font-medium shrink-0">
                Final
              </span>
            )}

            <div className="flex items-center gap-0.5 shrink-0">
              <button
                type="button"
                disabled={idx === 0}
                onClick={() => handleMove(col, "up")}
                className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={idx === sorted.length - 1}
                onClick={() => handleMove(col, "down")}
                className="rounded p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(col)}
                disabled={sorted.length <= 1}
                className="rounded p-1 text-muted-foreground hover:text-destructive disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          handleAdd();
        }}
      >
        <Input
          placeholder="New status name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="h-9"
        />
        <Button
          type="submit"
          size="sm"
          disabled={!newName.trim() || isCreating}
          className="h-9 gap-1.5 shrink-0"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </Button>
      </form>
    </div>
  );
}

function TeamSettingsPage() {
  const { workspaceId, teamId } = Route.useParams();

  return (
    <div className="flex flex-col gap-4 p-6 bg-background w-full h-full overflow-auto">
      <div className="flex flex-col gap-1">
        <Link
          to="/dashboard/workspace/$workspaceId/team/$teamId/issues"
          params={{ workspaceId, teamId }}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to issues
        </Link>
        <h1 className="text-2xl font-semibold">Team Settings</h1>
      </div>

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
          <WorkflowTab teamId={teamId} />
        </TabsContent>

        <TabsContent value="members">
          <div className="text-sm text-muted-foreground">
            Team member management coming soon.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
