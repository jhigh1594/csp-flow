import { applyTaskPatch } from "@/lib/optimistic-task-update";
import useProjectStore from "@/store/project";
import type Task from "@/types/task";

type SSEEventData = {
  taskId?: string;
  projectId?: string;
  [key: string]: unknown;
};

function isTaskFieldEvent(eventType: string): boolean {
  return (
    eventType.startsWith("task.") &&
    !eventType.endsWith(".created") &&
    eventType !== "task.moved"
  );
}

function extractTaskPatch(
  eventType: string,
  data: SSEEventData,
): Partial<Task> | null {
  const patch: Partial<Task> = {};

  if (eventType === "task.status_changed" && data.status != null) {
    patch.status = data.status as string;
  } else if (eventType === "task.priority_changed" && data.priority != null) {
    patch.priority = data.priority as string;
  } else if (eventType === "task.title_changed" && data.title != null) {
    patch.title = data.title as string;
  } else if (
    eventType === "task.description_changed" &&
    data.description !== undefined
  ) {
    patch.description = data.description as string;
  } else if (
    eventType === "task.assignee_changed" &&
    data.userId !== undefined
  ) {
    patch.userId = data.userId as string | null;
    patch.assigneeId = (data.assigneeId as string) ?? null;
    patch.assigneeName = (data.assigneeName as string) ?? null;
  } else if (eventType === "task.unassigned") {
    patch.userId = null;
    patch.assigneeId = null;
    patch.assigneeName = null;
  } else if (
    eventType === "task.due_date_changed" &&
    data.dueDate !== undefined
  ) {
    patch.dueDate = data.dueDate as string | null;
  } else if (
    eventType === "task.roadmap_group_changed" &&
    data.roadmapGroup !== undefined
  ) {
    patch.roadmapGroup = data.roadmapGroup as string | null;
  } else {
    return null;
  }

  return patch;
}

export function applySSEEventToStore(
  eventType: string,
  data: SSEEventData,
): void {
  const store = useProjectStore.getState();
  const project = store.project;
  if (!project || !data.taskId) return;

  if (isTaskFieldEvent(eventType)) {
    const patch = extractTaskPatch(eventType, data);
    if (patch) {
      store.setProject(applyTaskPatch(project, data.taskId, patch));
    }
  } else if (eventType === "task.created" && data.task) {
    const task = data.task as Task;
    const targetColumn = project.columns.find(
      (col) => col.id === task.columnId,
    );
    if (targetColumn) {
      store.setProject({
        ...project,
        columns: project.columns.map((col) =>
          col.id === targetColumn.id
            ? { ...col, tasks: [...col.tasks, task] }
            : col,
        ),
      });
    } else {
      store.setProject({
        ...project,
        plannedTasks: [...project.plannedTasks, task],
      });
    }
  } else if (eventType === "task.moved" && data.task) {
    // Task moved between columns — remove from all columns, add to target
    const task = data.task as Task;
    const targetColumn = project.columns.find(
      (col) => col.id === task.columnId,
    );

    let updated = {
      ...project,
      columns: project.columns.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => t.id !== task.id),
      })),
    };

    if (targetColumn) {
      updated = {
        ...updated,
        columns: updated.columns.map((col) =>
          col.id === targetColumn.id
            ? { ...col, tasks: [...col.tasks, task] }
            : col,
        ),
      };
    }
    store.setProject(updated);
  }
}
