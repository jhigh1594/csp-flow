import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";

export type DeleteRiskRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["teams"][":teamId"]["risks"][":riskId"]["$delete"]
>["param"];

async function deleteRisk({ workspaceId, teamId, riskId }: DeleteRiskRequest) {
  const response = await client.program[":workspaceId"].teams[":teamId"].risks[":riskId"].$delete({
    param: { workspaceId, teamId, riskId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default deleteRisk;
