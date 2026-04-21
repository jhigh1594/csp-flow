import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type GetTeamStatusRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["teams"][":teamId"]["status"]["$get"]
>["param"];

async function getTeamStatus({ workspaceId, teamId }: GetTeamStatusRequest) {
  const response = await client.program[":workspaceId"].teams[
    ":teamId"
  ].status.$get({
    param: { workspaceId, teamId },
  });

  return unwrapResponse(response);
}

export default getTeamStatus;
