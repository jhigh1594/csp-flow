import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

async function getTaskRelations(taskId: string) {
  const response = await client["task-relation"][":taskId"].$get({
    param: { taskId },
  });

  return unwrapResponse(response);
}

export default getTaskRelations;
