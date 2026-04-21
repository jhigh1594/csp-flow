import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

async function getGithubIntegration(projectId: string) {
  const response = await client["github-integration"].project[
    ":projectId"
  ].$get({
    param: { projectId },
  });

  return unwrapResponse(response);
}

export default getGithubIntegration;
