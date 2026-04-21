import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type GetProjectsRequest = InferRequestType<
  (typeof client)["project"]["$get"]
>["query"];

async function getProjects({ workspaceId }: GetProjectsRequest) {
  if (!workspaceId) return;

  const response = await client.project.$get({ query: { workspaceId } });

  return unwrapResponse(response);
}

export default getProjects;
