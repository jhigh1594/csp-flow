import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";

export type GetTeamProjectsRequest = InferRequestType<
  (typeof client)["teams"][":teamId"]["projects"]["$get"]
>["param"];

async function getTeamProjects({ teamId }: GetTeamProjectsRequest) {
  const response = await client.teams[":teamId"].projects.$get({
    param: { teamId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default getTeamProjects;
