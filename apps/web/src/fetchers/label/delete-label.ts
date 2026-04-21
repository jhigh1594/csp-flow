import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type DeleteLabelRequest = InferRequestType<
  (typeof client)["label"][":id"]["$delete"]
>["param"];

async function deleteLabel({ id }: DeleteLabelRequest) {
  const response = await client.label[":id"].$delete({
    param: { id },
  });

  return unwrapResponse(response);
}

export default deleteLabel;
