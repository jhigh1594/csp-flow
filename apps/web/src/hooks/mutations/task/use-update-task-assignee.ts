import updateTaskAssignee from "@/fetchers/task/update-task-assignee";
import type Task from "@/types/task";
import { useTaskFieldMutation } from "./use-task-field-mutation";

export function useUpdateTaskAssignee() {
  return useTaskFieldMutation(
    (task: Task) => updateTaskAssignee(task.id, task),
    (task) => ({
      userId: task.userId,
      assigneeId: task.assigneeId,
      assigneeName: task.assigneeName,
      assigneeImage: task.assigneeImage,
    }),
  );
}
