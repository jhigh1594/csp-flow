import updateTaskPriority from "@/fetchers/task/update-task-priority";
import type Task from "@/types/task";
import { useTaskFieldMutation } from "./use-task-field-mutation";

export function useUpdateTaskPriority() {
  return useTaskFieldMutation(
    (task: Task) => updateTaskPriority(task.id, task),
    (task) => ({ priority: task.priority }),
  );
}
