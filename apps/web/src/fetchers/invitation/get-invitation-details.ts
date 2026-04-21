import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type InvitationDetails = {
  id: string;
  email: string;
  workspaceName: string;
  inviterName: string;
  expiresAt: string;
  status: string;
  expired: boolean;
};

export type GetInvitationDetailsResponse = {
  valid: boolean;
  invitation?: InvitationDetails;
  error?: string;
};

export async function getInvitationDetails(
  invitationId: string,
): Promise<GetInvitationDetailsResponse> {
  const response = await client.invitation.public[":id"].$get({
    param: {
      id: invitationId,
    },
  });

  return unwrapResponse(response);
}
