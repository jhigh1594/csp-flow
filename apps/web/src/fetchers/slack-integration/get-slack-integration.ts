import { getApiUrl, unwrapResponse } from "@/fetchers/get-api-url";

export type SlackIntegration = {
  id: string;
  projectId: string;
  channelName: string | null;
  webhookConfigured: boolean;
  maskedWebhookUrl: string;
  events: {
    taskCreated: boolean;
    taskStatusChanged: boolean;
    taskPriorityChanged: boolean;
    taskTitleChanged: boolean;
    taskDescriptionChanged: boolean;
    taskCommentCreated: boolean;
  };
  isActive: boolean | null;
  createdAt: string;
  updatedAt: string;
} | null;

async function getSlackIntegration(projectId: string) {
  const response = await fetch(
    getApiUrl(`/slack-integration/project/${projectId}`),
    {
      credentials: "include",
    },
  );

  return unwrapResponse<SlackIntegration>(response);
}

export default getSlackIntegration;
