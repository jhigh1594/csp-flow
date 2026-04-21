import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type GetProjectRequest = InferRequestType<
  (typeof client)["project"][":id"]["$get"]
>["param"];

async function getProject({ id }: GetProjectRequest) {
  const response = await client.project[":id"].$get({
    param: { id },
  });

  return unwrapResponse(response);
}

export default getProject;
