import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type UpdateProjectRequest = InferRequestType<
  (typeof client)["project"][":id"]["$put"]
>["json"] &
  InferRequestType<(typeof client)["project"][":id"]["$put"]>["param"];

async function updateProject({
  id,
  name,
  icon,
  slug,
  description,
  isPublic,
}: UpdateProjectRequest) {
  const response = await client.project[":id"].$put({
    param: { id },
    json: { name, icon, slug, description, isPublic },
  });

  return unwrapResponse(response);
}

export default updateProject;
