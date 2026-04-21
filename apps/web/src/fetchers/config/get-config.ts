import { client } from "@kaneo/libs";
import type { InferResponseType } from "hono/client";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type GetConfigResponse = InferResponseType<
  (typeof client)["config"]["$get"]
>;

export async function getConfig() {
  const response = await client.config.$get();

  return unwrapResponse(response);
}
