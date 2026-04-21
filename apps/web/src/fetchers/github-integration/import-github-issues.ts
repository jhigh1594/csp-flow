import { client } from "@kaneo/libs";
import type { InferRequestType } from "hono";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type ImportGithubIssuesRequest = InferRequestType<
  (typeof client)["github-integration"]["import-issues"]["$post"]
>["json"];

async function importGithubIssues(data: ImportGithubIssuesRequest) {
  const response = await client["github-integration"]["import-issues"].$post({
    json: data,
  });

  return unwrapResponse(response);
}

export default importGithubIssues;
