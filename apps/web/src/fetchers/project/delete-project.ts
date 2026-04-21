import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type DeleteProjectRequest = InferRequestType<
  (typeof client)["project"][":id"]["$delete"]
>["param"];

async function deleteProject({ id }: DeleteProjectRequest) {
  const response = await client.project[":id"].$delete({ param: { id } });

  return unwrapResponse(response);
}

export default deleteProject;
