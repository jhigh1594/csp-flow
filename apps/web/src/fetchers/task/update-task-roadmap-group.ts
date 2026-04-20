import { client } from "@kaneo/libs";
import type Task from "@/types/task";

async function updateTaskRoadmapGroup(taskId: string, task: Task) {
  const response = await client.task["roadmap-group"][":id"].$put({
    param: { id: taskId },
    json: {
      roadmapGroup: (task.roadmapGroup ?? null) as "next" | "later" | "now" | null,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();

  return data;
}

export default updateTaskRoadmapGroup;
