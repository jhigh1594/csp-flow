import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

async function deleteGiteaIntegration(projectId: string) {
  const response = await client["gitea-integration"].project[
    ":projectId"
  ].$delete({
    param: { projectId },
  });

  return unwrapResponse(response);
}

export default deleteGiteaIntegration;
