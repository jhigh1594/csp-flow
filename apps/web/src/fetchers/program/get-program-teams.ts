import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";

export type GetProgramTeamsRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["teams"]["$get"]
>["param"];

async function getProgramTeams({ workspaceId }: GetProgramTeamsRequest) {
  const response = await client.program[":workspaceId"].teams.$get({
    param: { workspaceId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default getProgramTeams;
