import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";
import type { WorkspaceUserInvitation } from "@/types/workspace-user";

export async function getPendingInvitations(): Promise<
  WorkspaceUserInvitation[]
> {
  const response = await client.invitation.pending.$get();

  return unwrapResponse(response);
}
