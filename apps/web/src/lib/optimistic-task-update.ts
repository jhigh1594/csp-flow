import type { ProjectWithTasks } from "@/types/project";
import type Task from "@/types/task";

export function applyTaskPatch(
  project: ProjectWithTasks | undefined,
  taskId: string,
  patch: Partial<Task>,
): ProjectWithTasks | undefined {
  if (!project) return undefined;
  const apply = (task: Task): Task =>
    task.id === taskId ? { ...task, ...patch } : task;
  return {
    ...project,
    columns: project.columns.map((col) => ({
      ...col,
      tasks: col.tasks.map(apply),
    })),
    plannedTasks: project.plannedTasks.map(apply),
    archivedTasks: project.archivedTasks.map(apply),
  };
}
