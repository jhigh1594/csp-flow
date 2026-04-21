import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type GetSnapshotDiffRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["snapshots"]["diff"]["$get"]
>["param"] &
  InferRequestType<
    (typeof client)["program"][":workspaceId"]["snapshots"]["diff"]["$get"]
  >["query"];

async function getSnapshotDiff({
  workspaceId,
  from,
  to,
}: GetSnapshotDiffRequest) {
  const response = await client.program[":workspaceId"].snapshots.diff.$get({
    param: { workspaceId },
    query: { from, to },
  });

  return unwrapResponse(response);
}

export default getSnapshotDiff;
