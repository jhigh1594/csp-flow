import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type GetRoadmapRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["roadmap"]["$get"]
>["param"];

async function getRoadmap({ workspaceId }: GetRoadmapRequest) {
  const response = await client.program[":workspaceId"].roadmap.$get({
    param: { workspaceId },
  });

  return unwrapResponse(response);
}

export default getRoadmap;
