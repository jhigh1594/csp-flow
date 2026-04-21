import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type CreateGithubIntegrationRequest = InferRequestType<
  (typeof client)["github-integration"]["project"][":projectId"]["$post"]
>["json"];

async function createGithubIntegration(
  projectId: string,
  data: CreateGithubIntegrationRequest,
) {
  const response = await client["github-integration"].project[
    ":projectId"
  ].$post({
    param: { projectId },
    json: data,
  });

  return unwrapResponse(response);
}

export default createGithubIntegration;
