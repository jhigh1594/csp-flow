import { getApiUrl, unwrapResponse } from "@/fetchers/get-api-url";

export type GenericWebhookIntegration = {
  id: string;
  projectId: string;
  webhookConfigured: boolean;
  maskedWebhookUrl: string | null;
  secretConfigured: boolean;
  maskedSecret: string | null;
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
};

async function getGenericWebhookIntegration(
  projectId: string,
): Promise<GenericWebhookIntegration | null> {
  const response = await fetch(
    getApiUrl(`/generic-webhook-integration/project/${projectId}`),
    {
      credentials: "include",
    },
  );

  return unwrapResponse<GenericWebhookIntegration | null>(response);
}

export default getGenericWebhookIntegration;
