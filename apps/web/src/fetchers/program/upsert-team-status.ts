import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type UpsertTeamStatusRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["teams"][":teamId"]["status"]["$put"]
>["json"] &
  InferRequestType<
    (typeof client)["program"][":workspaceId"]["teams"][":teamId"]["status"]["$put"]
  >["param"];

async function upsertTeamStatus({
  workspaceId,
  teamId,
  health,
  accomplishments,
  nextWeekFocus,
  leadershipAsks,
}: UpsertTeamStatusRequest) {
  const response = await client.program[":workspaceId"].teams[
    ":teamId"
  ].status.$put({
    param: { workspaceId, teamId },
    json: { health, accomplishments, nextWeekFocus, leadershipAsks },
  });

  return unwrapResponse(response);
}

export default upsertTeamStatus;
