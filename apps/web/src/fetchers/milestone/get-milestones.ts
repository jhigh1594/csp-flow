import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

async function getMilestones(projectId: string) {
  const response = await client.milestone.project[":projectId"].$get({
    param: { projectId },
  });

  return unwrapResponse(response);
}

export default getMilestones;
