import { getApiUrl, unwrapResponse } from "@/fetchers/get-api-url";
import type { DiscordIntegration } from "./get-discord-integration";

export type UpdateDiscordIntegrationRequest = {
  webhookUrl?: string;
  channelName?: string | null;
  isActive?: boolean;
  events?: {
    taskCreated?: boolean;
    taskStatusChanged?: boolean;
    taskPriorityChanged?: boolean;
    taskTitleChanged?: boolean;
    taskDescriptionChanged?: boolean;
    taskCommentCreated?: boolean;
  };
};

async function updateDiscordIntegration(
  projectId: string,
  json: UpdateDiscordIntegrationRequest,
) {
  const response = await fetch(
    getApiUrl(`/discord-integration/project/${projectId}`),
    {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(json),
    },
  );

  return unwrapResponse<DiscordIntegration>(response);
}

export default updateDiscordIntegration;
