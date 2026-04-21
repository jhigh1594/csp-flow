import { getApiUrl, unwrapResponse } from "@/fetchers/get-api-url";
import type { DiscordIntegration } from "./get-discord-integration";

export type CreateDiscordIntegrationRequest = {
  webhookUrl: string;
  channelName?: string;
  events?: {
    taskCreated?: boolean;
    taskStatusChanged?: boolean;
    taskPriorityChanged?: boolean;
    taskTitleChanged?: boolean;
    taskDescriptionChanged?: boolean;
    taskCommentCreated?: boolean;
  };
};

async function createDiscordIntegration(
  projectId: string,
  json: CreateDiscordIntegrationRequest,
) {
  const response = await fetch(
    getApiUrl(`/discord-integration/project/${projectId}`),
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(json),
    },
  );

  return unwrapResponse<DiscordIntegration>(response);
}

export default createDiscordIntegration;
