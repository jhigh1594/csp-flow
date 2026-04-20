import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";

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

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default getTeamIssues;
