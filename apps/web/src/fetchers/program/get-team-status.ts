import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";

export type GetTeamStatusRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["teams"][":teamId"]["status"]["$get"]
>["param"];

async function getTeamStatus({ workspaceId, teamId }: GetTeamStatusRequest) {
  const response = await client.program[":workspaceId"].teams[":teamId"].status.$get({
    param: { workspaceId, teamId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default getTeamStatus;
