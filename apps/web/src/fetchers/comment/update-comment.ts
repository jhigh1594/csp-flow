import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type UpdateCommentRequest = InferRequestType<
  (typeof client)["activity"]["comment"]["$put"]
>["json"];

async function updateComment({ activityId, comment }: UpdateCommentRequest) {
  const response = await client.activity.comment.$put({
    json: {
      activityId,
      comment,
    },
  });

  return unwrapResponse(response);
}

export default updateComment;
