import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type DeleteReleaseRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["teams"][":teamId"]["releases"][":releaseId"]["$delete"]
>["param"];

async function deleteRelease({
  workspaceId,
  teamId,
  releaseId,
}: DeleteReleaseRequest) {
  const response = await client.program[":workspaceId"].teams[
    ":teamId"
  ].releases[":releaseId"].$delete({
    param: { workspaceId, teamId, releaseId },
  });

  return unwrapResponse(response);
}

export default deleteRelease;
