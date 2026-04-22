import { client } from "@kaneo/libs";
import { unwrapResponse } from "@/fetchers/get-api-url";

export type SemanticSearchParams = {
  q: string;
  workspaceId?: string;
  projectId?: string;
  limit?: number;
};

async function semanticSearch(params: SemanticSearchParams) {
  const response = await client.search.semantic.$get({
    query: {
      ...params,
      limit: params.limit?.toString(),
    },
  });

  return unwrapResponse(response);
}

export default semanticSearch;
