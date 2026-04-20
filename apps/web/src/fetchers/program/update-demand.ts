import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";

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
  const response = await client.program[":workspaceId"].teams[":teamId"].demands[":demandId"].$patch({
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

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default updateDemand;
