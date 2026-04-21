import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

async function importGiteaIssues(projectId: string) {
  const response = await client["gitea-integration"]["import-issues"].$post({
    json: { projectId },
  });

  return unwrapResponse(response);
}

export default importGiteaIssues;
