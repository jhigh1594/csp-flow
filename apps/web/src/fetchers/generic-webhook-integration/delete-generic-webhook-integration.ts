import { getApiUrl, unwrapResponse } from "@/fetchers/get-api-url";

async function deleteGenericWebhookIntegration(projectId: string) {
  const response = await fetch(
    getApiUrl(`/generic-webhook-integration/project/${projectId}`),
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

export default deleteGenericWebhookIntegration;
