import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type GetPublicProjectRequest = InferRequestType<
  (typeof client)["public-project"][":id"]["$get"]
>["param"];

async function getPublicProject({ id }: GetPublicProjectRequest) {
  const response = await client["public-project"][":id"].$get({
    param: { id },
  });

  return unwrapResponse(response);
}

export default getPublicProject;
