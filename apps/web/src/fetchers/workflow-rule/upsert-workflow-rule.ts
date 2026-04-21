import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

async function upsertWorkflowRule(
  projectId: string,
  data: { integrationType: string; eventType: string; columnId: string },
) {
  const response = await client["workflow-rule"][":projectId"].$put({
    param: { projectId },
    json: data,
  });

  return unwrapResponse(response);
}

export default upsertWorkflowRule;
