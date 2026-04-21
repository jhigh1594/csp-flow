import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

async function getGiteaIntegration(projectId: string) {
  const response = await client["gitea-integration"].project[":projectId"].$get(
    {
      param: { projectId },
    },
  );

  return unwrapResponse(response);
}

export default getGiteaIntegration;
