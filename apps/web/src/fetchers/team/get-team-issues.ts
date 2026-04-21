import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type GetTeamIssuesRequest = InferRequestType<
  (typeof client)["teams"][":teamId"]["issues"]["$get"]
>["param"] & {
  cursor?: string;
  limit?: number;
};

async function getTeamIssues({ teamId, cursor, limit }: GetTeamIssuesRequest) {
  const response = await client.teams[":teamId"].issues.$get({
    param: { teamId },
    query: {
      cursor,
      limit: limit !== undefined ? String(limit) : undefined,
    },
  });

  return unwrapResponse(response);
}

export default getTeamIssues;
