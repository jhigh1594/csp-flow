import { useQuery } from "@tanstack/react-query";
import type { SemanticSearchParams } from "@/fetchers/search/semantic-search";
import semanticSearch from "@/fetchers/search/semantic-search";

function useSemanticSearch(params: SemanticSearchParams) {
  return useQuery({
    queryKey: ["semantic-search", params],
    queryFn: () => semanticSearch(params),
    enabled: !!params.q && params.q.length >= 3,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export default useSemanticSearch;
