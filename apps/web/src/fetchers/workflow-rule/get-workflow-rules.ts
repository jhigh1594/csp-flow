import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

async function getWorkflowRules(projectId: string) {
  const response = await client["workflow-rule"][":projectId"].$get({
    param: { projectId },
  });

  return unwrapResponse(response);
}

export default getWorkflowRules;
