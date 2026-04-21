import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";
import type Task from "@/types/task";

async function updateTaskDueDate(taskId: string, task: Task) {
  const response = await client.task["due-date"][":id"].$put({
    param: { id: taskId },
    json: {
      dueDate: task.dueDate || "",
    },
  });

  return unwrapResponse(response);
}

export default updateTaskDueDate;
