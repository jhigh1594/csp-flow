import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";
import type Task from "@/types/task";

type UpdateTaskAssigneePayload = Pick<Task, "userId">;

async function updateTaskAssignee(
  taskId: string,
  task: UpdateTaskAssigneePayload,
) {
  const response = await client.task.assignee[":id"].$put({
    param: { id: taskId },
    json: {
      userId: task.userId || "",
    },
  });

  return unwrapResponse(response);
}

export default updateTaskAssignee;
