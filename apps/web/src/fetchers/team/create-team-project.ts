import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type CreateTeamProjectRequest = InferRequestType<
  (typeof client)["teams"][":teamId"]["projects"]["$post"]
>["json"] &
  InferRequestType<
    (typeof client)["teams"][":teamId"]["projects"]["$post"]
  >["param"];

async function createTeamProject({
  teamId,
  name,
  description,
  slug,
  icon,
}: CreateTeamProjectRequest) {
  const response = await client.teams[":teamId"].projects.$post({
    param: { teamId },
    json: { name, description, slug, icon },
  });

  return unwrapResponse(response);
}

export default createTeamProject;
