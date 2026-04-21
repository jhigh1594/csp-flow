import { getApiUrl, unwrapResponse } from "@/fetchers/get-api-url";

async function deleteDiscordIntegration(projectId: string) {
  const response = await fetch(
    getApiUrl(`/discord-integration/project/${projectId}`),
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

export default deleteDiscordIntegration;
