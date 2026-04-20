import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";

export type GetSnapshotDiffRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["snapshots"]["diff"]["$get"]
>["param"] &
  InferRequestType<
    (typeof client)["program"][":workspaceId"]["snapshots"]["diff"]["$get"]
  >["query"];

async function getSnapshotDiff({ workspaceId, from, to }: GetSnapshotDiffRequest) {
  const response = await client.program[":workspaceId"].snapshots.diff.$get({
    param: { workspaceId },
    query: { from, to },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default getSnapshotDiff;
