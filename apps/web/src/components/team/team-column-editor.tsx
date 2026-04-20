import { CheckCircle2, Circle, GripVertical, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import useCreateTeamColumn from "@/hooks/mutations/team/use-create-team-column";
import useDeleteTeamColumn from "@/hooks/mutations/team/use-delete-team-column";
import useReorderTeamColumns from "@/hooks/mutations/team/use-reorder-team-columns";
import useUpdateTeamColumn from "@/hooks/mutations/team/use-update-team-column";
import useGetTeamColumns from "@/hooks/queries/team/use-get-team-columns";
import { toast } from "@/lib/toast";

type TeamColumnEditorProps = {
  teamId: string;
};

export default function TeamColumnEditor({ teamId }: TeamColumnEditorProps) {
  const { t } = useTranslation();
  const { data: columns, isLoading } = useGetTeamColumns({ teamId });
  const { mutateAsync: createColumn } = useCreateTeamColumn(teamId);
  const { mutateAsync: updateColumn } = useUpdateTeamColumn(teamId);
  const { mutateAsync: deleteColumn } = useDeleteTeamColumn(teamId);
  const { mutateAsync: reorderColumns } = useReorderTeamColumns(teamId);
  const [newColumnName, setNewColumnName] = useState("");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const sorted = [...(columns ?? [])].sort((a, b) => a.position - b.position);

  const handleCreate = async () => {
    if (!newColumnName.trim()) return;
    try {
      await createColumn({ name: newColumnName.trim() });
      setNewColumnName("");
      toast.success(t("settings:columnEditor.toastCreated"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settings:columnEditor.toastCreateError"),
      );
    }
  };

  const handleRename = async (id: string, name: string, currentName: string) => {
    if (name === currentName) return;
    try {
      await updateColumn({ id, data: { name } });
      toast.success(t("settings:columnEditor.toastRenamed"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settings:columnEditor.toastRenameError"),
      );
    }
  };

  const handleToggleFinal = async (id: string, isFinal: boolean) => {
    try {
      await updateColumn({ id, data: { isFinal } });
      toast.success(
        isFinal
          ? t("settings:columnEditor.toastFinalOn")
          : t("settings:columnEditor.toastFinalOff"),
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settings:columnEditor.toastUpdateError"),
      );
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteColumn(id);
      toast.success(t("settings:columnEditor.toastDeleted"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settings:columnEditor.toastDeleteError"),
      );
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const reordered = [...sorted];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, removed);

    const updates = reordered.map((col, i) => ({ id: col.id, position: i }));
    reorderColumns(updates);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground">
        {t("settings:columnEditor.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        {sorted.map((col, index) => (
          // biome-ignore lint/a11y/useSemanticElements: false positive for role="listitem"
          <div
            key={col.id}
            role="listitem"
            draggable
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragEnd={handleDragEnd}
            className="flex items-center gap-2 p-2 border border-border rounded-md bg-card hover:bg-muted transition-colors"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab shrink-0" />
            <Input
              defaultValue={col.name}
              className="h-8 text-sm flex-1"
              onBlur={(e) => handleRename(col.id, e.target.value, col.name)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  e.currentTarget.blur();
                }
              }}
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <div
                className="flex items-center gap-2"
                title={t("settings:columnEditor.doneColumnTooltip")}
              >
                {col.isFinal ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {t("settings:columnEditor.doneColumn")}
                </span>
                <Switch
                  checked={col.isFinal}
                  onCheckedChange={(checked) =>
                    handleToggleFinal(col.id, checked)
                  }
                  aria-label={t("settings:columnEditor.markDoneAria", {
                    name: col.name,
                  })}
                  className="scale-75"
                />
                <span className="text-[11px] text-muted-foreground w-8">
                  {col.isFinal
                    ? t("settings:columnEditor.on")
                    : t("settings:columnEditor.off")}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(col.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <Input
          placeholder={t("settings:columnEditor.newColumnPlaceholder")}
          value={newColumnName}
          onChange={(e) => setNewColumnName(e.target.value)}
          className="h-8 text-sm flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleCreate();
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={handleCreate}
          disabled={!newColumnName.trim()}
          className="h-8 gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          {t("settings:columnEditor.add")}
        </Button>
      </div>
    </div>
  );
}
