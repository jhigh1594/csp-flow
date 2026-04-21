import { client } from "@kaneo/libs";
import type { InferResponseType } from "hono";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type ListRepositoriesResponse = InferResponseType<
  (typeof client)["github-integration"]["repositories"]["$get"]
>;

async function listRepositories(): Promise<ListRepositoriesResponse> {
  const response = await client["github-integration"].repositories.$get();

  return unwrapResponse(response);
}

export default listRepositories;
