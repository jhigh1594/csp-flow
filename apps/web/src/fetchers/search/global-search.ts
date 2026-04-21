import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type SearchParams = {
  q: string;
  type?:
    | "all"
    | "tasks"
    | "projects"
    | "workspaces"
    | "comments"
    | "activities";
  workspaceId?: string;
  projectId?: string;
  limit?: number;
};

async function globalSearch(params: SearchParams) {
  const queryParams = {
    ...params,
    limit: params.limit?.toString(),
  };

  const response = await client.search.$get({
    query: queryParams,
  });

  return unwrapResponse(response);
}

export default globalSearch;
