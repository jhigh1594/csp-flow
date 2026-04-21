import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type DeleteDemandRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["teams"][":teamId"]["demands"][":demandId"]["$delete"]
>["param"];

async function deleteDemand({
  workspaceId,
  teamId,
  demandId,
}: DeleteDemandRequest) {
  const response = await client.program[":workspaceId"].teams[
    ":teamId"
  ].demands[":demandId"].$delete({
    param: { workspaceId, teamId, demandId },
  });

  return unwrapResponse(response);
}

export default deleteDemand;
