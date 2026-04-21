import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type GetSnapshotWeeksRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["snapshots"]["$get"]
>["param"];

async function getSnapshotWeeks({ workspaceId }: GetSnapshotWeeksRequest) {
  const response = await client.program[":workspaceId"].snapshots.$get({
    param: { workspaceId },
  });

  return unwrapResponse(response);
}

export default getSnapshotWeeks;
