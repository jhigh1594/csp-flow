import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type GetLabelsByTaskRequest = InferRequestType<
  (typeof client)["label"]["task"][":taskId"]["$get"]
>["param"];

async function getLabelsByTask({ taskId }: GetLabelsByTaskRequest) {
  const response = await client.label.task[":taskId"].$get({
    param: {
      taskId,
    },
  });

  return unwrapResponse(response);
}

export default getLabelsByTask;
