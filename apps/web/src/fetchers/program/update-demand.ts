import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type UpdateDemandRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["teams"][":teamId"]["demands"][":demandId"]["$patch"]
>["json"] &
  InferRequestType<
    (typeof client)["program"][":workspaceId"]["teams"][":teamId"]["demands"][":demandId"]["$patch"]
  >["param"];

async function updateDemand({
  workspaceId,
  teamId,
  demandId,
  name,
  businessPartnershipDate,
  discoveryDate,
  requirementsDate,
  demandSubmissionDate,
  developmentDate,
  uatDate,
  goLiveDate,
  adoptionDate,
}: UpdateDemandRequest) {
  const response = await client.program[":workspaceId"].teams[
    ":teamId"
  ].demands[":demandId"].$patch({
    param: { workspaceId, teamId, demandId },
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

export default updateDemand;
