import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";

export type CreateRiskRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["teams"][":teamId"]["risks"]["$post"]
>["json"] &
  InferRequestType<
    (typeof client)["program"][":workspaceId"]["teams"][":teamId"]["risks"]["$post"]
  >["param"];

async function createRisk({
  workspaceId,
  teamId,
  description,
  impact,
  status,
  owner,
  dueDate,
}: CreateRiskRequest) {
  const response = await client.program[":workspaceId"].teams[":teamId"].risks.$post({
    param: { workspaceId, teamId },
    json: { description, impact, status, owner, dueDate },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default createRisk;
