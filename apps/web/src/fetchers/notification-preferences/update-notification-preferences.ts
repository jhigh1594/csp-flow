import { getApiUrl, unwrapResponse } from "@/fetchers/get-api-url";
import type { NotificationPreferences } from "./get-notification-preferences";

export type UpdateNotificationPreferencesRequest = {
  emailEnabled?: boolean;
  ntfyEnabled?: boolean;
  ntfyServerUrl?: string | null;
  ntfyTopic?: string | null;
  ntfyToken?: string | null;
  gotifyEnabled?: boolean;
  gotifyServerUrl?: string | null;
  gotifyToken?: string | null;
  webhookEnabled?: boolean;
  webhookUrl?: string | null;
  webhookSecret?: string | null;
};

async function updateNotificationPreferences(
  json: UpdateNotificationPreferencesRequest,
): Promise<NotificationPreferences> {
  const response = await fetch(getApiUrl("/notification-preferences"), {
    body: JSON.stringify(json),
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    method: "PUT",
  });

  return unwrapResponse<NotificationPreferences>(response);
}

export default updateNotificationPreferences;
