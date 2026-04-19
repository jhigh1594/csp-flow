import { useQuery } from "@tanstack/react-query";
import getWikiPages from "@/fetchers/wiki/get-wiki-pages";

export function useGetWikiPages(projectId: string) {
  return useQuery({
    queryKey: ["wiki-pages", projectId],
    queryFn: () => getWikiPages(projectId),
    refetchInterval: 30000,
    enabled: !!projectId,
  });
}
