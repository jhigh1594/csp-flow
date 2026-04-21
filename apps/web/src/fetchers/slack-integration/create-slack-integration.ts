import { getApiUrl, unwrapResponse } from "@/fetchers/get-api-url";
import type { SlackIntegration } from "./get-slack-integration";

export type CreateSlackIntegrationRequest = {
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

async function createSlackIntegration(
  projectId: string,
  json: CreateSlackIntegrationRequest,
) {
  const response = await fetch(
    getApiUrl(`/slack-integration/project/${projectId}`),
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(json),
    },
  );

  return unwrapResponse<SlackIntegration>(response);
}

export default createSlackIntegration;
