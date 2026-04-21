import { getApiUrl, unwrapResponse } from "@/fetchers/get-api-url";

async function deleteTelegramIntegration(projectId: string) {
  const response = await fetch(
    getApiUrl(`/telegram-integration/project/${projectId}`),
    {
      method: "DELETE",
      credentials: "include",
    },
  );

  return unwrapResponse<{ success: boolean }>(response);
}

export default deleteTelegramIntegration;
