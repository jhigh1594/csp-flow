import { client } from "@kaneo/libs";
import type { InferResponseType } from "hono";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type GitHubAppInfo = InferResponseType<
  (typeof client)["github-integration"]["app-info"]["$get"]
>;

export default async function getGitHubAppInfo(): Promise<GitHubAppInfo> {
  const response = await client["github-integration"]["app-info"].$get();

  return unwrapResponse(response);
}
