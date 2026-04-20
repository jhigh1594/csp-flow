import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";

export type GetTeamColumnsRequest = InferRequestType<
  (typeof client)["teams"][":teamId"]["columns"]["$get"]
>["param"];

async function getTeamColumns({ teamId }: GetTeamColumnsRequest) {
  const response = await client.teams[":teamId"].columns.$get({
    param: { teamId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default getTeamColumns;
