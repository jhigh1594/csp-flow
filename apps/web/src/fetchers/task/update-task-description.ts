import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";
import type Task from "@/types/task";

async function updateTaskDescription(taskId: string, task: Task) {
  const response = await client.task.description[":id"].$put({
    param: { id: taskId },
    json: {
      description: task.description || "",
    },
  });

  return unwrapResponse(response);
}

export default updateTaskDescription;
