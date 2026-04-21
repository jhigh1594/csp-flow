import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type CreateReleaseRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["teams"][":teamId"]["releases"]["$post"]
>["json"] &
  InferRequestType<
    (typeof client)["program"][":workspaceId"]["teams"][":teamId"]["releases"]["$post"]
  >["param"];

async function createRelease({
  workspaceId,
  teamId,
  name,
  quarter,
  month,
  fiscalYear,
  personas,
  description,
}: CreateReleaseRequest) {
  const response = await client.program[":workspaceId"].teams[
    ":teamId"
  ].releases.$post({
    param: { workspaceId, teamId },
    json: { name, quarter, month, fiscalYear, personas, description },
  });

  return unwrapResponse(response);
}

export default createRelease;
