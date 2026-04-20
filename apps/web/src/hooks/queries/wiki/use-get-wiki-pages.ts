import { useQuery } from "@tanstack/react-query";
import getWikiPages from "@/fetchers/wiki/get-wiki-pages";

export function useGetWikiPages(projectId: string) {
  return useQuery({
    queryKey: ["wiki-pages", projectId],
    queryFn: () => getWikiPages(projectId),
    staleTime: 30_000,
    refetchInterval: 30_000,
    enabled: !!projectId,
  });
}
