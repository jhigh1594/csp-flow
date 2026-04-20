import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";

export type UpdateReleaseRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["teams"][":teamId"]["releases"][":releaseId"]["$patch"]
>["json"] &
  InferRequestType<
    (typeof client)["program"][":workspaceId"]["teams"][":teamId"]["releases"][":releaseId"]["$patch"]
  >["param"];

async function updateRelease({
  workspaceId,
  teamId,
  releaseId,
  name,
  quarter,
  month,
  fiscalYear,
  personas,
  description,
}: UpdateReleaseRequest) {
  const response = await client.program[":workspaceId"].teams[":teamId"].releases[":releaseId"].$patch({
    param: { workspaceId, teamId, releaseId },
    json: { name, quarter, month, fiscalYear, personas, description },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default updateRelease;
