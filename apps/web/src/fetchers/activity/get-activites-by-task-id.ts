import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type GetActivitesByTaskIdRequest = InferRequestType<
  (typeof client)["activity"][":taskId"]["$get"]
>["param"];

async function getActivitesByTaskId({ taskId }: GetActivitesByTaskIdRequest) {
  const response = await client.activity[":taskId"].$get({
    param: { taskId },
  });

  return unwrapResponse(response);
}

export default getActivitesByTaskId;
