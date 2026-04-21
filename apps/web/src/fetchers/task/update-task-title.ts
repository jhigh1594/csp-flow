import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";
import type Task from "@/types/task";

async function updateTaskTitle(taskId: string, task: Task) {
  const response = await client.task.title[":id"].$put({
    param: { id: taskId },
    json: {
      title: task.title || "",
    },
  });

  return unwrapResponse(response);
}

export default updateTaskTitle;
