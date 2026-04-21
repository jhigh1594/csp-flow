import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type GetTeamProjectsRequest = InferRequestType<
  (typeof client)["teams"][":teamId"]["projects"]["$get"]
>["param"];

async function getTeamProjects({ teamId }: GetTeamProjectsRequest) {
  const response = await client.teams[":teamId"].projects.$get({
    param: { teamId },
  });

  return unwrapResponse(response);
}

export default getTeamProjects;
