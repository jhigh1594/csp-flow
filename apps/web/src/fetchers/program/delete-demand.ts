import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";

export type DeleteDemandRequest = InferRequestType<
  (typeof client)["program"][":workspaceId"]["teams"][":teamId"]["demands"][":demandId"]["$delete"]
>["param"];

async function deleteDemand({ workspaceId, teamId, demandId }: DeleteDemandRequest) {
  const response = await client.program[":workspaceId"].teams[":teamId"].demands[":demandId"].$delete({
    param: { workspaceId, teamId, demandId },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  return response.json();
}

export default deleteDemand;
