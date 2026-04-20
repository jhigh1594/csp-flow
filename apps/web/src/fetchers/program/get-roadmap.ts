import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";

export type GetRoadmapRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["roadmap"]["$get"]
>["param"];

async function getRoadmap({ workspaceId }: GetRoadmapRequest) {
  const response = await client.program[":workspaceId"].roadmap.$get({
    param: { workspaceId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default getRoadmap;
