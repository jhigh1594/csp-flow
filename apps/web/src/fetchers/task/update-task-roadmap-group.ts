import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";
import type Task from "@/types/task";

async function updateTaskRoadmapGroup(taskId: string, task: Task) {
  const response = await client.task["roadmap-group"][":id"].$put({
    param: { id: taskId },
    json: {
      roadmapGroup: (task.roadmapGroup ?? null) as
        | "next"
        | "later"
        | "now"
        | null,
    },
  });

  return unwrapResponse(response);
}

export default updateTaskRoadmapGroup;
