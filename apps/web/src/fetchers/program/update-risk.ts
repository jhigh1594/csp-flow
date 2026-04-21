import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type UpdateRiskRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["teams"][":teamId"]["risks"][":riskId"]["$patch"]
>["json"] &
  InferRequestType<
    (typeof client)["program"][":workspaceId"]["teams"][":teamId"]["risks"][":riskId"]["$patch"]
  >["param"];

async function updateRisk({
  workspaceId,
  teamId,
  riskId,
  description,
  impact,
  status,
  owner,
  dueDate,
}: UpdateRiskRequest) {
  const response = await client.program[":workspaceId"].teams[":teamId"].risks[
    ":riskId"
  ].$patch({
    param: { workspaceId, teamId, riskId },
    json: { description, impact, status, owner, dueDate },
  });

  return unwrapResponse(response);
}

export default updateRisk;
