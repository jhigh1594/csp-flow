import { getApiUrl, unwrapResponse } from "@/fetchers/get-api-url";

async function deleteSlackIntegration(projectId: string) {
  const response = await fetch(
    getApiUrl(`/slack-integration/project/${projectId}`),
    {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  return unwrapResponse(response);
}

export default deleteSlackIntegration;
