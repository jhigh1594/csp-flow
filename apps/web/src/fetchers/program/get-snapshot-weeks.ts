import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";

export type GetSnapshotWeeksRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["snapshots"]["$get"]
>["param"];

async function getSnapshotWeeks({ workspaceId }: GetSnapshotWeeksRequest) {
  const response = await client.program[":workspaceId"].snapshots.$get({
    param: { workspaceId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default getSnapshotWeeks;
