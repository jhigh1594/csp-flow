import { useQuery } from "@tanstack/react-query";
import type { SearchParams } from "@/fetchers/search/global-search";
import globalSearch from "@/fetchers/search/global-search";

function useGlobalSearch(params: SearchParams) {
  return useQuery({
    queryKey: ["search", params],
    queryFn: () => globalSearch(params),
    enabled: !!params.q && params.q.length >= 1,
    staleTime: 1000 * 30, // 30 seconds
  });
}

export default useGlobalSearch;
