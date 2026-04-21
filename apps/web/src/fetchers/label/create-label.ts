import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type CreateLabelRequest = InferRequestType<
  (typeof client)["label"]["$post"]
>["json"];

async function createLabel({
  name,
  color,
  taskId,
  workspaceId,
}: CreateLabelRequest) {
  const response = await client.label.$post({
    json: {
      name,
      color,
      taskId,
      workspaceId,
    },
  });

  return unwrapResponse(response);
}

export default createLabel;
