import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type GetProgramTeamsRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["teams"]["$get"]
>["param"];

async function getProgramTeams({ workspaceId }: GetProgramTeamsRequest) {
  const response = await client.program[":workspaceId"].teams.$get({
    param: { workspaceId },
  });

  return unwrapResponse(response);
}

export default getProgramTeams;
