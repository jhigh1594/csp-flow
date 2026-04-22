import updateTaskStatus from "@/fetchers/task/update-task-status";
import type Task from "@/types/task";
import { useTaskFieldMutation } from "./use-task-field-mutation";

export function useUpdateTaskStatus() {
  return useTaskFieldMutation(
    (task: Task) => updateTaskStatus(task.id, task),
    (task) => ({ status: task.status }),
  );
}
