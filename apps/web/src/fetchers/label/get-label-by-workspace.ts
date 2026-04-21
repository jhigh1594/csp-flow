import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type GetLabelsByTaskRequest = InferRequestType<
  (typeof client)["label"]["workspace"][":workspaceId"]["$get"]
>["param"];

async function getLabelsByTask({ workspaceId }: GetLabelsByTaskRequest) {
  const response = await client.label.workspace[":workspaceId"].$get({
    param: {
      workspaceId,
    },
  });

  return unwrapResponse(response);
}

export default getLabelsByTask;
