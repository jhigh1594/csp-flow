import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";
import type Task from "@/types/task";

type UpdateTaskStatusPayload = Pick<Task, "status">;

async function updateTaskStatus(taskId: string, task: UpdateTaskStatusPayload) {
  const response = await client.task.status[":id"].$put({
    param: { id: taskId },
    json: {
      status: task.status || "",
    },
  });

  return unwrapResponse(response);
}

export default updateTaskStatus;
