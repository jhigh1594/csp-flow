import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type CreateProjectRequest = InferRequestType<
  (typeof client)["project"]["$post"]
>["json"];

async function createProject({
  name,
  slug,
  workspaceId,
  teamId,
  icon,
}: CreateProjectRequest) {
  const response = await client.project.$post({
    json: { name, slug, icon, workspaceId, teamId },
  });

  return unwrapResponse(response);
}

export default createProject;
