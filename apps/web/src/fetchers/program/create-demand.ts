import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type CreateDemandRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["teams"][":teamId"]["demands"]["$post"]
>["json"] &
  InferRequestType<
    (typeof client)["program"][":workspaceId"]["teams"][":teamId"]["demands"]["$post"]
  >["param"];

async function createDemand({
  workspaceId,
  teamId,
  name,
  businessPartnershipDate,
  discoveryDate,
  requirementsDate,
  demandSubmissionDate,
  developmentDate,
  uatDate,
  goLiveDate,
  adoptionDate,
}: CreateDemandRequest) {
  const response = await client.program[":workspaceId"].teams[
    ":teamId"
  ].demands.$post({
    param: { workspaceId, teamId },
    json: {
      name,
      businessPartnershipDate,
      discoveryDate,
      requirementsDate,
      demandSubmissionDate,
      developmentDate,
      uatDate,
      goLiveDate,
      adoptionDate,
    },
  });

  return unwrapResponse(response);
}

export default createDemand;
