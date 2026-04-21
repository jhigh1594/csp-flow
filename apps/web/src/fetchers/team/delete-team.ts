import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type DeleteTeamRequest = InferRequestType<
  (typeof client)["teams"][":teamId"]["$delete"]
>["param"];

async function deleteTeam({ teamId }: DeleteTeamRequest) {
  const response = await client.teams[":teamId"].$delete({
    param: { teamId },
  });

  return unwrapResponse(response);
}

export default deleteTeam;
