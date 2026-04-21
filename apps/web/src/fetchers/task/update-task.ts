import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";
import type Task from "@/types/task";

async function updateTask(taskId: string, task: Task) {
  const response = await client.task[":id"].$put({
    param: { id: taskId },
    json: {
      userId: task.userId || "",
      title: task.title,
      description: task.description || "",
      status: task.status,
      priority: (task.priority || "no-priority") as
        | "medium"
        | "low"
        | "no-priority"
        | "high"
        | "urgent",
      startDate: task.startDate?.toString(),
      dueDate: task.dueDate?.toString(),
      position: task.position ?? 0,
      projectId: task.projectId ?? null,
    },
  });

  return unwrapResponse(response);
}

export default updateTask;
