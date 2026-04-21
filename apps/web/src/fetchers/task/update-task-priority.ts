import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";
import type Task from "@/types/task";

async function updateTaskPriority(taskId: string, task: Task) {
  const response = await client.task.priority[":id"].$put({
    param: { id: taskId },
    json: {
      priority: (task.priority || "no-priority") as
        | "medium"
        | "low"
        | "no-priority"
        | "high"
        | "urgent",
    },
  });

  return unwrapResponse(response);
}

export default updateTaskPriority;
