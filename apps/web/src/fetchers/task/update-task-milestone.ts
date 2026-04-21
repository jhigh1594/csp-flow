import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

async function updateTaskMilestone(taskId: string, milestoneId: string | null) {
  const response = await client.task.milestone[":id"].$put({
    param: { id: taskId },
    json: { milestoneId },
  });

  return unwrapResponse(response);
}

export default updateTaskMilestone;
