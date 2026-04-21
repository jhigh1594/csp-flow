import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type CreateCommentRequest = InferRequestType<
  (typeof client)["activity"]["comment"]["$post"]
>["json"];

async function createComment({ taskId, comment }: CreateCommentRequest) {
  const response = await client.activity.comment.$post({
    json: {
      taskId,
      comment,
    },
  });

  return unwrapResponse(response);
}

export default createComment;
