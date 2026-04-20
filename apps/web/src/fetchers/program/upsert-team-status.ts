import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";

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
  const response = await client.program[":workspaceId"].teams[":teamId"].status.$put({
    param: { workspaceId, teamId },
    json: { health, accomplishments, nextWeekFocus, leadershipAsks },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default upsertTeamStatus;
