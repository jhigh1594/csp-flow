import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

async function deleteGithubIntegration(projectId: string) {
  const response = await client["github-integration"].project[
    ":projectId"
  ].$delete({
    param: { projectId },
  });

  return unwrapResponse(response);
}

export default deleteGithubIntegration;
