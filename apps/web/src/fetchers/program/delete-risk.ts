import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type DeleteRiskRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["teams"][":teamId"]["risks"][":riskId"]["$delete"]
>["param"];

async function deleteRisk({ workspaceId, teamId, riskId }: DeleteRiskRequest) {
  const response = await client.program[":workspaceId"].teams[":teamId"].risks[
    ":riskId"
  ].$delete({
    param: { workspaceId, teamId, riskId },
  });

  return unwrapResponse(response);
}

export default deleteRisk;
