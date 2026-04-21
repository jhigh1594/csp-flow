import { getApiUrl, unwrapResponse } from "@/fetchers/get-api-url";
import type { NotificationPreferences } from "./get-notification-preferences";

async function deleteNotificationWorkspaceRule(
  workspaceId: string,
): Promise<NotificationPreferences> {
  const response = await fetch(
    getApiUrl(`/notification-preferences/workspaces/${workspaceId}`),
    {
      credentials: "include",
      method: "DELETE",
    },
  );

  return unwrapResponse<NotificationPreferences>(response);
}

export default deleteNotificationWorkspaceRule;
